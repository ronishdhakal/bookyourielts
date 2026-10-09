"use client";

import { ProviderLogo } from "../provider-logo";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ApiError, authApi, bookingApi, candidateApi } from "@/lib/api";
import { FORMAT_LABELS, formatDate, formatLong, formatNpr } from "@/lib/format";
import { portalHref, siteHref } from "@/lib/portal";
import type { Booking, SavedCandidate, TestSession } from "@/lib/types";
import { useLoader } from "@/lib/use-loader";
import { useAuth } from "../auth-provider";
import { SeatChip } from "../seat-chip";
import { FormError } from "../text-field";
import {
  EMPTY_PERSON,
  PersonFields,
  appendPerson,
  personFromCandidate,
  personFromUser,
  validatePerson,
  type PersonErrors,
  type PersonForm,
} from "./person";
import { usePortalData } from "./portal-data";

type Who = "self" | "new" | number;

/** Slide-over for booking one date: who is taking the test, their details, then review and confirm. */
export function BookingDrawer({
  sessionId,
  onClose,
}: {
  sessionId: number | null;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const open = sessionId !== null;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="drawer-title"
      className="m-0 ml-auto h-dvh max-h-none w-full max-w-[36rem] rounded-none bg-white p-0 shadow-2xl backdrop:bg-black/50"
    >
      {open && <DrawerBody key={sessionId} sessionId={sessionId} onClose={onClose} />}
    </dialog>
  );
}

