"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, authApi, bookingApi, catalogApi } from "@/lib/api";
import { portalHref } from "@/lib/portal";
import type { Booking, ProviderCode, TestSession, TestType, User } from "@/lib/types";
import { useAuth } from "../auth-provider";
import { FormError } from "../text-field";
import { ProfileCard } from "./profile-card";
import { ProviderDialog } from "./provider-dialog";
import {
  DetailsStep,
  PrefsStep,
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

const STEP_TITLES = ["Exam preference", "Candidate detail", "Review and confirm"] as const;

/** Loads the preselected date (if any) before the booking form mounts so its initial state is complete. */
export function BookingWizardLoader({
  sessionId,
  provider,
}: {
  sessionId?: string;
  provider?: string;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const [pre, setPre] = useState<{ id: string | undefined; session: TestSession | null } | null>(
    null,
  );
  const [types, setTypes] = useState<TestType[] | null>(null);
  const wantsSession = !!sessionId && /^\d+$/.test(sessionId);

  useEffect(() => {
    let off = false;
    catalogApi.testTypes().then(
      (t) => !off && setTypes(t),
      () => !off && setTypes([]),
    );
    if (wantsSession) {
      bookingApi.session(sessionId).then(
        (s) => !off && setPre({ id: sessionId, session: s }),
        () => !off && setPre({ id: sessionId, session: null }),
      );
    }
    return () => {
      off = true;
    };
  }, [sessionId, wantsSession]);

  const validProvider = PROVIDERS.some((p) => p.code === provider)
    ? (provider as ProviderCode)
    : undefined;
  const waiting = !user || !types || (wantsSession && pre?.id !== sessionId);
  if (waiting) {
    return (
      <div
        role="status"
        aria-label="Loading booking form"
        className="grid gap-6 lg:grid-cols-[24rem_1fr]"
      >
        <div className="skeleton-light hidden h-96 rounded-xl lg:block" />
        <div className="skeleton-light h-[32rem] rounded-xl" />
      </div>
    );
  }
  if (!validProvider && !(pre?.session && pre.session.is_bookable)) {
    // No provider yet: ask, exactly like the home page tile does.
    return <ProviderDialog open onClose={() => router.push(portalHref("/"))} />;
  }
  return (
    <BookingWizard
      user={user}
      types={types}
      provider={validProvider}
      preselected={pre?.session ?? null}
      preselectFailed={wantsSession && !pre?.session}
    />
  );
}

function BookingWizard({
  user,
  types,
  provider,
  preselected,
  preselectFailed,
}: {
  user: User;
  types: TestType[];
  provider?: ProviderCode;
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
      : { ...EMPTY_PREFS, provider: provider ?? "" },
  );
  const [session, setSession] = useState<TestSession | null>(usable);
  const [details, setDetails] = useState<DetailsForm>(() => detailsFromUser(user));
  const [errors, setErrors] = useState<DetailErrors>({});
  const [step, setStep] = useState(usable ? 1 : 0);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [blocked, setBlocked] = useState(false);
  const router = useRouter();

  const typeName = types.find((t) => t.code === prefs.testType)?.name;
  const providerLabel = PROVIDERS.find((p) => p.code === prefs.provider)?.label ?? "";

  function go(to: number) {
    setStep(to);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /** Changing the exam clears the chosen date. */
  function updatePrefs(next: Prefs) {
    const changed = (Object.keys(next) as (keyof Prefs)[]).some((k) => next[k] !== prefs[k]);
    setPrefs(next);
    if (changed) setSession(null);
  }

  function setExaminee(examinee: DetailsForm["examinee"]) {
    if (examinee === details.examinee) return;
    setDetails(
      examinee === "self"
        ? { ...detailsFromUser(user, details), examinee: "self" }
        : { ...details, examinee, name: "", phone: "", email: "", dob: "" },
    );
  }

  function updateDetails(next: DetailsForm) {
    setDetails(next);
    if (Object.keys(errors).length) setErrors({});
  }

  function proceed() {
    if (step === 0) {
      go(1);
      return;
    }
    const e = validateDetails(details, session);
    setErrors(e);
    if (Object.keys(e).length) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    go(2);
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

  const crumbs = [
    { label: "Home", href: portalHref("/") },
    { label: providerLabel.replace(" IELTS", "") || "Booking", href: undefined },
    { label: STEP_TITLES[booking ? 2 : step], href: undefined },
  ];

  return (
    <>
      <div className="mb-6 flex items-start gap-3">
        <button
          type="button"
          aria-label="Go back"
          onClick={() => (step > 0 && !booking ? go(step - 1) : router.push(portalHref("/")))}
          className="border-mist hover:border-ink flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border bg-white text-xl"
        >
          ‹
        </button>
        <div>
          <h1 className="text-2xl leading-tight font-bold md:text-3xl">Bookings</h1>
          <nav aria-label="Breadcrumb" className="text-muted text-[0.875rem]">
            <ol className="flex flex-wrap items-center gap-x-2">
              {crumbs.map((c, i) => (
                <li key={c.label} className="flex items-center gap-2">
                  {i > 0 && <span aria-hidden>/</span>}
                  {c.href ? (
                    <Link href={c.href} className="hover:underline">
                      {c.label}
                    </Link>
                  ) : (
                    <span className={i === crumbs.length - 1 ? "text-ink" : ""}>{c.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[24rem_minmax(0,1fr)]">
        <div className="hidden lg:block">
          <ProfileCard user={user} />
        </div>

        <div className="min-w-0">
          {booking ? (
            <section className="panel panel-pad" role="status">
              <p className="text-muted text-[0.9375rem]">Booking request {booking.reference}</p>
              <h2 className="mt-1 text-2xl font-bold md:text-3xl">
                One last step: send the message to our team
              </h2>
              <p className="text-muted mt-3 max-w-2xl">
                {blocked
                  ? "Your browser did not open WhatsApp automatically. Tap the button to open it."
                  : "WhatsApp has opened in a new tab with your details ready to send. Press send there so our team can confirm your seat."}
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
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
              <h3 className="mt-8 font-bold">What happens next</h3>
              <ol className="text-muted mt-2 list-decimal space-y-1.5 pl-5">
                <li>Our team replies in the chat and confirms your seat.</li>
                <li>They explain payment and send your confirmation.</li>
                <li>
                  You get your Speaking time closer to the test, within about a week of the test
                  day.
                </li>
              </ol>
              <p className="text-muted mt-4 text-[0.9375rem]">
                Your seat is not confirmed until our team confirms it. Follow this request under{" "}
                <Link href={portalHref("/bookings")} className="text-crimson underline">
                  Bookings
                </Link>
                .
              </p>
            </section>
          ) : (
            <section className="panel panel-pad" aria-labelledby="step-title">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 id="step-title" className="text-xl font-bold md:text-2xl">
                  {STEP_TITLES[step]}
                </h2>
                {providerLabel && (
                  <p className="border-mist rounded-md border px-3 py-1.5 text-sm font-semibold">
                    {providerLabel}
                  </p>
                )}
              </div>
              <p className="text-muted mt-1 text-[0.9375rem]">Step {step + 1} of 3</p>

              {preselectFailed && (
                <div
                  role="alert"
                  className="border-crimson mt-5 rounded-lg border-l-4 bg-[#f7f8fa] px-4 py-3"
                >
                  That date is no longer open for booking. Choose another below.
                </div>
              )}

              <div className="mt-2">
                {step === 0 && (
                  <PrefsStep
                    prefs={prefs}
                    onChange={updatePrefs}
                    examinee={details.examinee}
                    onExaminee={setExaminee}
                    types={types}
                  />
                )}
                {step === 1 && (
                  <DetailsStep
                    prefs={prefs}
                    session={session}
                    onPick={setSession}
                    value={details}
                    onChange={updateDetails}
                    errors={errors}
                  />
                )}
                {step === 2 && session && (
                  <ReviewStep
                    prefs={prefs}
                    session={session}
                    details={details}
                    providerLabel={providerLabel}
                    typeName={typeName ?? ""}
                    agreed={agreed}
                    onAgree={setAgreed}
                    onEdit={go}
                    error={error}
                  />
                )}
              </div>

              {step !== 2 && error && (
                <div className="mt-4">
                  <FormError message={error} />
                </div>
              )}

              <div className="border-mist mt-6 flex flex-wrap items-center gap-3 border-t pt-6">
                {step < 2 ? (
                  <button
                    type="button"
                    className="btn btn-dark min-w-40"
                    onClick={proceed}
                    disabled={
                      step === 0 &&
                      !(prefs.provider && prefs.testType && prefs.format && prefs.city)
                    }
                  >
                    Proceed
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary min-w-64"
                    onClick={confirm}
                    disabled={busy}
                  >
                    {busy ? "Saving your request…" : "Confirm and continue on WhatsApp"}
                  </button>
                )}
                {step > 0 && (
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => go(step - 1)}
                    disabled={busy}
                  >
                    Back
                  </button>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
