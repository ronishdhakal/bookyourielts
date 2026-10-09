"use client";

import { useState } from "react";
import { ApiError, manageApi } from "@/lib/api";
import { monthLabel } from "@/lib/format";
import type { InquiryStatus, StaffInquiry } from "@/lib/types";
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

function waLink(phone: string, name: string) {
  return `https://wa.me/${phone.replace(/^\+/, "")}?text=${encodeURIComponent(`Hi ${name}, this is bookyourielts.com about your IELTS inquiry.`)}`;
}

function Row({
  item,
  onChanged,
  picked,
  onPick,
}: {
  item: StaffInquiry;
  onChanged: () => void;
  picked: boolean;
  onPick: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState(item);

  async function save(body: { status?: InquiryStatus; admin_notes?: string }) {
    setBusy(true);
    setError(null);
    try {
      setCurrent(await manageApi.updateInquiry(current.id, body));
      onChanged();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save.");
    }
    setBusy(false);
  }

  const wants = [
    current.test_type_name,
    current.preferred_city_name,
    current.format_label,
    current.preferred_month && monthLabel(current.preferred_month),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="flex items-stretch">
      <label className="flex items-center pl-4">
        <input
          type="checkbox"
          aria-label={`Select ${current.name}`}
          className="accent-crimson h-4.5 w-4.5"
          checked={picked}
          onChange={onPick}
        />
      </label>
      <div className="min-w-0 flex-1">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="hover:bg-ink/[0.03] grid w-full items-center gap-x-4 gap-y-1 px-4 py-3.5 text-left sm:grid-cols-[1fr_auto_6rem]"
        >
          <span className="min-w-0">
            <span className="block font-semibold">{current.name}</span>
            <span className="text-muted block truncate text-[0.875rem]">
              {wants || (current.message ? `Question: ${current.message}` : "General question")}
            </span>
          </span>
          <Pill kind="inquiry" status={current.status} />
          <span className="text-muted text-[0.8125rem] sm:text-right">
            {relativeTime(current.created_at)}
          </span>
        </button>
        {open && (
          <div className="bg-ink/[0.03] border-mist grid gap-5 border-t px-4 py-4 md:grid-cols-2">
            <dl className="space-y-2 text-[0.9375rem]">
              <div>
                <dt className="text-muted text-[0.8125rem]">Mobile</dt>
                <dd className="font-mono">{current.phone}</dd>
              </div>
              {current.email && (
                <div>
                  <dt className="text-muted text-[0.8125rem]">Email</dt>
                  <dd>{current.email}</dd>
                </div>
              )}
              <div>
                <dt className="text-muted text-[0.8125rem]">Message</dt>
                <dd className="whitespace-pre-wrap">{current.message || "No message"}</dd>
              </div>
              <a
                href={waLink(current.phone, current.name)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline btn-sm mt-1"
              >
                Message on WhatsApp
              </a>
            </dl>
            <div>
              <p className="field-label">Status</p>
              <div className="flex flex-wrap gap-2">
                {(["new", "contacted", "closed"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    disabled={busy}
                    aria-pressed={current.status === st}
                    onClick={() => void save({ status: st })}
                    className={`min-h-10 rounded-md border px-3 text-[0.9375rem] font-semibold capitalize ${current.status === st ? "bg-ink text-paper border-ink" : "border-mist hover:border-ink bg-white"}`}
                  >
                    {st}
                  </button>
                ))}
              </div>
              <label htmlFor={`n-${current.id}`} className="field-label mt-4">
                Internal notes
              </label>
              <textarea
                id={`n-${current.id}`}
                rows={3}
                className="field-input py-3"
                value={notes ?? current.admin_notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <button
                type="button"
                className="btn btn-outline btn-sm mt-2"
                disabled={busy || notes === null}
                onClick={() => void save({ admin_notes: notes ?? "" })}
              >
                Save notes
              </button>
              {error && (
                <p role="alert" className="field-error">
                  {error}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </li>
  );
}

export function InquiriesAdmin() {
  const q = useQueryState();
  const { stats, reload } = useStats();
  const [info, setInfo] = useState<string | null>(null);
  const status = q.get("status");
  const page = Number(q.get("page") || 1);
  const list = useLoader(`inq|${q.key}`, (signal) =>
    manageApi.inquiries({ status, q: q.get("q"), page }, signal),
  );

  const sel = useSelection(list.data?.results.map((i) => i.id) ?? []);

  return (
    <>
      <PageTitle
        title="Inquiries"
        lede="Students who could not find a date. Contact them when a matching one opens."
      />
      <Tabs
        label="Status"
        value={(status || "all") as "all" | InquiryStatus}
        onChange={(v) => q.set({ status: v === "all" ? "" : v })}
        items={[
          { value: "all", label: "All" },
          { value: "new", label: "New", count: stats?.new_inquiries },
          { value: "contacted", label: "Contacted" },
          { value: "closed", label: "Closed" },
        ]}
      />
      <div className="my-4 flex">
        <SearchBox
          label="Search inquiries"
          placeholder="Search name, phone or email"
          value={q.get("q")}
          onChange={(v) => q.set({ q: v })}
        />
      </div>
      {info && (
        <p role="status" className="mb-3 font-semibold">
          {info}
        </p>
      )}
      <DeleteBar
        count={sel.picked.length}
        noun="inquiry"
        onClear={sel.clear}
        onDelete={async () => {
          try {
            const r = await manageApi.bulkInquiries(sel.picked);
            setInfo(`${r.deleted} deleted.`);
            sel.clear();
            list.reload();
            reload();
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
          title="No inquiries here"
          text="New inquiries from the website appear in this list."
        />
      ) : (
        <ul
          className={`panel divide-mist divide-y overflow-hidden ${list.refreshing ? "opacity-70" : ""}`}
        >
          {list.data.results.map((i) => (
            <Row
              key={i.id}
              item={i}
              onChanged={reload}
              picked={sel.has(i.id)}
              onPick={() => sel.toggle(i.id)}
            />
          ))}
        </ul>
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
