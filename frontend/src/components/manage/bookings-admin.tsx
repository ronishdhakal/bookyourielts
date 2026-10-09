"use client";

import Link from "next/link";
import { useState } from "react";
import { ApiError, catalogApi, manageApi } from "@/lib/api";
import { SLOT_TIMES, formatDate, formatLong, formatNpr } from "@/lib/format";
import { portalHref } from "@/lib/portal";
import type { BookingStatus, StaffBooking } from "@/lib/types";
import { useLoader } from "@/lib/use-loader";
import { useQueryState } from "@/lib/use-query-state";
import { useStats } from "./manage-shell";
import {
  EmptyRow,
  ErrorNote,
  PageTitle,
  Pager,
  Pill,
  SearchBox,
  SkeletonRows,
  Tabs,
  relativeTime,
} from "./ui";

const PAGE = 24;

export function BookingsAdmin() {
  const q = useQueryState();
  const { stats } = useStats();
  const status = q.get("status");
  const page = Number(q.get("page") || 1);
  const cities = useLoader("cities", () => catalogApi.cities());
  const list = useLoader(`bookings|${q.key}`, (signal) =>
    manageApi.bookings(
      { status, q: q.get("q"), city: q.get("city"), provider: q.get("provider"), page },
      signal,
    ),
  );

  return (
    <>
      <PageTitle
        title="Booking requests"
        lede="Confirm a request once the student has paid. Confirming takes a seat; cancelling gives it back."
      />
      <Tabs
        label="Status"
        value={(status || "all") as "all" | BookingStatus}
        onChange={(v) => q.set({ status: v === "all" ? "" : v })}
        items={[
          { value: "all", label: "All" },
          { value: "initiated", label: "Awaiting confirmation", count: stats?.bookings.initiated },
          { value: "confirmed", label: "Confirmed" },
          { value: "cancelled", label: "Cancelled" },
        ]}
      />
      <div className="my-4 flex flex-wrap gap-3">
        <SearchBox
          label="Search requests"
          placeholder="Search name, phone, email or reference"
          value={q.get("q")}
          onChange={(v) => q.set({ q: v })}
        />
        <select
          aria-label="City"
          className="field-input !min-h-11 !w-auto"
          value={q.get("city")}
          onChange={(e) => q.set({ city: e.target.value })}
        >
          <option value="">All cities</option>
          {cities.data?.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Provider"
          className="field-input !min-h-11 !w-auto"
          value={q.get("provider")}
          onChange={(e) => q.set({ provider: e.target.value })}
        >
          <option value="">All providers</option>
          <option value="british_council">British Council</option>
          <option value="idp">IDP</option>
        </select>
      </div>

      {list.error ? (
        <ErrorNote message={list.error} onRetry={list.reload} />
      ) : list.loading ? (
        <SkeletonRows />
      ) : !list.data || list.data.results.length === 0 ? (
        <EmptyRow
          title="No booking requests match"
          text="Try another status or clear the search."
        />
      ) : (
        <div className={`panel overflow-hidden ${list.refreshing ? "opacity-70" : ""}`}>
          <table className="hidden w-full text-left text-[0.9375rem] md:table">
            <caption className="sr-only">Booking requests</caption>
            <thead className="border-mist bg-ink/[0.03] text-muted border-b text-[0.8125rem]">
              <tr>
                <th className="px-4 py-3 font-semibold">Reference</th>
                <th className="px-3 py-3 font-semibold">Candidate</th>
                <th className="px-3 py-3 font-semibold">Exam</th>
                <th className="px-3 py-3 font-semibold">Test day</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Requested</th>
              </tr>
            </thead>
            <tbody className="divide-mist divide-y">
              {list.data.results.map((b) => (
                <tr key={b.id} className="hover:bg-ink/[0.03]">
                  <td className="px-4 py-3 font-mono text-[0.8125rem]">
                    <Link
                      href={portalHref(`/manage/bookings/${b.id}`)}
                      className="text-crimson font-semibold underline underline-offset-4"
                    >
                      {b.reference}
                    </Link>
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-semibold">{b.candidate_name || b.user.full_name}</p>
                    <p className="text-muted font-mono text-[0.8125rem]">
                      {b.candidate_phone || b.user.phone}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    <p>{b.session.test_type.name}</p>
                    <p className="text-muted text-[0.8125rem]">
                      {b.session.provider_label} · {b.session.city.name}
                    </p>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {formatDate(b.session.date, { weekday: "short" })}
                  </td>
                  <td className="px-3 py-3">
                    <Pill kind="booking" status={b.status} />
                  </td>
                  <td className="text-muted px-4 py-3 text-right text-[0.8125rem] whitespace-nowrap">
                    {relativeTime(b.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="divide-mist divide-y md:hidden">
            {list.data.results.map((b) => (
              <li key={b.id}>
                <Link href={portalHref(`/manage/bookings/${b.id}`)} className="block px-4 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold">{b.candidate_name || b.user.full_name}</p>
                    <Pill kind="booking" status={b.status} />
                  </div>
                  <p className="text-muted text-[0.875rem]">
                    {b.session.test_type.name} · {b.session.city.name} ·{" "}
                    {formatDate(b.session.date, { year: undefined })}
                  </p>
                  <p className="text-muted mt-0.5 font-mono text-[0.75rem]">
                    {b.reference} · {relativeTime(b.created_at)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {list.data && (
        <Pager
          page={page}
          count={list.data.count}
          size={PAGE}
          onPage={(p) => q.set({ page: String(p) })}
        />
      )}
    </>
  );
}

function Detail({ k, v }: { k: string; v?: React.ReactNode }) {
  return (
    <div className="grid gap-0.5 py-2.5 sm:grid-cols-[10rem_1fr]">
      <dt className="text-muted text-[0.9375rem]">{k}</dt>
      <dd className="font-medium break-words">
        {v || <span className="text-muted font-normal">Not provided</span>}
      </dd>
    </div>
  );
}

export function BookingAdminDetail({ id }: { id: string }) {
  const load = useLoader(`booking|${id}`, () => manageApi.booking(id));
  const { reload: reloadStats } = useStats();
  const [override, setOverride] = useState<StaffBooking | null>(null);
  const [notes, setNotes] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const b = override ?? load.data;

  if (load.error) return <ErrorNote message={load.error} onRetry={load.reload} />;
  if (!b) return <SkeletonRows rows={5} />;
  const s = b.session;

  async function apply(body: { status?: BookingStatus; admin_notes?: string }) {
    if (!b) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      setOverride(await manageApi.updateBooking(b.id, body));
      setSaved(true);
      setConfirmCancel(false);
      reloadStats();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save the change.");
    }
    setBusy(false);
  }

  return (
    <>
      <p className="mb-2 text-[0.9375rem]">
        <Link
          href={portalHref("/manage/bookings")}
          className="text-muted underline underline-offset-4"
        >
          ← Booking requests
        </Link>
      </p>
      <PageTitle
        title={b.candidate_name || b.user.full_name}
        lede={`${b.reference} · requested ${relativeTime(b.created_at)}`}
        actions={<Pill kind="booking" status={b.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="space-y-6">
          <section className="panel panel-pad" aria-labelledby="exam">
            <h2 id="exam" className="mb-1 text-lg font-bold">
              Exam
            </h2>
            <dl className="divide-mist divide-y">
              <Detail k="Test" v={`${s.provider_label} · ${s.test_type.name}`} />
              <Detail k="Format" v={s.format_label} />
              <Detail k="Test day" v={`${formatLong(s.date)}, ${s.date.slice(0, 4)}`} />
              <Detail
                k="Session"
                v={`${s.slot === "morning" ? "Morning" : "Afternoon"}, ${SLOT_TIMES[s.slot]}`}
              />
              <Detail
                k="Venue"
                v={
                  s.venue
                    ? `${s.venue.name}${s.venue.address ? `, ${s.venue.address}` : ""}`
                    : s.city.name
                }
              />
              <Detail k="Fee" v={formatNpr(s.fee_npr)} />
              <Detail
                k="Seats"
                v={`${s.seats_left} left · registration closes ${formatDate(s.registration_closes_on)}`}
              />
            </dl>
            <Link
              href={portalHref(`/manage/dates/${s.id}`)}
              className="text-crimson mt-2 inline-block font-semibold underline underline-offset-4"
            >
              Open this test date
            </Link>
          </section>

          <section className="panel panel-pad" aria-labelledby="cand">
            <h2 id="cand" className="mb-1 text-lg font-bold">
              Candidate
            </h2>
            <dl className="divide-mist divide-y">
              <Detail
                k="Taking the test"
                v={b.examinee === "self" ? "The account holder" : "Someone else"}
              />
              <Detail k="Full name" v={b.candidate_name} />
              <Detail k="Mobile" v={b.candidate_phone} />
              <Detail k="Email" v={b.candidate_email} />
              <Detail k="Date of birth" v={b.date_of_birth ? formatDate(b.date_of_birth) : ""} />
              <Detail
                k="Address"
                v={[b.municipality, b.district, b.province].filter(Boolean).join(", ")}
              />
              <Detail
                k="Passport"
                v={
                  b.has_passport_front || b.has_passport_back ? (
                    <span className="flex gap-4">
                      {b.has_passport_front && (
                        <a
                          className="text-crimson underline"
                          target="_blank"
                          rel="noopener"
                          href={`/api/v1/manage/bookings/${b.id}/passport/front/`}
                        >
                          Front
                        </a>
                      )}
                      {b.has_passport_back && (
                        <a
                          className="text-crimson underline"
                          target="_blank"
                          rel="noopener"
                          href={`/api/v1/manage/bookings/${b.id}/passport/back/`}
                        >
                          Back
                        </a>
                      )}
                    </span>
                  ) : (
                    "Not uploaded"
                  )
                }
              />
            </dl>
          </section>

          <section className="panel panel-pad" aria-labelledby="acct">
            <h2 id="acct" className="mb-1 text-lg font-bold">
              Account that booked
            </h2>
            <dl className="divide-mist divide-y">
              <Detail k="Name" v={b.user.full_name} />
              <Detail k="Email" v={b.user.email} />
              <Detail k="Mobile" v={b.user.phone} />
            </dl>
          </section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <section className="panel panel-pad" aria-labelledby="act">
            <h2 id="act" className="text-lg font-bold">
              Decision
            </h2>
            <p className="text-muted mt-1 mb-4 text-[0.9375rem]">
              {b.status === "initiated" &&
                "Confirm once the student has paid and the seat is secured."}
              {b.status === "confirmed" && "A seat is held for this student."}
              {b.status === "cancelled" &&
                "This request is cancelled. You can reopen it if needed."}
            </p>
            <div className="flex flex-col gap-2.5">
              {b.status !== "confirmed" && (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busy}
                  onClick={() => void apply({ status: "confirmed" })}
                >
                  Confirm booking (uses a seat)
                </button>
              )}
              {b.status !== "cancelled" &&
                (confirmCancel ? (
                  <div
                    role="alertdialog"
                    aria-label="Confirm cancellation"
                    className="border-crimson rounded-lg border-2 p-3"
                  >
                    <p className="text-[0.9375rem] font-semibold">Cancel this request?</p>
                    <p className="text-muted text-[0.875rem]">
                      {b.status === "confirmed"
                        ? "The seat goes back to the date."
                        : "The student will see it as cancelled."}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={busy}
                        onClick={() => void apply({ status: "cancelled" })}
                      >
                        Yes, cancel
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => setConfirmCancel(false)}
                      >
                        Keep
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setConfirmCancel(true)}
                  >
                    Cancel request
                  </button>
                ))}
              {b.status === "cancelled" && (
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={busy}
                  onClick={() => void apply({ status: "initiated" })}
                >
                  Reopen as awaiting
                </button>
              )}
              <a
                className="btn btn-outline"
                href={b.whatsapp_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Message candidate
              </a>
            </div>
            {error && (
              <p role="alert" className="field-error">
                {error}
              </p>
            )}
          </section>

          <section className="panel panel-pad" aria-labelledby="notes">
            <h2 id="notes" className="text-lg font-bold">
              Internal notes
            </h2>
            <label htmlFor="admin-notes" className="sr-only">
              Internal notes
            </label>
            <textarea
              id="admin-notes"
              rows={5}
              className="field-input mt-2 py-3"
              placeholder="Payment received, documents checked, anything the team should know."
              value={notes ?? b.admin_notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setSaved(false);
              }}
            />
            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={busy || notes === null}
                onClick={() => void apply({ admin_notes: notes ?? "" })}
              >
                Save notes
              </button>
              {saved && (
                <span role="status" className="text-ok text-[0.9375rem] font-semibold">
                  Saved
                </span>
              )}
            </div>
            <p className="text-muted mt-2 text-[0.8125rem]">Never shown to students.</p>
          </section>
        </aside>
      </div>
    </>
  );
}
