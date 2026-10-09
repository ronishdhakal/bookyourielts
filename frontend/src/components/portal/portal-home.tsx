"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authApi, bookingApi, catalogApi } from "@/lib/api";
import { formatDate, formatNpr } from "@/lib/format";
import { portalHref, siteHref } from "@/lib/portal";
import type { Booking, User } from "@/lib/types";
import { useAuth } from "../auth-provider";
import { StatusChip } from "./booking-bits";

export function ProfileCard({ user, compact = false }: { user: User; compact?: boolean }) {
  const checks = [
    { label: "Name", ok: !!user.full_name },
    { label: "Mobile number", ok: !!user.phone },
    { label: "Email verified", ok: user.email_verified },
    { label: "Date of birth", ok: !!user.date_of_birth },
  ];
  const done = checks.filter((c) => c.ok).length;
  return (
    <section className="panel panel-pad" aria-label="Your profile">
      <p className="section-title">YOUR PROFILE</p>
      <p className="font-display mt-2 text-2xl leading-tight font-bold">{user.full_name}</p>
      <p className="text-muted font-mono text-[0.8125rem]">
        Member since {formatDate(user.date_joined.slice(0, 10))}
      </p>
      {!compact && (
        <dl className="mt-4 space-y-3 text-[0.9375rem]">
          <div>
            <dt className="text-muted text-[0.8125rem]">Mobile number</dt>
            <dd className="font-semibold">{user.phone || "Not added"}</dd>
          </div>
          <div>
            <dt className="text-muted text-[0.8125rem]">Email</dt>
            <dd className="font-semibold break-all">{user.email}</dd>
          </div>
          <div>
            <dt className="text-muted text-[0.8125rem]">Date of birth</dt>
            <dd className="font-semibold">
              {user.date_of_birth ? formatDate(user.date_of_birth) : "Not added"}
            </dd>
          </div>
        </dl>
      )}
      <div className="border-mist mt-5 border-t pt-4">
        <div className="mb-2 flex items-baseline justify-between">
          <p className="text-[0.9375rem] font-semibold">
            Profile {done === checks.length ? "complete" : "checklist"}
          </p>
          <p className="font-mono text-[0.8125rem]">
            {done}/{checks.length}
          </p>
        </div>
        <div className="bg-mist h-1.5 overflow-hidden rounded-full" aria-hidden>
          <div
            className="bg-spruce h-full rounded-full"
            style={{ width: `${(done / checks.length) * 100}%` }}
          />
        </div>
        <ul className="mt-3 space-y-1 text-[0.875rem]">
          {checks.map((c) => (
            <li key={c.label} className={c.ok ? "text-muted" : "font-semibold"}>
              <span aria-hidden>{c.ok ? "✓ " : "○ "}</span>
              {c.label}
              {!c.ok && <span className="sr-only"> (missing)</span>}
            </li>
          ))}
        </ul>
        {done < checks.length && (
          <Link
            href={portalHref("/profile")}
            className="text-crimson mt-3 inline-block text-[0.9375rem] font-semibold underline underline-offset-4"
          >
            Complete your profile
          </Link>
        )}
      </div>
    </section>
  );
}

