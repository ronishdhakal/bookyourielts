"use client";

import { ProviderLogo } from "../provider-logo";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError, catalogApi, manageApi } from "@/lib/api";
import { formatDate, formatLong, formatNpr } from "@/lib/format";
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
  DeleteBar,
  SkeletonRows,
  Tabs,
  relativeTime,
  useSelection,
} from "./ui";

const PAGE = 24;

export function BookingsAdmin() {
  const q = useQueryState();
  const { stats, reload: reloadStats } = useStats();
  const status = q.get("status");
  const change = q.get("change") === "open";
  const page = Number(q.get("page") || 1);
  const cities = useLoader("cities", () => catalogApi.cities());
  const [info, setInfo] = useState<string | null>(null);
  const list = useLoader(`bookings|${q.key}`, (signal) =>
    manageApi.bookings(
      {
        status,
        change: change ? "open" : "",
        q: q.get("q"),
        city: q.get("city"),
        provider: q.get("provider"),
        page,
      },
      signal,
    ),
  );

  const sel = useSelection(list.data?.results.map((b) => b.id) ?? []);

  return (
    <>
      <PageTitle
        title="Booking requests"
        lede="Confirm a request once the student has paid. Confirming takes a seat; cancelling gives it back."
      />
      <Tabs
        label="Status"
        value={(change ? "change" : status || "all") as "all" | "change" | BookingStatus}
        onChange={(v) =>
          q.set(
            v === "change"
              ? { status: "", change: "open" }
              : { status: v === "all" ? "" : v, change: "" },
          )
        }
        items={[
          { value: "all", label: "All" },
          { value: "initiated", label: "Awaiting confirmation", count: stats?.bookings.initiated },
          { value: "change", label: "Change requests", count: stats?.change_requests },
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

      {info && (
        <p role="status" className="mb-3 font-semibold">
          {info}
        </p>
      )}
      <DeleteBar
        count={sel.picked.length}
        noun="request"
        warning="Confirmed ones give their seat back."
        onClear={sel.clear}
        onDelete={async () => {
          try {
            const r = await manageApi.bulkBookings(sel.picked);
            setInfo(`${r.deleted} deleted.`);
            sel.clear();
            list.reload();
            reloadStats();
          } catch (e) {
            setInfo(e instanceof ApiError ? e.message : "Could not delete.");
          }
        }}
      />
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
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label="Select all requests on this page"
                    className="accent-crimson h-4.5 w-4.5"
                    checked={sel.allPicked}
                    onChange={sel.toggleAll}
                  />
                </th>
                <th className="px-3 py-3 font-semibold">Reference</th>
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
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label={`Select ${b.reference}`}
                      className="accent-crimson h-4.5 w-4.5"
                      checked={sel.has(b.id)}
                      onChange={() => sel.toggle(b.id)}
                    />
                  </td>
                  <td className="px-3 py-3 font-mono text-[0.8125rem]">
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
                    <p className="flex items-center gap-2">
                      <ProviderLogo
                        provider={b.session.provider}
                        label={b.session.provider_label}
                        height={22}
                      />
                      <span>{b.session.test_type.name}</span>
                    </p>
                    <p className="text-muted text-[0.8125rem]">{b.session.city.name}</p>
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
                <label className="flex items-center gap-2 px-4 pt-3 text-sm">
                  <input
                    type="checkbox"
                    aria-label={`Select ${b.reference}`}
                    className="accent-crimson h-4.5 w-4.5"
                    checked={sel.has(b.id)}
                    onChange={() => sel.toggle(b.id)}
                  />
                  Select
                </label>
                <Link
                  href={portalHref(`/manage/bookings/${b.id}`)}
                  className="block px-4 pt-2 pb-3.5"
                >
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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [remark, setRemark] = useState("");
  const [remarkBusy, setRemarkBusy] = useState(false);
  const [remarkErr, setRemarkErr] = useState<string | null>(null);
  const router = useRouter();
  const [slot, setSlot] = useState<string | null>(null);
  const [venueText, setVenueText] = useState<string | null>(null);
  const b = override ?? load.data;

  if (load.error) return <ErrorNote message={load.error} onRetry={load.reload} />;
  if (!b) return <SkeletonRows rows={5} />;
  const s = b.session;

  async function sendRemark() {
    if (!b) return;
    setRemarkBusy(true);
    setRemarkErr(null);
    try {
      setOverride(await manageApi.messageBooking(b.id, remark));
      setRemark("");
    } catch (e) {
      setRemarkErr(e instanceof ApiError ? e.message : "Could not send the message.");
    }
    setRemarkBusy(false);
  }

  async function apply(body: {
    status?: BookingStatus;
    admin_notes?: string;
    resolve_change?: boolean;
    approve_date_change?: boolean;
    assigned_slot?: "" | "morning" | "afternoon";
    assigned_venue?: string;
  }) {
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
              <Detail k="Test day" v={formatLong(s.date)} />
              <Detail k="City" v={s.city.name} />
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
                  b.has_passport ? (
                    <a
                      className="text-crimson underline"
                      target="_blank"
                      rel="noopener"
                      href={`/api/v1/manage/bookings/${b.id}/passport/`}
                    >
                      View passport photo
                    </a>
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
                Message on WhatsApp
              </a>
            </div>
            {error && (
              <p role="alert" className="field-error">
                {error}
              </p>
            )}
          </section>

          <section className="panel panel-pad" aria-labelledby="remark-h">
            <h2 id="remark-h" className="text-lg font-bold">
              Message the student
            </h2>
            <p className="text-muted mt-1 text-[0.8125rem]">
              Shows in their portal and goes to their email. For a chat, use WhatsApp above.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                "Please upload a clear photo of the passport page.",
                "Your payment has been received. We are confirming your seat.",
                "Please contact us on WhatsApp so we can finish your booking.",
              ].map((t) => (
                <button
                  key={t}
                  type="button"
                  className="border-mist hover:border-ink rounded-md border bg-white px-2.5 py-1.5 text-left text-[0.8125rem]"
                  onClick={() => setRemark(t)}
                >
                  {t.split(".")[0]}
                </button>
              ))}
            </div>
            <label htmlFor="remark-text" className="field-label mt-3">
              Message
            </label>
            <textarea
              id="remark-text"
              rows={4}
              maxLength={1000}
              className="field-input py-3"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
            />
            {remarkErr && (
              <p role="alert" className="field-error">
                {remarkErr}
              </p>
            )}
            <button
              type="button"
              className="btn btn-dark btn-sm mt-3"
              disabled={remarkBusy || remark.trim().length < 2}
              onClick={() => void sendRemark()}
            >
              {remarkBusy ? "Sending…" : "Send to student"}
            </button>
            {b.remarks.length > 0 && (
              <ul className="divide-mist mt-4 divide-y border-t border-[var(--color-mist)] text-[0.875rem]">
                {b.remarks.map((r) => (
                  <li key={r.id} className="py-2.5">
                    <p className="whitespace-pre-wrap">{r.body}</p>
                    <p className="text-muted mt-0.5 text-[0.8125rem]">
                      {relativeTime(r.created_at)} · {r.is_read ? "Seen" : "Not seen yet"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="panel panel-pad" aria-labelledby="assign">
            <h2 id="assign" className="text-lg font-bold">
              Session and venue
            </h2>
            <p className="text-muted mt-1 text-[0.8125rem]">
              Assigned after booking. The student sees this on their booking.
            </p>
            <label htmlFor="as-slot" className="field-label mt-3">
              Session
            </label>
            <select
              id="as-slot"
              className="field-input"
              value={slot ?? b.assigned_slot}
              onChange={(e) => setSlot(e.target.value)}
            >
              <option value="">Not assigned yet</option>
              <option value="morning">Morning, about 9:00 am to 12:00 pm</option>
              <option value="afternoon">Afternoon, about 1:00 pm to 4:00 pm</option>
            </select>
            <label htmlFor="as-venue" className="field-label mt-3">
              Venue
            </label>
            <input
              id="as-venue"
              className="field-input"
              maxLength={150}
              placeholder="Test centre name and address"
              value={venueText ?? b.assigned_venue}
              onChange={(e) => setVenueText(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-dark btn-sm mt-3"
              disabled={busy || (slot === null && venueText === null)}
              onClick={() =>
                void apply({
                  assigned_slot: (slot ?? b.assigned_slot) as "" | "morning" | "afternoon",
                  assigned_venue: venueText ?? b.assigned_venue,
                })
              }
            >
              Save assignment
            </button>
          </section>

          {b.change_requested_at && (
            <section className="panel panel-pad" aria-labelledby="chg">
              <h2 id="chg" className="text-lg font-bold">
                Change request
              </h2>
              <p className="mt-2 rounded-lg bg-[#f7f8fa] p-3 text-[0.9375rem]">
                “{b.change_request}”
              </p>
              <p className="text-muted mt-2 text-[0.8125rem]">
                Asked {relativeTime(b.change_requested_at)}
              </p>
              {b.change_open && b.requested_session && (
                <div className="border-crimson mt-3 rounded-lg border-2 p-3 text-[0.9375rem]">
                  <p className="font-semibold">
                    Wants to move to {formatDate(b.requested_session.date, { weekday: "short" })} in{" "}
                    {b.requested_session.city.name}
                  </p>
                  <p className="text-muted text-[0.8125rem]">
                    {b.requested_session.seats_left} seats left. Approving moves the seat and clears
                    the session and venue.
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm mt-2"
                    disabled={busy}
                    onClick={() => void apply({ approve_date_change: true })}
                  >
                    Approve date change
                  </button>
                </div>
              )}
              {b.change_open ? (
                <button
                  type="button"
                  className="btn btn-dark btn-sm mt-3"
                  disabled={busy}
                  onClick={() => void apply({ resolve_change: true })}
                >
                  {b.requested_session ? "Decline and close" : "Mark as resolved"}
                </button>
              ) : (
                <p className="mt-3 font-semibold">Resolved</p>
              )}
            </section>
          )}

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
          <section className="panel panel-pad" aria-labelledby="del">
            <h2 id="del" className="text-lg font-bold">
              Delete this request
            </h2>
            <p className="text-muted mt-1 text-[0.8125rem]">
              Removes it and its passport files for good. A confirmed booking gives its seat back.
              To keep a record, cancel it instead.
            </p>
            {confirmDelete ? (
              <div
                role="alertdialog"
                aria-label="Confirm delete"
                className="mt-3 flex flex-wrap items-center gap-3"
              >
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await manageApi.bulkBookings([b.id]);
                      reloadStats();
                      router.push(portalHref("/manage/bookings"));
                    } catch (e) {
                      setError(e instanceof ApiError ? e.message : "Could not delete.");
                      setBusy(false);
                    }
                  }}
                >
                  Yes, delete
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setConfirmDelete(false)}
                >
                  Keep
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-outline btn-sm mt-3"
                onClick={() => setConfirmDelete(true)}
              >
                Delete request
              </button>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
