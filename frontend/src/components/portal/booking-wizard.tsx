"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ApiError, authApi, bookingApi, catalogApi } from "@/lib/api";
import { FORMAT_LABELS, formatNpr } from "@/lib/format";
import { portalHref } from "@/lib/portal";
import type { Booking, TestSession, TestType, User } from "@/lib/types";
import { useAuth } from "../auth-provider";
import { FormError } from "../text-field";
import { Stepper, STEPS, SummaryTicket } from "./wizard-parts";
import {
  DateStep,
  DetailsStep,
  PrefsStep,
  ProviderStep,
  ReviewStep,
  validateDetails,
  type DetailErrors,
} from "./wizard-steps";
import {
  EMPTY_DETAILS,
  EMPTY_PREFS,
  PROVIDERS,
  type DetailsForm,
  type Prefs,
} from "./wizard-types";

function detailsFromUser(user: User, base: DetailsForm = EMPTY_DETAILS): DetailsForm {
  return {
    ...base,
    examinee: "self",
    name: user.full_name,
    phone: user.phone,
    email: user.email,
    dob: user.date_of_birth ?? "",
  };
}

/** Loads the preselected date (if any) before the wizard mounts so its initial state is complete. */
export function BookingWizardLoader({ sessionId }: { sessionId?: string }) {
  const { user } = useAuth();
  const [pre, setPre] = useState<{ id: string | undefined; session: TestSession | null } | null>(
    null,
  );
  const [types, setTypes] = useState<TestType[] | null>(null);

  useEffect(() => {
    let off = false;
    catalogApi.testTypes().then(
      (t) => !off && setTypes(t),
      () => !off && setTypes([]),
    );
    if (sessionId && /^\d+$/.test(sessionId)) {
      bookingApi.session(sessionId).then(
        (s) => !off && setPre({ id: sessionId, session: s }),
        () => !off && setPre({ id: sessionId, session: null }),
      );
    }
    return () => {
      off = true;
    };
  }, [sessionId]);

  const waiting =
    !user || !types || (sessionId && /^\d+$/.test(sessionId) ? pre?.id !== sessionId : false);
  if (waiting) {
    return (
      <div
        role="status"
        aria-label="Loading booking steps"
        className="grid gap-8 lg:grid-cols-[15rem_1fr_21rem]"
      >
        <div className="skeleton-light hidden h-80 rounded-lg lg:block" />
        <div className="skeleton-light h-96 rounded-lg" />
        <div className="skeleton-light hidden h-96 rounded-lg lg:block" />
      </div>
    );
  }
  return (
    <BookingWizard
      user={user}
      types={types}
      preselected={pre?.session ?? null}
      preselectFailed={!!sessionId && !pre?.session}
    />
  );
}

