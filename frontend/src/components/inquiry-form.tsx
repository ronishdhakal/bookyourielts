"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ApiError, inquiryApi } from "@/lib/api";
import { monthOptions } from "@/lib/format";
import type { City, Inquiry, TestType } from "@/lib/types";
import { validateEmail, validatePhone } from "@/lib/validate";
import { useAuth } from "./auth-provider";
import { FormError, TextField } from "./text-field";

interface Prefill {
  city?: string;
  test_type?: string;
  test_format?: string;
  month?: string;
}

export function InquiryForm({
  cities = [],
  types = [],
  prefill = {},
  variant = "dates",
  idPrefix = "inq",
  onSent,
}: {
  cities?: City[];
  types?: TestType[];
  prefill?: Prefill;
  /** "dates" asks which date you want; "general" is a plain question. */
  variant?: "dates" | "general";
  idPrefix?: string;
  onSent?: () => void;
}) {
  const general = variant === "general";
  const { user } = useAuth();
  const [v, setV] = useState({
    name: "",
    phone: "",
    email: "",
    city: prefill.city ?? "",
    test_type: prefill.test_type ?? "",
    format: prefill.test_format ?? "",
    month: prefill.month ?? "",
    message: "",
  });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Inquiry | null>(null);
  const filled = useRef(false);
  const months = monthOptions(8);
  const set = (k: keyof typeof v) => (val: string) => setV((s) => ({ ...s, [k]: val }));

  // Fill in the student's own details once we know who they are.
  useEffect(() => {
    if (user && !filled.current) {
      filled.current = true;
      setV((s) => ({
        ...s,
        name: s.name || user.full_name,
        phone: s.phone || user.phone,
        email: s.email || user.email,
      }));
    }
  }, [user]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found: Record<string, string> = {};
    if (v.name.trim().length < 2) found.name = "Enter your name.";
    const ph = validatePhone(v.phone);
    if (ph) found.phone = ph;
    if (v.email.trim()) {
      const em = validateEmail(v.email);
      if (em) found.email = em;
    }
    if (general && v.message.trim().length < 5) found.message = "Tell us how we can help.";
    setErrs(found);
    setError(null);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      const res = await inquiryApi.create({
        name: v.name.trim(),
        phone: v.phone,
        email: v.email.trim(),
        preferred_city: v.city || null,
        test_type: v.test_type || null,
        format: v.format,
        preferred_month: v.month,
        message: v.message,
      });
      setDone(res);
      onSent?.();
    } catch (err) {
      if (err instanceof ApiError) {
        const mapped: Record<string, string> = {};
        for (const [k, msgs] of Object.entries(err.fields))
          mapped[k === "preferred_city" ? "city" : k] = msgs[0] ?? "";
        setErrs(mapped);
        setError(
          Object.keys(err.fields).length ? "Please fix the highlighted fields." : err.message,
        );
      } else setError("Something went wrong. Please try again.");
    }
    setBusy(false);
  }

  if (done) {
    return (
      <div role="status" className="border-ok bg-white-ish max-w-2xl rounded-md border-2 p-6">
        <h2 className="text-3xl font-bold">
          {general ? "Thanks, we have your message" : "Thanks, we have your inquiry"}
        </h2>
        <p className="text-muted mt-3">
          {general
            ? "Our team will reply to you soon. To hear back faster, you can message us now."
            : "We will contact you when a matching date opens. To hear back faster, you can message us now."}
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <a
            href={done.whatsapp_url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            Continue on WhatsApp
          </a>
          {general ? (
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setDone(null);
                setV((s) => ({ ...s, message: "" }));
              }}
            >
              Send another message
            </button>
          ) : (
            <Link href="/ielts-test-dates" className="btn btn-outline">
              Back to test dates
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-2xl space-y-5">
      <FormError message={error} />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Your name"
          autoComplete="name"
          value={v.name}
          onChange={set("name")}
          error={errs.name}
          required
        />
        <TextField
          label="Mobile number"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={v.phone}
          onChange={set("phone")}
          error={errs.phone}
          hint="For example 98XXXXXXXX"
          required
        />
      </div>
      <TextField
        label="Email (optional)"
        type="email"
        autoComplete="email"
        inputMode="email"
        value={v.email}
        onChange={set("email")}
        error={errs.email}
      />
      {!general && (
        <div className="grid gap-5 sm:grid-cols-2">
          <Sel
            prefix={idPrefix}
            label="Preferred city"
            value={v.city}
            onChange={set("city")}
            any="Any city"
            error={errs.city}
          >
            {cities.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </Sel>
          <Sel
            prefix={idPrefix}
            label="Test type"
            value={v.test_type}
            onChange={set("test_type")}
            any="Not sure yet"
            error={errs.test_type}
          >
            {types.map((t) => (
              <option key={t.code} value={t.code}>
                {t.name}
              </option>
            ))}
          </Sel>
          <Sel
            prefix={idPrefix}
            label="Format"
            value={v.format}
            onChange={set("format")}
            any="Any format"
            error={errs.format}
          >
            <option value="computer">Computer-delivered</option>
            <option value="computer_wop">Computer with Writing on Paper</option>
          </Sel>
          <Sel
            prefix={idPrefix}
            label="Preferred month"
            value={v.month}
            onChange={set("month")}
            any="Any month"
            error={errs.preferred_month}
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Sel>
        </div>
      )}
      <TextField
        label={general ? "How can we help?" : "Anything else we should know? (optional)"}
        required={general}
        textarea
        maxLength={1000}
        value={v.message}
        onChange={set("message")}
        error={errs.message}
      />
      <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={busy}>
        {busy ? "Sending…" : general ? "Send message" : "Send inquiry"}
      </button>
    </form>
  );
}

function Sel({
  label,
  value,
  onChange,
  any,
  error,
  children,
  prefix,
}: {
  prefix?: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  any: string;
  error?: string;
  children: React.ReactNode;
}) {
  const id = `${prefix ?? "inq"}-${label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <select
        id={id}
        className="field-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
      >
        <option value="">{any}</option>
        {children}
      </select>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
