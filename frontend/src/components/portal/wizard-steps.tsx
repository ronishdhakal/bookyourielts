"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { catalogApi } from "@/lib/api";
import { FORMAT_LABELS, SLOT_TIMES, formatDate, formatLong, formatNpr } from "@/lib/format";
import { siteHref } from "@/lib/portal";
import type { TestSession, TestType } from "@/lib/types";
import { useLoader } from "@/lib/use-loader";
import { validateDob, validateEmail, validatePassportFile, validatePhone } from "@/lib/validate";
import { SeatChip } from "../seat-chip";
import { FormError, TextField } from "../text-field";
import { DatePicker } from "./date-picker";
import type { DetailsForm, Prefs } from "./wizard-types";

/** One labelled row of a booking form: the label sits on the left on wide screens. */
export function FormRow({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="form-row">
      <div>
        <p className="form-row-label">{label}</p>
        {hint && <p className="text-muted mt-1 text-[0.8125rem]">{hint}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function Select({
  id,
  label,
  value,
  onChange,
  placeholder,
  disabled,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <select
        id={id}
        className="field-input"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{placeholder}</option>
        {children}
      </select>
    </div>
  );
}

function Radios<T extends string>({
  name,
  value,
  onChange,
  options,
}: {
  name: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div role="radiogroup" className="flex flex-wrap gap-x-8 gap-y-2 pt-1.5">
      {options.map((o) => (
        <label key={o.value} className="flex min-h-9 cursor-pointer items-center gap-2.5">
          <input
            type="radio"
            name={name}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
            className="accent-crimson h-5 w-5"
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ 1. preferences */
export function PrefsStep({
  prefs,
  onChange,
  examinee,
  onExaminee,
  types,
}: {
  prefs: Prefs;
  onChange: (p: Prefs) => void;
  examinee: DetailsForm["examinee"];
  onExaminee: (e: DetailsForm["examinee"]) => void;
  types: TestType[];
}) {
  const ukvi = prefs.category === "ukvi";
  const typeOptions = types.filter((t) => t.is_ukvi === ukvi);
  const ready = prefs.provider && prefs.testType && prefs.format;
  const key = ready
    ? `${prefs.provider}|${prefs.category}|${prefs.testType}|${prefs.format}`
    : null;
  const avail = useLoader(key, async (signal) => {
    const res = await catalogApi.sessions(
      {
        provider: prefs.provider,
        category: prefs.category,
        test_type: prefs.testType,
        test_format: prefs.format,
        hide_closed: "true",
        page_size: "100",
      },
      signal,
    );
    const map = new Map<string, { slug: string; name: string; dates: Set<string> }>();
    for (const s of res.results.filter((x) => x.is_bookable)) {
      const c = map.get(s.city.slug) ?? {
        slug: s.city.slug,
        name: s.city.name,
        dates: new Set<string>(),
      };
      c.dates.add(s.date);
      map.set(s.city.slug, c);
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  });
  const set = (patch: Partial<Prefs>) => onChange({ ...prefs, ...patch });

  return (
    <div>
      <FormRow label="IELTS exam">
        <Radios
          name="category"
          value={prefs.category}
          onChange={(category) => set({ category, testType: "", format: "", city: "" })}
          options={[
            { value: "regular", label: "Regular" },
            { value: "ukvi", label: "UKVI" },
          ]}
        />
      </FormRow>

      <FormRow label="Exam preference">
        <div className="grid max-w-3xl gap-5 sm:grid-cols-2">
          <Select
            id="pf-type"
            label="Type"
            value={prefs.testType}
            onChange={(testType) => set({ testType, city: "" })}
            placeholder="Select"
          >
            {typeOptions.map((t) => (
              <option key={t.code} value={t.code}>
                {t.name.replace("IELTS ", "").replace("UKVI ", "")}
              </option>
            ))}
          </Select>
          <Select
            id="pf-format"
            label="Format"
            value={prefs.format}
            onChange={(format) => set({ format: format as Prefs["format"], city: "" })}
            placeholder="Select"
          >
            <option value="computer">{FORMAT_LABELS.computer}</option>
            <option value="computer_wop" disabled={ukvi}>
              {FORMAT_LABELS.computer_wop}
              {ukvi ? " (not for UKVI)" : ""}
            </option>
          </Select>
          <Select
            id="pf-city"
            label="City"
            value={prefs.city}
            onChange={(city) => set({ city })}
            placeholder={
              !ready ? "Choose type and format first" : avail.loading ? "Checking dates…" : "Select"
            }
            disabled={!ready || avail.loading}
          >
            {avail.data?.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name} ({c.dates.size} {c.dates.size === 1 ? "date" : "dates"})
              </option>
            ))}
          </Select>
        </div>
        {!!avail.error && (
          <div className="mt-4 max-w-3xl">
            <FormError message="We could not load the cities. Please try again." />
          </div>
        )}
        {ready && !avail.loading && avail.data?.length === 0 && (
          <div className="border-mist mt-4 max-w-3xl rounded-lg border bg-[#f7f8fa] p-4">
            <p className="font-semibold">No open dates for this combination yet.</p>
            <p className="text-muted text-[0.9375rem]">
              Dates are released in batches. Try another format, or tell us what you need.
            </p>
            <a
              href={siteHref(`/inquire?test_type=${prefs.testType}&test_format=${prefs.format}`)}
              className="text-crimson mt-1 inline-block font-semibold underline underline-offset-4"
            >
              Inquire about upcoming dates
            </a>
          </div>
        )}
      </FormRow>

      <FormRow label="Examinee">
        <div className="max-w-sm">
          <Select
            id="pf-examinee"
            label="Select examinee"
            value={examinee}
            onChange={(v) => onExaminee(v as DetailsForm["examinee"])}
            placeholder="Select"
          >
            <option value="self">Myself</option>
            <option value="other">Someone else</option>
          </Select>
        </div>
      </FormRow>
    </div>
  );
}

/* ------------------------------------------------------------------ 2. details */
export type DetailErrors = Partial<Record<keyof DetailsForm | "session", string>>;

export function validateDetails(d: DetailsForm, session: TestSession | null): DetailErrors {
  const e: DetailErrors = {};
  if (!session) e.session = "Pick a test date.";
  if (d.name.trim().length < 2)
    e.name = "Enter the full name exactly as it appears on the passport.";
  const ph = validatePhone(d.phone);
  if (ph) e.phone = ph;
  if (d.email.trim()) {
    const em = validateEmail(d.email);
    if (em) e.email = em;
  }
  const dob = validateDob(d.dob);
  if (dob) e.dob = dob;
  if (!d.province) e.province = "Choose a province.";
  if (!d.district) e.district = "Choose a district.";
  if (d.municipality.trim().length < 2) e.municipality = "Enter your city or municipality.";
  for (const [k, f] of [
    ["passportFront", d.passportFront],
    ["passportBack", d.passportBack],
  ] as const) {
    if (f) {
      const err = validatePassportFile(f);
      if (err) e[k] = err;
    }
  }
  if (!d.confirmed) e.confirmed = "Please confirm that the details match the passport.";
  return e;
}

export function DetailsStep({
  prefs,
  session,
  onPick,
  value,
  onChange,
  errors,
}: {
  prefs: Prefs;
  session: TestSession | null;
  onPick: (s: TestSession | null) => void;
  value: DetailsForm;
  onChange: (d: DetailsForm) => void;
  errors: DetailErrors;
}) {
  const todayMonth = new Date().toISOString().slice(0, 7);
  const base = {
    provider: prefs.provider,
    test_type: prefs.testType,
    test_format: prefs.format,
    city: prefs.city,
    hide_closed: "true",
  };
  // Open on the month of the earliest open date unless the student already moved around.
  const earliest = useLoader(
    `earliest|${prefs.provider}|${prefs.testType}|${prefs.format}|${prefs.city}`,
    async (signal) => {
      const res = await catalogApi.sessions({ ...base, page_size: "1" }, signal);
      return res.results[0]?.date.slice(0, 7) ?? null;
    },
  );
  const [override, setOverride] = useState<string | null>(session?.date.slice(0, 7) ?? null);
  const month = override ?? earliest.data ?? todayMonth;
  const list = useLoader(
    `dates|${prefs.provider}|${prefs.testType}|${prefs.format}|${prefs.city}|${month}`,
    async (signal) => {
      const res = await catalogApi.sessions({ ...base, month, page_size: "100" }, signal);
      return res.results.filter((s) => s.is_bookable);
    },
  );
  const sessions = useMemo(() => list.data ?? [], [list.data]);
  const available = useMemo(() => new Set(sessions.map((s) => s.date)), [sessions]);
  const [date, setDate] = useState(session?.date ?? "");
  const onDay = sessions.filter((s) => s.date === date);

  const regions = useLoader("regions", () => catalogApi.regions());
  const provinces = regions.data?.provinces ?? {};
  const set = <K extends keyof DetailsForm>(k: K, v: DetailsForm[K]) =>
    onChange({ ...value, [k]: v });
  const today = new Date();
  const maxDob = new Date(today.getFullYear() - 14, today.getMonth(), today.getDate())
    .toISOString()
    .slice(0, 10);
  const minDob = new Date(today.getFullYear() - 100, 0, 1).toISOString().slice(0, 10);

  function pickDate(d: string) {
    setDate(d);
    const day = sessions.filter((s) => s.date === d);
    onPick(day.length === 1 ? (day[0] ?? null) : null);
  }

  return (
    <div>
      <FormRow label="Preferred date">
        <div className="max-w-3xl">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="pd-date" className="field-label">
                Pick a date
              </label>
              <DatePicker
                id="pd-date"
                value={date}
                onChange={pickDate}
                month={month}
                onMonthChange={setOverride}
                available={available}
                minMonth={todayMonth}
                loading={list.loading || list.refreshing}
                invalid={!!errors.session && !session}
                describedBy={errors.session ? "pd-err" : undefined}
              />
            </div>
            {onDay.length > 1 && (
              <Select
                id="pd-session"
                label="Session"
                value={session ? String(session.id) : ""}
                onChange={(v) => onPick(onDay.find((s) => String(s.id) === v) ?? null)}
                placeholder="Select a session"
              >
                {onDay.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.slot === "morning" ? "Morning" : "Afternoon"} · {SLOT_TIMES[s.slot]}
                  </option>
                ))}
              </Select>
            )}
          </div>
          {errors.session && (
            <p id="pd-err" className="field-error" role="alert">
              {errors.session}
            </p>
          )}
          {session && (
            <dl className="mt-4 grid max-w-2xl gap-x-8 gap-y-2 rounded-lg bg-[#f7f8fa] p-4 text-[0.9375rem] sm:grid-cols-2">
              <div>
                <dt className="text-muted text-[0.8125rem]">Session</dt>
                <dd className="font-semibold">
                  {session.slot === "morning" ? "Morning" : "Afternoon"} ·{" "}
                  {SLOT_TIMES[session.slot]}
                </dd>
              </div>
              <div>
                <dt className="text-muted text-[0.8125rem]">Fee</dt>
                <dd className="font-semibold">{formatNpr(session.fee_npr)}</dd>
              </div>
              <div>
                <dt className="text-muted text-[0.8125rem]">Venue</dt>
                <dd>{session.venue?.name ?? session.city.name}</dd>
              </div>
              <div>
                <dt className="text-muted text-[0.8125rem]">Seats</dt>
                <dd>
                  <SeatChip
                    status={session.seat_status}
                    label={
                      session.seat_status === "few_left" ? `${session.seats_left} left` : undefined
                    }
                  />
                </dd>
              </div>
              <div>
                <dt className="text-muted text-[0.8125rem]">Register by</dt>
                <dd>{formatDate(session.registration_closes_on)}</dd>
              </div>
              <div>
                <dt className="text-muted text-[0.8125rem]">Results from</dt>
                <dd>{formatDate(session.results_date)}</dd>
              </div>
            </dl>
          )}
          {!!list.error && (
            <div className="mt-3">
              <FormError message="We could not load the dates. Please try again." />
            </div>
          )}
        </div>
      </FormRow>

      <FormRow label="Personal detail" hint="As printed on the passport.">
        <div className="grid max-w-5xl gap-5 md:grid-cols-3">
          <TextField
            label="Full name"
            autoComplete="name"
            required
            value={value.name}
            onChange={(v) => set("name", v)}
            error={errors.name}
          />
          <TextField
            label="Mobile number"
            type="tel"
            inputMode="tel"
            required
            value={value.phone}
            onChange={(v) => set("phone", v)}
            error={errors.phone}
          />
          <TextField
            label="Email address"
            type="email"
            inputMode="email"
            value={value.email}
            onChange={(v) => set("email", v)}
            error={errors.email}
          />
          <div>
            <label htmlFor="dob" className="field-label">
              Date of birth <span className="text-crimson">*</span>
            </label>
            <input
              id="dob"
              type="date"
              className="field-input"
              min={minDob}
              max={maxDob}
              value={value.dob}
              aria-invalid={errors.dob ? true : undefined}
              aria-describedby={errors.dob ? "dob-err" : undefined}
              onChange={(e) => set("dob", e.target.value)}
            />
            {errors.dob && (
              <p id="dob-err" className="field-error" role="alert">
                {errors.dob}
              </p>
            )}
          </div>
        </div>
      </FormRow>

      <FormRow label="Address detail">
        <div className="grid max-w-5xl gap-5 md:grid-cols-3">
          <div>
            <label htmlFor="province" className="field-label">
              Province <span className="text-crimson">*</span>
            </label>
            <select
              id="province"
              className="field-input"
              value={value.province}
              aria-invalid={errors.province ? true : undefined}
              onChange={(e) => onChange({ ...value, province: e.target.value, district: "" })}
            >
              <option value="">Select</option>
              {Object.keys(provinces).map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
            {errors.province && (
              <p className="field-error" role="alert">
                {errors.province}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="district" className="field-label">
              District <span className="text-crimson">*</span>
            </label>
            <select
              id="district"
              className="field-input"
              value={value.district}
              disabled={!value.province}
              aria-invalid={errors.district ? true : undefined}
              onChange={(e) => set("district", e.target.value)}
            >
              <option value="">{value.province ? "Select" : "Choose a province first"}</option>
              {(provinces[value.province] ?? []).map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
            {errors.district && (
              <p className="field-error" role="alert">
                {errors.district}
              </p>
            )}
          </div>
          <TextField
            label="City / municipality"
            required
            autoComplete="address-level2"
            value={value.municipality}
            onChange={(v) => set("municipality", v)}
            error={errors.municipality}
          />
        </div>
      </FormRow>

      <FormRow
        label="Document detail"
        hint="Optional now. JPG, PNG, WebP or PDF, up to 10 MB each. Stored privately."
      >
        <div className="grid max-w-4xl gap-5 sm:grid-cols-2">
          <FileDrop
            label="Upload passport (front)"
            file={value.passportFront}
            onChange={(f) => set("passportFront", f)}
            error={errors.passportFront}
          />
          <FileDrop
            label="Upload passport (back)"
            file={value.passportBack}
            onChange={(f) => set("passportBack", f)}
            error={errors.passportBack}
          />
        </div>
      </FormRow>

      <div className="border-mist border-t pt-5">
        <label className="flex max-w-2xl cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="accent-crimson mt-1 h-5 w-5 shrink-0"
            checked={value.confirmed}
            onChange={(e) => set("confirmed", e.target.checked)}
            aria-describedby={errors.confirmed ? "confirmed-err" : undefined}
          />
          <span>
            I confirm these details match the passport the candidate will use on test day.
          </span>
        </label>
        {errors.confirmed && (
          <p id="confirmed-err" className="field-error" role="alert">
            {errors.confirmed}
          </p>
        )}
      </div>
    </div>
  );
}

function FileDrop({
  label,
  file,
  onChange,
  error,
}: {
  label: string;
  file: File | null;
  onChange: (f: File | null) => void;
  error?: string;
}) {
  const id = useMemo(() => `file-${label.replace(/\W+/g, "-").toLowerCase()}`, [label]);
  const shown = useMemo(
    () => (file && file.type.startsWith("image/") ? URL.createObjectURL(file) : null),
    [file],
  );
  useEffect(() => {
    return () => {
      if (shown) URL.revokeObjectURL(shown);
    };
  }, [shown]);

  return (
    <div>
      <div
        className={`flex min-h-36 flex-col items-center justify-center rounded-lg border border-dashed p-4 text-center ${error ? "border-crimson" : "border-[#9aa2ad]"}`}
      >
        {file ? (
          <div className="flex w-full items-center gap-3 text-left">
            {shown ? (
              // eslint-disable-next-line @next/next/no-img-element -- local blob preview, not optimisable
              <img src={shown} alt="" className="h-16 w-16 rounded object-cover" />
            ) : (
              <span className="flex h-16 w-16 items-center justify-center rounded bg-[#e9ecef] text-xs font-semibold">
                PDF
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{file.name}</span>
              <span className="text-muted block text-[0.8125rem]">
                {(file.size / 1024 / 1024).toFixed(1)} MB
              </span>
            </span>
            <button
              type="button"
              className="text-crimson font-semibold underline"
              onClick={() => onChange(null)}
            >
              Remove
            </button>
          </div>
        ) : (
          <>
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
              className="text-muted"
            >
              <path d="M7 18a4 4 0 01-.5-7.97A5.5 5.5 0 0117 8.5a4.5 4.5 0 01.5 9.5M12 12v8m0-8l-3 3m3-3l3 3" />
            </svg>
            <label htmlFor={id} className="mt-2 cursor-pointer font-semibold hover:underline">
              {label}
            </label>
            <span className="text-muted text-[0.8125rem]">Max file size 10 MB</span>
          </>
        )}
        <input
          id={id}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="sr-only"
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
          aria-describedby={error ? `${id}-err` : undefined}
        />
      </div>
      {error && (
        <p id={`${id}-err`} className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ 3. review */
export function ReviewStep({
  prefs,
  session,
  details,
  providerLabel,
  typeName,
  agreed,
  onAgree,
  onEdit,
  error,
}: {
  prefs: Prefs;
  session: TestSession;
  details: DetailsForm;
  providerLabel: string;
  typeName: string;
  agreed: boolean;
  onAgree: (v: boolean) => void;
  onEdit: (step: number) => void;
  error: string | null;
}) {
  const rows = (items: [string, string][]) => (
    <dl className="grid max-w-3xl gap-x-8 gap-y-3 sm:grid-cols-2">
      {items.map(([k, v]) => (
        <div key={k}>
          <dt className="text-muted text-[0.8125rem]">{k}</dt>
          <dd className="font-semibold break-words">
            {v || <span className="text-muted font-normal">Not provided</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
  const edit = (step: number) => (
    <button
      type="button"
      className="text-crimson mt-3 text-[0.9375rem] font-semibold underline underline-offset-4"
      onClick={() => onEdit(step)}
    >
      Edit
    </button>
  );

  return (
    <div>
      <FormRow label="Exam">
        {rows([
          ["Provider", providerLabel],
          ["Test", `${typeName}${prefs.category === "ukvi" ? " (UKVI)" : ""}`],
          ["Format", FORMAT_LABELS[session.format]],
          ["City", session.city.name],
        ])}
        {edit(0)}
      </FormRow>
      <FormRow label="Test date">
        {rows([
          ["Test day", `${formatLong(session.date)}, ${session.date.slice(0, 4)}`],
          [
            "Session",
            `${session.slot === "morning" ? "Morning" : "Afternoon"}, ${SLOT_TIMES[session.slot]}`,
          ],
          [
            "Venue",
            session.venue
              ? `${session.venue.name}${session.venue.address ? `, ${session.venue.address}` : ""}`
              : session.city.name,
          ],
          ["Fee", formatNpr(session.fee_npr)],
        ])}
        {edit(1)}
      </FormRow>
      <FormRow label="Candidate">
        {rows([
          ["Taking the test", details.examinee === "self" ? "Myself" : "Someone else"],
          ["Full name", details.name],
          ["Mobile", details.phone],
          ["Email", details.email],
          ["Date of birth", details.dob ? formatDate(details.dob) : ""],
          [
            "Address",
            [details.municipality, details.district, details.province].filter(Boolean).join(", "),
          ],
          [
            "Passport",
            details.passportFront
              ? `Front${details.passportBack ? " and back" : ""} attached`
              : "Not attached",
          ],
        ])}
        {edit(1)}
      </FormRow>

      <div className="border-mist border-t pt-6">
        <div className="border-crimson max-w-3xl rounded-lg border-l-4 bg-[#f7f8fa] px-5 py-4">
          <p className="font-semibold">What happens when you confirm</p>
          <ol className="text-muted mt-1 list-decimal space-y-1 pl-5 text-[0.9375rem]">
            <li>We save your booking request and give it a reference number.</li>
            <li>You are taken to WhatsApp with a ready-to-send message for our team.</li>
            <li>
              Our team confirms the seat in the chat and explains payment. Nothing is paid on this
              website.
            </li>
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
            <Link href={siteHref("/terms")} className="text-crimson underline" target="_blank">
              terms
            </Link>{" "}
            and{" "}
            <Link href={siteHref("/privacy")} className="text-crimson underline" target="_blank">
              privacy policy
            </Link>
            .
          </span>
        </label>
        <div className="mt-4">
          <FormError message={error} />
        </div>
      </div>
    </div>
  );
}