function BookingWizard({
  user,
  types,
  preselected,
  preselectFailed,
}: {
  user: User;
  types: TestType[];
  preselected: TestSession | null;
  preselectFailed: boolean;
}) {
  const usable = preselected && preselected.is_bookable ? preselected : null;
  const [prefs, setPrefs] = useState<Prefs>(
    usable
      ? {
          provider: usable.provider,
          category: usable.test_type.is_ukvi ? "ukvi" : "regular",
          testType: usable.test_type.code,
          format: usable.format,
          city: usable.city.slug,
        }
      : EMPTY_PREFS,
  );
  const [session, setSession] = useState<TestSession | null>(usable);
  const [details, setDetails] = useState<DetailsForm>(() => detailsFromUser(user));
  const [errors, setErrors] = useState<DetailErrors>({});
  const [step, setStep] = useState(usable ? 3 : 0);
  const [furthest, setFurthest] = useState(usable ? 3 : 0);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [blocked, setBlocked] = useState(false);
  const top = useRef<HTMLDivElement>(null);

  const typeName = types.find((t) => t.code === prefs.testType)?.name;
  const providerLabel = PROVIDERS.find((p) => p.code === prefs.provider)?.label;

  function go(to: number) {
    setStep(to);
    setError(null);
    setFurthest((f) => Math.max(f, to));
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /** Changing an earlier choice clears everything chosen after it. */
  function updatePrefs(next: Prefs) {
    const changed = (Object.keys(next) as (keyof Prefs)[]).some((k) => next[k] !== prefs[k]);
    setPrefs(next);
    if (changed) {
      setSession(null);
      setFurthest(step);
    }
  }

  function updateDetails(next: DetailsForm) {
    if (next.examinee !== details.examinee) {
      next =
        next.examinee === "self"
          ? { ...detailsFromUser(user, next), examinee: "self" }
          : { ...next, name: "", phone: "", email: "", dob: "" };
    }
    setDetails(next);
    if (Object.keys(errors).length) setErrors({});
  }

  const canContinue =
    (step === 0 && !!prefs.provider) ||
    (step === 1 && !!prefs.provider && !!prefs.testType && !!prefs.format && !!prefs.city) ||
    (step === 2 && !!session) ||
    step === 3;

  function next() {
    if (step === 3) {
      const e = validateDetails(details);
      setErrors(e);
      if (Object.keys(e).length) {
        document.getElementById("main")?.scrollIntoView({ behavior: "smooth" });
        return;
      }
    }
    go(step + 1);
  }

  async function confirm() {
    if (!session) return;
    if (!agreed) {
      setError("Please agree to the terms and privacy policy to continue.");
      return;
    }
    setError(null);
    setBusy(true);
    // The tab is opened inside the click handler so phones do not block it; it is pointed at the chat afterwards.
    const tab = window.open("", "_blank");
    if (tab) tab.opener = null;
    try {
      const form = new FormData();
      form.set("session", String(session.id));
      form.set("examinee", details.examinee);
      form.set("candidate_name", details.name.trim());
      form.set("candidate_phone", details.phone);
      if (details.email.trim()) form.set("candidate_email", details.email.trim());
      form.set("date_of_birth", details.dob);
      form.set("province", details.province);
      form.set("district", details.district);
      form.set("municipality", details.municipality.trim());
      if (details.passportFront) form.set("passport_front", details.passportFront);
      if (details.passportBack) form.set("passport_back", details.passportBack);
      const b = await bookingApi.create(form);
      setBooking(b);
      if (details.examinee === "self" && !user.date_of_birth) {
        authApi.updateMe({ date_of_birth: details.dob }).catch(() => undefined);
      }
      if (tab) tab.location.href = b.whatsapp_url;
      else setBlocked(true);
    } catch (e) {
      tab?.close();
      if (e instanceof ApiError && Object.keys(e.fields).length && !e.fields.detail) {
        const first = Object.entries(e.fields)[0];
        setError(`${first?.[0].replace(/_/g, " ")}: ${first?.[1][0]}`);
      } else
        setError(e instanceof ApiError ? e.message : "Something went wrong. Please try again.");
    }
    setBusy(false);
  }

  if (booking) {
    return (
      <div className="mx-auto max-w-2xl space-y-6" role="status">
        <div className="panel panel-pad border-ok !border-2">
          <p className="eyebrow">Booking request {booking.reference}</p>
          <h2 className="mt-1 text-3xl font-bold">One last step: send the message to our team</h2>
          <p className="text-muted mt-3">
            {blocked
              ? "Your browser did not open WhatsApp automatically. Tap the button to open it."
              : "WhatsApp has opened in a new tab with your details ready to send. Press send there so our team can confirm your seat."}
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <a
              href={booking.whatsapp_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              {blocked ? "Open WhatsApp" : "Continue on WhatsApp"}
            </a>
            <Link href={portalHref(`/bookings/${booking.id}`)} className="btn btn-outline">
              View this request
            </Link>
          </div>
        </div>
        <div className="panel panel-pad">
          <h3 className="font-display text-xl font-bold">What happens next</h3>
          <ol className="text-muted mt-2 list-decimal space-y-1.5 pl-5">
            <li>Our team replies in the chat and confirms your seat.</li>
            <li>They explain payment and send your confirmation.</li>
            <li>
              You get your Speaking time closer to the test, within about a week of the test day.
            </li>
          </ol>
          <p className="text-muted mt-4 text-[0.9375rem]">
            Your seat is not confirmed until our team confirms it. You can follow this request any
            time under{" "}
            <Link href={portalHref("/bookings")} className="text-crimson underline">
              My bookings
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }

  const summary = {
    providerLabel,
    typeName,
    category: prefs.category === "ukvi" ? "UKVI" : "Regular",
    format: prefs.format,
    cityName: session?.city.name,
    session,
    candidate: step >= 3 ? details.name : undefined,
  };

  return (
    <div ref={top} className="grid scroll-mt-24 gap-8 lg:grid-cols-[14rem_minmax(0,1fr)_21rem]">
      <aside aria-label="Progress" className="lg:sticky lg:top-24 lg:self-start">
        <Stepper current={step} furthest={furthest} onGo={go} />
      </aside>

      <div className="min-w-0">
        {preselectFailed && (
          <div
            role="alert"
            className="border-marigold bg-white-ish mb-6 rounded-lg border-l-4 px-4 py-3"
          >
            That date is no longer open for booking. Pick another one below.
          </div>
        )}

        <details className="panel mb-6 lg:hidden">
          <summary className="flex min-h-12 cursor-pointer items-center justify-between px-4 font-semibold">
            <span>Booking summary</span>
            <span className="font-mono text-sm">
              {session ? formatNpr(session.fee_npr) : "NPR --"}
            </span>
          </summary>
          <div className="p-3">
            <SummaryTicket data={summary} />
          </div>
        </details>

        <div className="panel panel-pad">
          {step === 0 && (
            <ProviderStep
              value={prefs.provider}
              onChange={(provider) => updatePrefs({ ...EMPTY_PREFS, provider })}
            />
          )}
          {step === 1 && <PrefsStep prefs={prefs} onChange={updatePrefs} types={types} />}
          {step === 2 && <DateStep prefs={prefs} session={session} onPick={setSession} />}
          {step === 3 && <DetailsStep value={details} onChange={updateDetails} errors={errors} />}
          {step === 4 && session && (
            <ReviewStep
              prefs={prefs}
              session={session}
              details={details}
              providerLabel={providerLabel ?? ""}
              typeName={typeName ?? ""}
              agreed={agreed}
              onAgree={setAgreed}
              onEdit={go}
              error={error}
            />
          )}

          {step !== 4 && error && (
            <div className="mt-4">
              <FormError message={error} />
            </div>
          )}

          <div className="border-mist mt-8 flex items-center justify-between gap-3 border-t pt-5">
            {step > 0 ? (
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => go(step - 1)}
                disabled={busy}
              >
                Back
              </button>
            ) : (
              <span />
            )}
            {step < 4 ? (
              <button
                type="button"
                className="btn btn-primary min-w-40"
                onClick={next}
                disabled={!canContinue}
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary min-w-60"
                onClick={confirm}
                disabled={busy}
              >
                {busy ? "Saving your request…" : "Confirm and continue on WhatsApp"}
              </button>
            )}
          </div>
          <p className="sr-only" aria-live="polite">
            Step {step + 1} of {STEPS.length}: {STEPS[step]?.title}
          </p>
        </div>
      </div>

      <aside
        aria-label="Booking summary"
        className="hidden lg:sticky lg:top-24 lg:block lg:self-start"
      >
        <SummaryTicket data={summary} />
        <p className="text-muted mt-3 px-1 text-[0.8125rem]">
          {prefs.format
            ? FORMAT_LABELS[prefs.format]
            : "Choose your preferences to see the full summary."}
        </p>
      </aside>
    </div>
  );
}
