"use client";

import { useEffect, useMemo } from "react";
import { catalogApi } from "@/lib/api";
import type { SavedCandidate, User } from "@/lib/types";
import { useLoader } from "@/lib/use-loader";
import { validateDob, validateEmail, validatePassportFile, validatePhone } from "@/lib/validate";
import { TextField } from "../text-field";

/** The details of one person taking the test. Used for bookings, saved candidates and the profile. */
export interface PersonForm {
  relation: string;
  name: string;
  phone: string;
  email: string;
  dob: string;
  province: string;
  district: string;
  municipality: string;
  passportFront: File | null;
  passportBack: File | null;
}

export const EMPTY_PERSON: PersonForm = {
  relation: "",
  name: "",
  phone: "",
  email: "",
  dob: "",
  province: "",
  district: "",
  municipality: "",
  passportFront: null,
  passportBack: null,
};

export const personFromUser = (u: User): PersonForm => ({
  ...EMPTY_PERSON,
  relation: "Myself",
  name: u.full_name,
  phone: u.phone,
  email: u.email,
  dob: u.date_of_birth ?? "",
});

export const personFromCandidate = (c: SavedCandidate): PersonForm => ({
  relation: c.relation,
  name: c.full_name,
  phone: c.phone,
  email: c.email,
  dob: c.date_of_birth ?? "",
  province: c.province,
  district: c.district,
  municipality: c.municipality,
  passportFront: null,
  passportBack: null,
});

export type PersonErrors = Partial<Record<keyof PersonForm, string>>;

export function validatePerson(p: PersonForm): PersonErrors {
  const e: PersonErrors = {};
  if (p.name.trim().length < 2)
    e.name = "Enter the full name exactly as it appears on the passport.";
  const ph = validatePhone(p.phone);
  if (ph) e.phone = ph;
  if (p.email.trim()) {
    const em = validateEmail(p.email);
    if (em) e.email = em;
  }
  const dob = validateDob(p.dob);
  if (dob) e.dob = dob;
  if (!p.province) e.province = "Choose a province.";
  if (!p.district) e.district = "Choose a district.";
  if (p.municipality.trim().length < 2) e.municipality = "Enter your city or municipality.";
  for (const [k, f] of [
    ["passportFront", p.passportFront],
    ["passportBack", p.passportBack],
  ] as const) {
    if (f) {
      const err = validatePassportFile(f);
      if (err) e[k] = err;
    }
  }
  return e;
}

/** Field names differ between the booking API and the saved-candidate API. */
export function appendPerson(form: FormData, p: PersonForm, kind: "booking" | "candidate") {
  const k = kind === "booking";
  form.set(k ? "candidate_name" : "full_name", p.name.trim());
  form.set(k ? "candidate_phone" : "phone", p.phone);
  if (p.email.trim() || !k) form.set(k ? "candidate_email" : "email", p.email.trim());
  form.set("date_of_birth", p.dob);
  form.set("province", p.province);
  form.set("district", p.district);
  form.set("municipality", p.municipality.trim());
  if (p.relation.trim() || !k) form.set("relation", p.relation.trim());
  if (p.passportFront) form.set("passport_front", p.passportFront);
  if (p.passportBack) form.set("passport_back", p.passportBack);
}