export function PortalHome() {
  const { user } = useAuth();
  const router = useRouter();
  // Staff land on the admin dashboard, like students land here. ?student=1 shows this page anyway.
  const staffRedirect =
    !!user?.is_staff &&
    typeof window !== "undefined" &&
    !window.location.search.includes("student");
  useEffect(() => {
    if (staffRedirect) router.replace(portalHref("/manage"));
  }, [staffRedirect, router]);
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [bring, setBring] = useState<string[]>([]);

  useEffect(() => {
    let off = false;
    bookingApi.mine().then(
      (b) => !off && setBookings(b),
      () => !off && setBookings([]),
    );
    catalogApi.content().then(
      (blocks) => {
        const b = blocks.find((x) => x.key === "what-to-bring");
        if (!off && b)
          setBring(
            b.body
              .split("\n")
              .filter((l) => l.startsWith("- "))
              .map((l) => l.slice(2)),
          );
      },
      () => undefined,
    );
    return () => {
      off = true;
    };
  }, []);

  if (!user || staffRedirect) return null;
  const first = user.full_name.split(" ")[0];
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = bookings
    ?.filter((b) => b.status !== "cancelled" && b.session.date >= today)
    .sort((a, b) => a.session.date.localeCompare(b.session.date))[0];

  return (
    <div className="grid gap-6 lg:grid-cols-[19rem_minmax(0,1fr)]">
      <div className="space-y-6">
        <ProfileCard user={user} />
        <section className="panel panel-pad" aria-label="Help">
          <p className="section-title">NEED A DATE THAT IS NOT LISTED?</p>
          <p className="text-muted mt-2 text-[0.9375rem]">
            Dates are released in batches. Tell us what you need and we will contact you when one
            opens.
          </p>
          <a href={siteHref("/inquire")} className="btn btn-outline btn-sm mt-3">
            Send an inquiry
          </a>
        </section>
      </div>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold md:text-4xl">Namaste, {first}</h1>
          <p className="text-muted mt-1">
            Reserve a test date, track your requests and keep your details in one place.
          </p>
        </div>

        <section
          className="ticket on-dark !rounded-xl"
          style={{ ["--tear" as string]: "50%" }}
          aria-labelledby="reserve"
        >
          <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center md:p-8">
            <div>
              <p className="text-board/70 font-mono text-[0.75rem] tracking-wide">
                RESERVE YOUR DATE
              </p>
              <h2
                id="reserve"
                className="font-display mt-1 text-3xl leading-tight font-bold md:text-4xl"
              >
                Book your IELTS test
              </h2>
              <p className="text-board/80 mt-2 max-w-md">
                Choose a provider, your test type and city, pick a date from the calendar and add
                your details. It takes about three minutes.
              </p>
            </div>
            <Link href={portalHref("/book")} className="btn btn-primary !min-h-14 px-8 text-lg">
              Book an exam
            </Link>
          </div>
        </section>

        {upcoming && (
          <section className="panel panel-pad" aria-labelledby="next-test">
            <p className="section-title">YOUR NEXT TEST</p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 id="next-test" className="font-display text-2xl font-bold">
                  {upcoming.session.test_type.name} · {upcoming.session.city.name}
                </h2>
                <p className="text-muted font-mono text-sm">
                  {formatDate(upcoming.session.date, { weekday: "long" })} ·{" "}
                  {formatNpr(upcoming.session.fee_npr)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusChip status={upcoming.status} />
                <Link
                  href={portalHref(`/bookings/${upcoming.id}`)}
                  className="btn btn-outline btn-sm"
                >
                  View
                </Link>
              </div>
            </div>
          </section>
        )}

        <section className="panel panel-pad" aria-labelledby="recent">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 id="recent" className="font-display text-2xl font-bold">
              Recent requests
            </h2>
            <Link
              href={portalHref("/bookings")}
              className="text-crimson font-semibold underline underline-offset-4"
            >
              See all
            </Link>
          </div>
          {!bookings ? (
            <div className="skeleton-light h-24 rounded-lg" role="status" aria-label="Loading" />
          ) : bookings.length === 0 ? (
            <p className="text-muted">
              You have not made a booking request yet. Your requests will appear here.
            </p>
          ) : (
            <ul className="divide-mist divide-y">
              {bookings.slice(0, 3).map((b) => (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-semibold">
                      {b.session.test_type.name} · {b.session.city.name}
                    </p>
                    <p className="text-muted font-mono text-[0.8125rem]">
                      {b.reference} · {formatDate(b.session.date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusChip status={b.status} />
                    <Link
                      href={portalHref(`/bookings/${b.id}`)}
                      className="text-crimson font-semibold underline underline-offset-4"
                    >
                      Open
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {bring.length > 0 && (
          <section className="panel panel-pad" aria-labelledby="bring">
            <h2 id="bring" className="font-display text-2xl font-bold">
              Before test day
            </h2>
            <ul className="mt-3 space-y-2">
              {bring.map((b) => (
                <li key={b} className="flex gap-3">
                  <span aria-hidden className="text-spruce font-bold">
                    ✓
                  </span>
                  {b}
                </li>
              ))}
            </ul>
            <p className="text-muted mt-3 text-[0.875rem]">
              Phones, bags, watches and notes are kept outside the test room.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}

export function ProfileForm() {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.full_name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [dob, setDob] = useState(user?.date_of_birth ?? "");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  if (!user) return null;
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setState("saving");
    setMessage(null);
    try {
      const updated = await authApi.updateMe({
        full_name: name.trim(),
        phone,
        date_of_birth: dob || null,
      });
      setUser(updated);
      setState("saved");
    } catch (err) {
      setState("error");
      setMessage(err instanceof Error ? err.message : "Could not save your details.");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[19rem_minmax(0,1fr)]">
      <ProfileCard user={user} compact />
      <form onSubmit={save} className="panel panel-pad max-w-2xl space-y-5" noValidate>
        <h2 className="font-display text-2xl font-bold">Your details</h2>
        <div>
          <label htmlFor="pf-name" className="field-label">
            Full name
          </label>
          <input
            id="pf-name"
            className="field-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        </div>
        <div>
          <label htmlFor="pf-phone" className="field-label">
            Mobile number
          </label>
          <input
            id="pf-phone"
            type="tel"
            className="field-input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
          />
        </div>
        <div>
          <label htmlFor="pf-dob" className="field-label">
            Date of birth
          </label>
          <input
            id="pf-dob"
            type="date"
            className="field-input"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
          />
        </div>
        <div>
          <p className="field-label">Email</p>
          <p className="font-semibold">{user.email}</p>
          <p className="field-hint">
            {user.email_verified ? "Verified" : "Not verified yet. Check your inbox for our link."}
          </p>
        </div>
        {state === "error" && message && (
          <p role="alert" className="field-error">
            {message}
          </p>
        )}
        <div className="flex items-center gap-4">
          <button type="submit" className="btn btn-primary" disabled={state === "saving"}>
            {state === "saving" ? "Saving…" : "Save changes"}
          </button>
          {state === "saved" && (
            <span role="status" className="text-ok font-semibold">
              Saved
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
