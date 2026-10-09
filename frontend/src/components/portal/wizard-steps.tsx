"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { catalogApi } from "@/lib/api";
import { FORMAT_LABELS, SLOT_TIMES, formatDate, formatLong, formatNpr } from "@/lib/format";
import { siteHref } from "@/lib/portal";
import { useLoader } from "@/lib/use-loader";
import type { ProviderCode, TestFormat, TestSession, TestType } from "@/lib/types";
import { validateDob, validateEmail, validatePassportFile, validatePhone } from "@/lib/validate";
import { SeatChip } from "../seat-chip";
import { FormError, TextField } from "../text-field";
import { DateCalendar } from "./calendar";
import { PROVIDERS, type DetailsForm, type Prefs } from "./wizard-types";

export function StepHeading({ title, lede }: { title: string; lede?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold md:text-3xl">{title}</h2>
      {lede && <p className="text-muted mt-1.5 max-w-xl">{lede}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ 1. provider */
export function ProviderStep({
  value,
  onChange,
}: {
  value: Prefs["provider"];
  onChange: (p: ProviderCode) => void;
}) {
  const counts = useLoader("counts", async (signal) => {
    const [bc, idp] = await Promise.all(
      PROVIDERS.map((p) =>
        catalogApi.sessions({ provider: p.code, hide_closed: "true", page_size: "1" }, signal),
      ),
    );
    return { british_council: bc?.count ?? 0, idp: idp?.count ?? 0 } as Record<
      ProviderCode,
      number
    >;
  });
  return (
    <section>
      <StepHeading
        title="Choose your exam provider"
        lede="Select who runs the IELTS session you want to sit."
      />
      <div role="radiogroup" aria-label="Exam provider" className="grid gap-4 sm:grid-cols-2">
        {PROVIDERS.map((p) => {
          const n = counts.data?.[p.code];
          return (
            <label key={p.code} className="choice" data-selected={value === p.code}>
              <input
                type="radio"
                name="provider"
                className="sr-only"
                checked={value === p.code}
                onChange={() => onChange(p.code)}
              />
              <span className="font-display block text-2xl font-bold">{p.label}</span>
              <span className="text-muted mt-1 block text-[0.9375rem]">{p.blurb}</span>
              <span className="mt-4 block font-mono text-sm">
                {counts.loading ? (
                  <span className="skeleton-light inline-block h-4 w-24 rounded" />
                ) : (
                  `${n ?? 0} open ${n === 1 ? "date" : "dates"}`
                )}
              </span>
            </label>
          );
        })}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ 2. preferences */
export function PrefsStep({
  prefs,
  onChange,
  types,
}: {
  prefs: Prefs;
  onChange: (p: Prefs) => void;
  types: TestType[];
}) {
  const typeOptions = types.filter((t) => t.is_ukvi === (prefs.category === "ukvi"));
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
    const map = new Map<
      string,
      { slug: string; name: string; dates: Set<string>; first: string }
    >();
    for (const s of res.results.filter((x) => x.is_bookable)) {
      const c = map.get(s.city.slug) ?? {
        slug: s.city.slug,
        name: s.city.name,
        dates: new Set<string>(),
        first: s.date,
      };
      c.dates.add(s.date);
      if (s.date < c.first) c.first = s.date;
      map.set(s.city.slug, c);
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  });

  const set = (patch: Partial<Prefs>) => onChange({ ...prefs, ...patch });
  const ukvi = prefs.category === "ukvi";

  return (
    <section>
      <StepHeading
        title="Exam preferences"
        lede="Tell us which test you need. Only cities with open dates for your choice are shown."
      />

      <fieldset className="mb-7">
        <legend className="field-label">Exam category</legend>
        <div className="grid max-w-xl gap-3 sm:grid-cols-2">
          {(
            [
              ["regular", "Regular", "Academic or General Training"],
              ["ukvi", "UKVI", "For UK visa and immigration, including Life Skills"],
            ] as const
          ).map(([v, label, hint]) => (
            <label key={v} className="choice" data-selected={prefs.category === v}>
              <input
                type="radio"
                name="category"
                className="sr-only"
                checked={prefs.category === v}
                onChange={() => set({ category: v, testType: "", format: "", city: "" })}
              />
              <span className="block font-semibold">{label}</span>
              <span className="text-muted block text-[0.875rem]">{hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mb-7 grid max-w-2xl gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="pf-type" className="field-label">
            Test type
          </label>
          <select
            id="pf-type"
            className="field-input"
            value={prefs.testType}
            onChange={(e) => set({ testType: e.target.value, city: "" })}
          >
            <option value="">Select a test type</option>
            {typeOptions.map((t) => (
              <option key={t.code} value={t.code}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="pf-format" className="field-label">
            Format
          </label>
          <select
            id="pf-format"
            className="field-input"
            value={prefs.format}
            onChange={(e) => set({ format: e.target.value as TestFormat, city: "" })}
          >
            <option value="">Select a format</option>
            <option value="computer">{FORMAT_LABELS.computer}</option>
            <option value="computer_wop" disabled={ukvi}>
              {FORMAT_LABELS.computer_wop}
              {ukvi ? " (not available for UKVI)" : ""}
            </option>
          </select>
        </div>
      </div>

      {ready && (
        <fieldset aria-busy={avail.loading}>
          <legend className="field-label">City</legend>
          {avail.loading ? (
            <div className="grid gap-3 sm:grid-cols-3" aria-label="Loading cities">
              {[0, 1, 2].map((i) => (
                <div key={i} className="skeleton-light h-20 rounded-lg" />
              ))}
            </div>
          ) : !!avail.error ? (
            <FormError message="We could not load the cities. Please try again." />
          ) : avail.data && avail.data.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {avail.data.map((c) => (
                <label key={c.slug} className="choice" data-selected={prefs.city === c.slug}>
                  <input
                    type="radio"
                    name="city"
                    className="sr-only"
                    checked={prefs.city === c.slug}
                    onChange={() => set({ city: c.slug })}
                  />
                  <span className="block text-lg font-bold">{c.name}</span>
                  <span className="text-muted block font-mono text-[0.8125rem]">
                    {c.dates.size} {c.dates.size === 1 ? "date" : "dates"} · from{" "}
                    {formatDate(c.first, { year: undefined })}
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <div className="border-mist rounded-lg border-2 border-dashed p-6">
              <p className="font-semibold">No open dates for this combination yet.</p>
              <p className="text-muted mt-1">
                Dates are released in batches. Try another format, or tell us what you need.
              </p>
              <a
                href={siteHref(`/inquire?test_type=${prefs.testType}&test_format=${prefs.format}`)}
                className="btn btn-outline btn-sm mt-4"
              >
                Inquire about upcoming dates
              </a>
            </div>
          )}
        </fieldset>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ 3. date */
export function DateStep({
  prefs,
  session,
  onPick,
}: {
  prefs: Prefs;
  session: TestSession | null;
  onPick: (s: TestSession) => void;
}) {
  const todayMonth = new Date().toISOString().slice(0, 7);
  // Open on the month of the earliest open date unless the student already moved around.
  const earliest = useLoader(
    `earliest|${prefs.provider}|${prefs.testType}|${prefs.format}|${prefs.city}`,
    async (signal) => {
      const res = await catalogApi.sessions(
        {
          provider: prefs.provider,
          test_type: prefs.testType,
          test_format: prefs.format,
          city: prefs.city,
          hide_closed: "true",
          page_size: "1",
        },
        signal,
      );
      return res.results[0]?.date.slice(0, 7) ?? null;
    },
  );
  const [override, setOverride] = useState<string | null>(session?.date.slice(0, 7) ?? null);
  const month = override ?? earliest.data ?? todayMonth;
  const setMonth = setOverride;
  const [date, setDate] = useState<string | null>(session?.date ?? null);
  const key = `${prefs.provider}|${prefs.testType}|${prefs.format}|${prefs.city}|${month}`;
  const list = useLoader(key, async (signal) => {
    const res = await catalogApi.sessions(
      {
        provider: prefs.provider,
        test_type: prefs.testType,
        test_format: prefs.format,
        city: prefs.city,
        month,
        hide_closed: "true",
        page_size: "100",
      },
      signal,
    );
    return res.results;
  });
  const sessions = useMemo(() => list.data ?? [], [list.data]);
  const onDate = sessions.filter((s) => s.date === date);

  return (
    <section>
      <StepHeading
        title="Pick your test date"
        lede="Dark days have seats. Choose a day, then pick the session that suits you."
      />
      <div className="grid max-w-xl gap-6">
        <DateCalendar
          month={month}
          sessions={sessions}
          selected={date}
          onSelect={setDate}
          onMonthChange={(m) => {
            setMonth(m);
            setDate(null);
          }}
          minMonth={todayMonth}
          loading={list.loading}
        />
        <div aria-live="polite">
          {!!list.error && <FormError message="We could not load the dates. Please try again." />}
          {!date ? (
            <div className="border-mist text-muted flex h-full min-h-40 items-center justify-center rounded-lg border-2 border-dashed p-6 text-center">
              {sessions.length === 0 && !list.loading
                ? "No dates with seats this month. Try the next month."
                : "Select a day on the calendar to see its sessions."}
            </div>
          ) : (
            <div>
              <h3 className="font-display text-xl font-bold">{formatLong(date)}</h3>
              <p className="text-muted mb-3 text-[0.9375rem]">
                {onDate.length} {onDate.length === 1 ? "session" : "sessions"} available
              </p>
              <div role="radiogroup" aria-label="Session" className="space-y-3">
                {onDate.map((s) => (
                  <label key={s.id} className="choice" data-selected={session?.id === s.id}>
                    <input
                      type="radio"
                      name="session"
                      className="sr-only"
                      checked={session?.id === s.id}
                      onChange={() => onPick(s)}
                    />
                    <span className="flex flex-wrap items-start justify-between gap-3">
                      <span>
                        <span className="block text-lg font-bold">
                          {s.slot === "morning" ? "Morning" : "Afternoon"}{" "}
                          <span className="text-muted font-mono text-sm font-normal">
                            {SLOT_TIMES[s.slot]}
                          </span>
                        </span>
                        <span className="text-muted block text-[0.9375rem]">
                          {s.venue?.name ?? s.city.name}
                          {s.venue?.address ? `, ${s.venue.address}` : ""}
                        </span>
                      </span>
                      <SeatChip
                        tone="light"
                        status={s.seat_status}
                        label={s.seat_status === "few_left" ? `${s.seats_left} left` : undefined}
                      />
                    </span>
                    <span className="mt-3 flex flex-wrap gap-x-6 gap-y-1 font-mono text-[0.8125rem]">
                      <span>{formatNpr(s.fee_npr)}</span>
                      <span className="text-muted">
                        Register by {formatDate(s.registration_closes_on, { year: undefined })}
                      </span>
                      <span className="text-muted">
                        Results from {formatDate(s.results_date, { year: undefined })}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ 4. details */
export type DetailErrors = Partial<Record<keyof DetailsForm | "form", string>>;

export function validateDetails(d: DetailsForm): DetailErrors {
  const e: DetailErrors = {};
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
  value,
  onChange,
  errors,
}: {
  value: DetailsForm;
  onChange: (d: DetailsForm) => void;
  errors: DetailErrors;
}) {
  const regions = useLoader("regions", () => catalogApi.regions());
  const provinces = regions.data?.provinces ?? {};
  const set = <K extends keyof DetailsForm>(k: K, v: DetailsForm[K]) =>
    onChange({ ...value, [k]: v });
  const today = new Date();
  const maxDob = new Date(today.getFullYear() - 14, today.getMonth(), today.getDate())
    .toISOString()
    .slice(0, 10);
  const minDob = new Date(today.getFullYear() - 100, 0, 1).toISOString().slice(0, 10);

  return (
    <section>
      <StepHeading
        title="Candidate details"
        lede="These are used for the registration, so they must match the passport the candidate will carry on test day."
      />

      <fieldset className="mb-7">
        <legend className="field-label">Who is taking the test?</legend>
        <div className="flex flex-wrap gap-3">
          {(
            [
              ["self", "Myself"],
              ["other", "Someone else"],
            ] as const
          ).map(([v, label]) => (
            <label key={v} className="choice !py-2.5" data-selected={value.examinee === v}>
              <input
                type="radio"
                name="examinee"
                className="sr-only"
                checked={value.examinee === v}
                onChange={() => set("examinee", v)}
              />
              <span className="font-semibold">{label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <h3 className="section-title mb-3">PERSONAL DETAILS</h3>
      <div className="mb-8 grid max-w-3xl gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <TextField
            label="Full name"
            autoComplete="name"
            required
            value={value.name}
            onChange={(v) => set("name", v)}
            error={errors.name}
            hint="As printed on the passport."
          />
        </div>
        <TextField
          label="Mobile number"
          type="tel"
          inputMode="tel"
          required
          value={value.phone}
          onChange={(v) => set("phone", v)}
          error={errors.phone}
          hint="For example 98XXXXXXXX"
        />
        <TextField
          label="Email address (optional)"
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

      <h3 className="section-title mb-3">ADDRESS</h3>
      <div className="mb-8 grid max-w-3xl gap-5 sm:grid-cols-3">
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

      <h3 className="section-title mb-1">PASSPORT (OPTIONAL NOW)</h3>
      <p className="text-muted mb-3 max-w-xl text-[0.9375rem]">
        A clear photo or scan of the passport photo page speeds up registration. You can also hand
        it to our team later. JPG, PNG, WebP or PDF, up to 10 MB each. Stored privately and only
        seen by our team.
      </p>
      <div className="mb-8 grid max-w-3xl gap-4 sm:grid-cols-2">
        <FileDrop
          label="Passport front (photo page)"
          file={value.passportFront}
          onChange={(f) => set("passportFront", f)}
          error={errors.passportFront}
        />
        <FileDrop
          label="Passport back (address page)"
          file={value.passportBack}
          onChange={(f) => set("passportBack", f)}
          error={errors.passportBack}
        />
      </div>

      <label className="flex max-w-2xl cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          className="accent-crimson mt-1 h-5 w-5 shrink-0"
          checked={value.confirmed}
          onChange={(e) => set("confirmed", e.target.checked)}
          aria-describedby={errors.confirmed ? "confirmed-err" : undefined}
        />
        <span>I confirm these details match the passport the candidate will use on test day.</span>
      </label>
      {errors.confirmed && (
        <p id="confirmed-err" className="field-error" role="alert">
          {errors.confirmed}
        </p>
      )}
    </section>
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
      <p className="field-label">{label}</p>
      <div
        className={`flex min-h-36 flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 text-center ${error ? "border-crimson" : "border-[#8a9a95]"}`}
      >
        {file ? (
          <div className="flex w-full items-center gap-3 text-left">
            {shown ? (
              // eslint-disable-next-line @next/next/no-img-element -- local blob preview, not optimisable
              <img src={shown} alt="" className="h-16 w-16 rounded object-cover" />
            ) : (
              <span className="bg-mist flex h-16 w-16 items-center justify-center rounded font-mono text-xs">
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
            <label htmlFor={id} className="btn btn-outline btn-sm cursor-pointer">
              Choose file
            </label>
            <span className="text-muted mt-2 text-[0.8125rem]">or take a photo on your phone</span>
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

/* ------------------------------------------------------------------ 5. review */
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
  const block = (title: string, step: number, rows: [string, string][]) => (
    <div className="panel panel-pad">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="section-title">{title}</h3>
        <button
          type="button"
          className="text-crimson font-semibold underline underline-offset-4"
          onClick={() => onEdit(step)}
        >
          Edit
        </button>
      </div>
      <dl className="divide-mist divide-y">
        {rows.map(([k, v]) => (
          <div key={k} className="grid gap-1 py-2 sm:grid-cols-[10rem_1fr]">
            <dt className="text-muted">{k}</dt>
            <dd className="font-semibold break-words">{v || "Not provided"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );

  return (
    <section>
      <StepHeading
        title="Review and confirm"
        lede="Check every detail. You can go back and edit any section."
      />
      <div className="space-y-4">
        {block("EXAM", 1, [
          ["Provider", providerLabel],
          ["Test", `${typeName}${prefs.category === "ukvi" ? " (UKVI)" : ""}`],
          ["Format", FORMAT_LABELS[session.format]],
          ["City", session.city.name],
        ])}
        {block("DATE", 2, [
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
        {block("CANDIDATE", 3, [
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
      </div>

      <div className="border-marigold bg-white-ish mt-6 rounded-lg border-l-4 px-5 py-4">
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
    </section>
  );
}
