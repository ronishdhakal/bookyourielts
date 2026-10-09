"use client";

import Link from "next/link";
import { useState } from "react";
import { ApiError, manageApi } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { portalHref } from "@/lib/portal";
import { useLoader } from "@/lib/use-loader";
import { useStats } from "./manage-shell";
import { ErrorNote, PageTitle, SkeletonRows } from "./ui";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/** A month grid where tapping a day adds or removes it. Past days cannot be chosen. */
function MonthPicker({
  year,
  month,
  picked,
  today,
  onToggle,
}: {
  year: number;
  month: number;
  picked: string[];
  today: string;
  onToggle: (day: string) => void;
}) {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7; // Monday first
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ];
  return (
    <div>
      <p className="mb-2 font-bold">
        {new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(first)}
      </p>
      <div role="grid" aria-label="Pick test days" className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w) => (
          <span key={w} className="text-muted py-1 text-center text-[0.75rem] font-semibold">
            {w}
          </span>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <span key={`b${i}`} />;
          const day = iso(year, month, d);
          const on = picked.includes(day);
          const past = day < today;
          return (
            <button
              key={day}
              type="button"
              disabled={past}
              aria-pressed={on}
              aria-label={formatDate(day, { weekday: "long" })}
              onClick={() => onToggle(day)}
              className={`h-10 rounded-md border text-[0.9375rem] font-semibold transition-colors disabled:cursor-not-allowed disabled:border-transparent disabled:text-[#b7bcc4] ${
                on
                  ? "border-crimson bg-crimson text-white"
                  : "border-mist hover:border-ink bg-white"
              }`}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function BulkDates() {
  const { reload: reloadStats } = useStats();
  const meta = useLoader("meta", () => manageApi.meta());
  const now = new Date();
  const today = iso(now.getFullYear(), now.getMonth(), now.getDate());
  const [offset, setOffset] = useState(0);
  const [picked, setPicked] = useState<string[]>([]);
  const [provider, setProvider] = useState("british_council");
  const [city, setCity] = useState("");
  const [testType, setTestType] = useState("");
  const [format, setFormat] = useState("computer");
  const [fee, setFee] = useState("");
  const [seats, setSeats] = useState("5");
  const [visible, setVisible] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: string[] } | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (meta.error) return <ErrorNote message={meta.error} onRetry={meta.reload} />;
  if (!meta.data) return <SkeletonRows rows={4} />;
  const m = meta.data;
  const type = m.test_types.find((t) => String(t.id) === testType);

  const months = [0, 1].map((k) => {
    const d = new Date(now.getFullYear(), now.getMonth() + offset + k, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const toggle = (day: string) =>
    setPicked((p) => (p.includes(day) ? p.filter((x) => x !== day) : [...p, day].sort()));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const local: Record<string, string> = {};
    if (!city) local.city = "Choose a city.";
    if (!testType) local.test_type = "Choose a test type.";
    if (fee === "" || Number(fee) < 0) local.fee_npr = "Enter the fee in NPR.";
    if (seats === "" || Number(seats) < 0) local.seats_total = "Enter the seats for each date.";
    if (picked.length === 0) local.dates = "Tap the days on the calendar.";
    setErrors(local);
    setMessage(null);
    setResult(null);
    if (Object.keys(local).length) return;
    setBusy(true);
    try {
      const r = await manageApi.bulkCreateSessions({
        dates: picked,
        provider,
        city: Number(city),
        test_type: Number(testType),
        format,
        fee_npr: Number(fee),
        seats_total: Number(seats),
        is_visible: visible,
      });
      setResult(r);
      setPicked([]);
      reloadStats();
    } catch (er) {
      if (er instanceof ApiError && Object.keys(er.fields).length) {
        setErrors(Object.fromEntries(Object.entries(er.fields).map(([k, v]) => [k, v[0] ?? ""])));
      } else setMessage(er instanceof ApiError ? er.message : "Could not create the dates.");
    }
    setBusy(false);
  }

  const select = (
    id: string,
    label: string,
    value: string,
    onChange: (v: string) => void,
    options: { v: string; l: string; disabled?: boolean }[],
    blank?: string,
  ) => (
    <div>
      <label htmlFor={`bd-${id}`} className="field-label">
        {label}
      </label>
      <select
        id={`bd-${id}`}
        className="field-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={errors[id] ? true : undefined}
      >
        {blank !== undefined && <option value="">{blank}</option>}
        {options.map((o) => (
          <option key={o.v} value={o.v} disabled={o.disabled}>
            {o.l}
          </option>
        ))}
      </select>
      {errors[id] && (
        <p className="field-error" role="alert">
          {errors[id]}
        </p>
      )}
    </div>
  );

  return (
    <>
      <p className="mb-2 text-[0.9375rem]">
        <Link
          href={portalHref("/manage/dates")}
          className="text-muted underline underline-offset-4"
        >
          ← Test dates
        </Link>
      </p>
      <PageTitle
        title="Add many dates"
        lede="Choose the city and exam once, tap every test day on the calendar, and we create them all. Run it again for another format."
      />

      {result && (
        <div role="status" className="panel panel-pad mb-6">
          <p className="text-lg font-bold">
            {result.created} {result.created === 1 ? "date" : "dates"} added
          </p>
          {result.skipped.length > 0 && (
            <p className="text-muted mt-1">
              Already existed, so skipped:{" "}
              {result.skipped.map((d) => formatDate(d, { year: undefined })).join(", ")}.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-3">
            <Link href={portalHref("/manage/dates")} className="btn btn-dark btn-sm">
              See the dates
            </Link>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setResult(null)}
            >
              Add more
            </button>
          </div>
        </div>
      )}

      <form onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="panel panel-pad" aria-labelledby="bd-cal">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 id="bd-cal" className="text-lg font-bold">
              Pick the test days
            </h2>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setOffset((o) => Math.max(0, o - 1))}
                disabled={offset === 0}
              >
                Earlier
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setOffset((o) => o + 1)}
              >
                Later
              </button>
            </div>
          </div>
          <div className="grid gap-8 md:grid-cols-2">
            {months.map((mo) => (
              <MonthPicker
                key={`${mo.year}-${mo.month}`}
                {...mo}
                picked={picked}
                today={today}
                onToggle={toggle}
              />
            ))}
          </div>
          {errors.dates && (
            <p className="field-error mt-3" role="alert">
              {errors.dates}
            </p>
          )}
          <div className="border-mist mt-6 border-t pt-4">
            <p className="font-semibold">
              {picked.length === 0
                ? "No days chosen yet"
                : `${picked.length} ${picked.length === 1 ? "day" : "days"} chosen`}
            </p>
            {picked.length > 0 && (
              <>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {picked.map((d) => (
                    <li key={d}>
                      <button
                        type="button"
                        onClick={() => toggle(d)}
                        aria-label={`Remove ${formatDate(d)}`}
                        className="border-mist hover:border-crimson rounded-full border bg-white px-3 py-1 text-[0.875rem] font-medium"
                      >
                        {formatDate(d, { weekday: "short", year: undefined })} ×
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="mt-3 text-[0.875rem] underline"
                  onClick={() => setPicked([])}
                >
                  Clear all
                </button>
              </>
            )}
          </div>
        </section>

        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <section className="panel panel-pad">
            <h2 className="mb-4 text-lg font-bold">Same for every date</h2>
            <div className="space-y-4">
              {select(
                "provider",
                "Provider",
                provider,
                setProvider,
                m.providers.map((p) => ({ v: p.value, l: p.label })),
              )}
              {select(
                "city",
                "City",
                city,
                setCity,
                m.cities.map((c) => ({ v: String(c.id), l: c.name })),
                "Select a city",
              )}
              {select(
                "test_type",
                "Test type",
                testType,
                setTestType,
                m.test_types.map((t) => ({ v: String(t.id), l: t.name })),
                "Select a test type",
              )}
              {select(
                "format",
                "Format",
                format,
                setFormat,
                m.formats.map((x) => ({
                  v: x.value,
                  l: x.label,
                  disabled: !!type?.is_ukvi && x.value === "computer_wop",
                })),
              )}
              <div>
                <label htmlFor="bd-fee" className="field-label">
                  Fee (NPR)
                </label>
                <input
                  id="bd-fee"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  className="field-input"
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                  aria-invalid={errors.fee_npr ? true : undefined}
                />
                {errors.fee_npr && (
                  <p className="field-error" role="alert">
                    {errors.fee_npr}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="bd-seats" className="field-label">
                  Seats on each date
                </label>
                <input
                  id="bd-seats"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  className="field-input"
                  value={seats}
                  onChange={(e) => setSeats(e.target.value)}
                  aria-invalid={errors.seats_total ? true : undefined}
                />
                {errors.seats_total && (
                  <p className="field-error" role="alert">
                    {errors.seats_total}
                  </p>
                )}
              </div>
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  className="accent-crimson mt-1 h-5 w-5"
                  checked={visible}
                  onChange={(e) => setVisible(e.target.checked)}
                />
                <span className="text-[0.9375rem]">Show on the website straight away</span>
              </label>
            </div>
            <p className="text-muted mt-4 text-[0.8125rem]">
              Registration closes 6 days before each date, and results are filled in automatically.
              Days that already exist for this city, exam and format are skipped.
            </p>
          </section>

          <section className="panel panel-pad">
            {message && (
              <p role="alert" className="text-crimson mb-3 font-semibold">
                {message}
              </p>
            )}
            <button type="submit" className="btn btn-primary w-full" disabled={busy}>
              {busy
                ? "Creating…"
                : picked.length
                  ? `Create ${picked.length} ${picked.length === 1 ? "date" : "dates"}`
                  : "Create dates"}
            </button>
          </section>
        </aside>
      </form>
    </>
  );
}