function DrawerBody({ sessionId, onClose }: { sessionId: number; onClose: () => void }) {
  const { user } = useAuth();
  const { reload } = usePortalData();
  const sessionLoad = useLoader(`session|${sessionId}`, () => bookingApi.session(sessionId));
  const candLoad = useLoader("candidates", () => candidateApi.list());
  const session = sessionLoad.data;
  const candidates = candLoad.data;

  const [who, setWho] = useState<Who>("self");
  const [person, setPerson] = useState<PersonForm | null>(null);
  const [errors, setErrors] = useState<PersonErrors>({});
  const [confirmed, setConfirmed] = useState(false);
  const [confirmErr, setConfirmErr] = useState<string | null>(null);
  const [save, setSave] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [step, setStep] = useState<"details" | "review">("details");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);

  if (!user) return null;
  const form = person ?? personFromUser(user);
  const chosen = typeof who === "number" ? candidates?.find((c) => c.id === who) : undefined;

  function pick(next: Who) {
    setWho(next);
    setErrors({});
    setPerson(
      next === "self" && user
        ? personFromUser(user)
        : next === "new"
          ? { ...EMPTY_PERSON }
          : (() => {
              const c = candidates?.find((x) => x.id === next);
              return c ? personFromCandidate(c) : { ...EMPTY_PERSON };
            })(),
    );
  }

  function review() {
    const e = validatePerson(form, {
      requirePassport: true,
      savedPassport: typeof who === "number" && !!chosen?.has_passport,
    });
    setErrors(e);
    setConfirmErr(confirmed ? null : "Please confirm that the details match the passport.");
    if (Object.keys(e).length || !confirmed) return;
    setStep("review");
  }

  async function submit() {
    if (!session) return;
    if (!agreed) {
      setError("Please agree to the terms and privacy policy to continue.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const body = new FormData();
      body.set("session", String(session.id));
      body.set("examinee", who === "self" ? "self" : "other");
      appendPerson(body, form, "booking");
      if (typeof who === "number") body.set("candidate", String(who));
      if (who === "new" && save) body.set("save_candidate", "true");
      const b = await bookingApi.create(body);
      setBooking(b);
      if (who === "self" && !user?.date_of_birth)
        authApi.updateMe({ date_of_birth: form.dob }).catch(() => undefined);
      reload();
    } catch (e) {
      if (e instanceof ApiError && Object.keys(e.fields).length && !e.fields.detail) {
        const first = Object.entries(e.fields)[0];
        setError(`${first?.[0].replace(/_/g, " ")}: ${first?.[1][0]}`);
      } else
        setError(e instanceof ApiError ? e.message : "Something went wrong. Please try again.");
    }
    setBusy(false);
  }

  return (
    <div className="flex h-dvh flex-col">
      <header className="border-mist flex items-start justify-between gap-4 border-b px-6 py-4">
        <div>
          <h2 id="drawer-title" className="text-xl font-bold">
            {booking
              ? "Booking confirmed"
              : step === "review"
                ? "Review and confirm"
                : "Book this date"}
          </h2>
          <p className="text-muted text-[0.875rem]">
            {booking ? booking.reference : `Step ${step === "review" ? 2 : 1} of 2`}
          </p>
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="-mt-1 -mr-2 flex h-10 w-10 items-center justify-center rounded-full text-2xl hover:bg-black/5"
        >
          ×
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {sessionLoad.error ? (
          <FormError message="We could not load this date. It may have just filled up. Close this panel and pick another." />
        ) : !session ? (
          <div className="space-y-3" role="status" aria-label="Loading">
            <div className="skeleton-light h-28 rounded-lg" />
            <div className="skeleton-light h-64 rounded-lg" />
          </div>
        ) : booking ? (
          <Done booking={booking} onClose={onClose} />
        ) : (
          <>
            <SessionSummary s={session} />
            {!session.is_bookable ? (
              <div
                role="alert"
                className="border-crimson mt-5 rounded-lg border-l-4 bg-[#f7f8fa] px-4 py-3"
              >
                {session.seat_status === "full"
                  ? "This date is full."
                  : "Registration for this date has closed."}{" "}
                Close this panel and choose another date, or{" "}
                <a href={siteHref("/inquire")} className="text-crimson underline">
                  send an inquiry
                </a>
                .
              </div>
            ) : step === "details" ? (
              <div className="mt-6 space-y-6">
                <fieldset>
                  <legend className="section-title mb-3">Who is taking the test?</legend>
                  <div role="radiogroup" className="space-y-2">
                    <WhoOption
                      checked={who === "self"}
                      onSelect={() => pick("self")}
                      title="Myself"
                      sub={user.full_name}
                    />
                    {candidates?.map((c) => (
                      <WhoOption
                        key={c.id}
                        checked={who === c.id}
                        onSelect={() => pick(c.id)}
                        title={c.full_name}
                        sub={c.relation || "Saved candidate"}
                      />
                    ))}
                    <WhoOption
                      checked={who === "new"}
                      onSelect={() => pick("new")}
                      title="Someone new"
                      sub="Add a child, sibling or client"
                    />
                  </div>
                </fieldset>

                <PersonFields
                  value={form}
                  onChange={(p) => {
                    setPerson(p);
                    setErrors({});
                  }}
                  errors={errors}
                  saved={chosen ? chosen.has_passport : undefined}
                  passportRequired
                  idPrefix="bk"
                  showRelation={who === "new"}
                />

                {who === "new" && (
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      className="accent-crimson mt-1 h-5 w-5"
                      checked={save}
                      onChange={(e) => setSave(e.target.checked)}
                    />
                    <span>
                      <span className="block font-medium">Save to my candidates</span>
                      <span className="text-muted block text-[0.8125rem]">
                        Next time you can pick this person in one tap.
                      </span>
                    </span>
                  </label>
                )}

                <div>
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      className="accent-crimson mt-1 h-5 w-5 shrink-0"
                      checked={confirmed}
                      onChange={(e) => {
                        setConfirmed(e.target.checked);
                        setConfirmErr(null);
                      }}
                    />
                    <span>
                      I confirm these details match the passport the candidate will use on test day.
                    </span>
                  </label>
                  {confirmErr && (
                    <p className="field-error" role="alert">
                      {confirmErr}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <Review
                session={session}
                person={form}
                who={who}
                agreed={agreed}
                onAgree={setAgreed}
                error={error}
              />
            )}
          </>
        )}
      </div>

      {!booking && session?.is_bookable && (
        <footer className="border-mist flex items-center justify-between gap-3 border-t bg-white px-6 py-4">
          {step === "details" ? (
            <>
              <button type="button" className="btn btn-outline" onClick={onClose}>
                Cancel
              </button>
              <button type="button" className="btn btn-dark min-w-40" onClick={review}>
                Review
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setStep("details")}
                disabled={busy}
              >
                Back
              </button>
              <button type="button" className="btn btn-primary" onClick={submit} disabled={busy}>
                {busy ? "Confirming…" : "Confirm booking"}
              </button>
            </>
          )}
        </footer>
      )}
    </div>
  );
}

function WhoOption({
  checked,
  onSelect,
  title,
  sub,
}: {
  checked: boolean;
  onSelect: () => void;
  title: string;
  sub: string;
}) {
  return (
    <label className="choice flex cursor-pointer items-center gap-3 !py-3" data-selected={checked}>
      <input
        type="radio"
        name="who"
        className="accent-crimson h-5 w-5"
        checked={checked}
        onChange={onSelect}
      />
      <span className="min-w-0">
        <span className="block truncate font-semibold">{title}</span>
        <span className="text-muted block truncate text-[0.8125rem]">{sub}</span>
      </span>
    </label>
  );
}

function SessionSummary({ s }: { s: TestSession }) {
  return (
    <section className="rounded-lg bg-[#f7f8fa] p-4" aria-label="Selected date">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 font-bold">
            <ProviderLogo provider={s.provider} label={s.provider_label} height={28} />
            <span>{s.test_type.name}</span>
          </p>
          <p className="text-muted text-[0.875rem]">
            {s.city.name} · {FORMAT_LABELS[s.format]}
          </p>
        </div>
        <SeatChip
          status={s.seat_status}
          label={s.seat_status === "few_left" ? `${s.seats_left} left` : undefined}
        />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-[0.9375rem]">
        <div>
          <dt className="text-muted text-[0.8125rem]">Test day</dt>
          <dd className="font-semibold">{formatDate(s.date, { weekday: "short" })}</dd>
        </div>
        <div>
          <dt className="text-muted text-[0.8125rem]">Session and venue</dt>
          <dd className="font-semibold">Confirmed after booking</dd>
        </div>
        <div>
          <dt className="text-muted text-[0.8125rem]">Fee</dt>
          <dd className="font-semibold">{formatNpr(s.fee_npr)}</dd>
        </div>
        <div>
          <dt className="text-muted text-[0.8125rem]">Register by</dt>
          <dd className="font-semibold">
            {formatDate(s.registration_closes_on, { year: undefined })}
          </dd>
        </div>
      </dl>
    </section>
  );
}

function Review({
  session,
  person,
  who,
  agreed,
  onAgree,
  error,
}: {
  session: TestSession;
  person: PersonForm;
  who: Who;
  agreed: boolean;
  onAgree: (v: boolean) => void;
  error: string | null;
}) {
  const row = (k: string, v: string) => (
    <div className="grid grid-cols-[8rem_1fr] gap-3 py-2">
      <dt className="text-muted text-[0.9375rem]">{k}</dt>
      <dd className="font-semibold break-words">
        {v || <span className="text-muted font-normal">Not provided</span>}
      </dd>
    </div>
  );
  return (
    <div>
      <SessionSummary s={session} />
      <h3 className="section-title mt-6 mb-1">Candidate</h3>
      <dl className="divide-mist divide-y">
        {row("Taking the test", who === "self" ? "Myself" : "Someone else")}
        {row("Full name", person.name)}
        {row("Mobile", person.phone)}
        {row("Email", person.email)}
        {row("Date of birth", person.dob ? formatLong(person.dob) : "")}
        {row(
          "Address",
          [person.municipality, person.district, person.province].filter(Boolean).join(", "),
        )}
        {row(
          "Passport",
          person.passport
            ? "Attached"
            : typeof who === "number"
              ? "Saved passport"
              : "Not attached",
        )}
      </dl>

      <div className="border-crimson mt-6 rounded-lg border-l-4 bg-[#f7f8fa] px-4 py-3">
        <p className="font-semibold">What happens when you confirm</p>
        <ol className="text-muted mt-1 list-decimal space-y-1 pl-5 text-[0.9375rem]">
          <li>We save your booking request and give it a reference number.</li>
          <li>
            You can message our team on WhatsApp for a quicker response. Your details are filled in
            for you.
          </li>
          <li>Our team confirms the seat and explains payment. Nothing is paid on this website.</li>
        </ol>
      </div>
      <label className="mt-5 flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          className="accent-crimson mt-1 h-5 w-5 shrink-0"
          checked={agreed}
          onChange={(e) => onAgree(e.target.checked)}
        />
        <span>
          I agree to the{" "}
          <a
            href={siteHref("/terms")}
            target="_blank"
            rel="noopener noreferrer"
            className="text-crimson underline"
          >
            terms
          </a>{" "}
          and{" "}
          <a
            href={siteHref("/privacy")}
            target="_blank"
            rel="noopener noreferrer"
            className="text-crimson underline"
          >
            privacy policy
          </a>
          .
        </span>
      </label>
      <div className="mt-4">
        <FormError message={error} />
      </div>
    </div>
  );
}

function Done({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  return (
    <div role="status">
      <p className="text-2xl font-bold">Your booking request is confirmed</p>
      <p className="text-muted mt-2">
        Reference <strong className="text-ink font-mono">{booking.reference}</strong>. For a quicker
        response, message our team on WhatsApp. Your details are filled in, so you only need to
        press send.
      </p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <a
          href={booking.whatsapp_url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary"
        >
          Message us on WhatsApp
        </a>
        <Link
          href={portalHref(`/bookings/${booking.id}`)}
          className="btn btn-outline"
          onClick={onClose}
        >
          View this request
        </Link>
      </div>
      <h3 className="mt-8 font-bold">What happens next</h3>
      <ol className="text-muted mt-2 list-decimal space-y-1.5 pl-5">
        <li>Our team replies in the chat and confirms your seat.</li>
        <li>They explain payment and send your confirmation.</li>
        <li>You get your Speaking time closer to the test, within about a week of the test day.</li>
      </ol>
      <p className="text-muted mt-4 text-[0.9375rem]">
        Your seat is not confirmed until our team confirms it.
      </p>
      <button
        type="button"
        className="text-crimson mt-6 font-semibold underline underline-offset-4"
        onClick={onClose}
      >
        Book another date
      </button>
    </div>
  );
}

export type { SavedCandidate };