export function PersonFields({
  value,
  onChange,
  errors,
  saved,
  idPrefix = "p",
  showRelation = false,
}: {
  value: PersonForm;
  onChange: (p: PersonForm) => void;
  errors: PersonErrors;
  /** Passport already stored for this person, reused unless a new file is chosen. */
  saved?: { front: boolean; back: boolean };
  idPrefix?: string;
  showRelation?: boolean;
}) {
  const regions = useLoader("regions", () => catalogApi.regions());
  const provinces = regions.data?.provinces ?? {};
  const set = <K extends keyof PersonForm>(k: K, v: PersonForm[K]) =>
    onChange({ ...value, [k]: v });
  const today = new Date();
  const maxDob = new Date(today.getFullYear() - 14, today.getMonth(), today.getDate())
    .toISOString()
    .slice(0, 10);
  const minDob = new Date(today.getFullYear() - 100, 0, 1).toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="section-title mb-3">Personal details</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <TextField
              id={`${idPrefix}-name`}
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
            id={`${idPrefix}-phone`}
            label="Mobile number"
            type="tel"
            inputMode="tel"
            required
            value={value.phone}
            onChange={(v) => set("phone", v)}
            error={errors.phone}
          />
          <TextField
            id={`${idPrefix}-email`}
            label="Email address"
            type="email"
            inputMode="email"
            value={value.email}
            onChange={(v) => set("email", v)}
            error={errors.email}
          />
          <div>
            <label htmlFor={`${idPrefix}-dob`} className="field-label">
              Date of birth <span className="text-crimson">*</span>
            </label>
            <input
              id={`${idPrefix}-dob`}
              type="date"
              className="field-input"
              min={minDob}
              max={maxDob}
              value={value.dob}
              aria-invalid={errors.dob ? true : undefined}
              aria-describedby={errors.dob ? `${idPrefix}-dob-err` : undefined}
              onChange={(e) => set("dob", e.target.value)}
            />
            {errors.dob && (
              <p id={`${idPrefix}-dob-err`} className="field-error" role="alert">
                {errors.dob}
              </p>
            )}
          </div>
          {showRelation && (
            <TextField
              id={`${idPrefix}-relation`}
              label="Who is this?"
              value={value.relation}
              onChange={(v) => set("relation", v)}
              hint="For example Son, Sister, Client."
              maxLength={40}
            />
          )}
        </div>
      </fieldset>

      <fieldset>
        <legend className="section-title mb-3">Address</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor={`${idPrefix}-province`} className="field-label">
              Province <span className="text-crimson">*</span>
            </label>
            <select
              id={`${idPrefix}-province`}
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
            <label htmlFor={`${idPrefix}-district`} className="field-label">
              District <span className="text-crimson">*</span>
            </label>
            <select
              id={`${idPrefix}-district`}
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
            id={`${idPrefix}-city`}
            label="City / municipality"
            required
            autoComplete="address-level2"
            value={value.municipality}
            onChange={(v) => set("municipality", v)}
            error={errors.municipality}
          />
        </div>
      </fieldset>

      <fieldset>
        <legend className="section-title mb-1">Passport (optional)</legend>
        <p className="text-muted mb-3 text-[0.8125rem]">
          JPG, PNG, WebP or PDF, up to 10 MB each. Stored privately. You can also add it later from
          the booking.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <FileDrop
            id={`${idPrefix}-front`}
            label="Passport front"
            file={value.passportFront}
            onChange={(f) => set("passportFront", f)}
            error={errors.passportFront}
            savedNote={saved?.front ? "Saved passport will be used" : undefined}
          />
          <FileDrop
            id={`${idPrefix}-back`}
            label="Passport back"
            file={value.passportBack}
            onChange={(f) => set("passportBack", f)}
            error={errors.passportBack}
            savedNote={saved?.back ? "Saved passport will be used" : undefined}
          />
        </div>
      </fieldset>
    </div>
  );
}

export function FileDrop({
  id,
  label,
  file,
  onChange,
  error,
  savedNote,
}: {
  id: string;
  label: string;
  file: File | null;
  onChange: (f: File | null) => void;
  error?: string;
  savedNote?: string;
}) {
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
        className={`flex min-h-28 flex-col items-center justify-center rounded-lg border border-dashed p-3 text-center ${error ? "border-crimson" : "border-[#9aa2ad]"}`}
      >
        {file ? (
          <div className="flex w-full items-center gap-3 text-left">
            {shown ? (
              // eslint-disable-next-line @next/next/no-img-element -- local blob preview, not optimisable
              <img src={shown} alt="" className="h-14 w-14 rounded object-cover" />
            ) : (
              <span className="flex h-14 w-14 items-center justify-center rounded bg-[#e9ecef] text-xs font-semibold">
                PDF
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.9375rem] font-medium">{file.name}</span>
              <span className="text-muted block text-[0.8125rem]">
                {(file.size / 1024 / 1024).toFixed(1)} MB
              </span>
            </span>
            <button
              type="button"
              className="text-crimson text-[0.9375rem] font-semibold underline"
              onClick={() => onChange(null)}
            >
              Remove
            </button>
          </div>
        ) : (
          <>
            <label htmlFor={id} className="cursor-pointer font-semibold hover:underline">
              {label}
            </label>
            <span className="text-muted text-[0.8125rem]">
              {savedNote ?? "Choose a file or take a photo"}
            </span>
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
