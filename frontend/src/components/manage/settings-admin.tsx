"use client";

import { useState } from "react";
import { ApiError, manageApi } from "@/lib/api";
import type { StaffSettings } from "@/lib/types";
import { useLoader } from "@/lib/use-loader";
import { TextField } from "../text-field";
import { ErrorNote, PageTitle, SkeletonRows } from "./ui";

export function SettingsAdmin() {
  const load = useLoader("settings", () => manageApi.settings());
  const [form, setForm] = useState<StaffSettings | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const f = form ?? load.data;
  if (load.error) return <ErrorNote message={load.error} onRetry={load.reload} />;
  if (!f) return <SkeletonRows rows={4} />;
  const set = <K extends keyof StaffSettings>(k: K, v: StaffSettings[K]) => {
    setForm({ ...f, [k]: v });
    setState("idle");
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!f) return;
    setState("saving");
    setErrors({});
    try {
      setForm(await manageApi.updateSettings(f));
      setState("saved");
    } catch (er) {
      if (er instanceof ApiError)
        setErrors(Object.fromEntries(Object.entries(er.fields).map(([k, v]) => [k, v[0] ?? ""])));
      setState("error");
    }
  }

  return (
    <>
      <PageTitle
        title="Settings"
        lede="Details used across the website and in the booking hand-off."
      />
      <form onSubmit={save} noValidate className="max-w-3xl space-y-6">
        <section className="panel panel-pad">
          <h2 className="text-lg font-bold">WhatsApp hand-off</h2>
          <p className="text-muted mt-1 mb-4 text-[0.9375rem]">
            The last step of a booking opens this number with a prepared message.
          </p>
          <div className="space-y-5">
            <TextField
              label="WhatsApp number"
              value={f.whatsapp_number}
              onChange={(v) => set("whatsapp_number", v)}
              error={errors.whatsapp_number}
              hint="Digits only with the country code and no plus sign, for example 9779812345678."
              inputMode="numeric"
            />
            <TextField
              textarea
              label="Booking message"
              value={f.booking_message_template}
              onChange={(v) => set("booking_message_template", v)}
              error={errors.booking_message_template}
              hint="You can use {full_name} {test_type} {format} {date} {city} {booking_ref}."
            />
            <TextField
              textarea
              label="Inquiry message"
              value={f.inquiry_message_template}
              onChange={(v) => set("inquiry_message_template", v)}
              error={errors.inquiry_message_template}
              hint="You can use {name} {city} {test_type} {format} {month}."
            />
          </div>
        </section>

        <section className="panel panel-pad">
          <h2 className="mb-4 text-lg font-bold">Contact details</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              label="Phone"
              type="tel"
              value={f.contact_phone}
              onChange={(v) => set("contact_phone", v)}
              error={errors.contact_phone}
            />
            <TextField
              label="Email"
              type="email"
              value={f.contact_email}
              onChange={(v) => set("contact_email", v)}
              error={errors.contact_email}
            />
            <div className="sm:col-span-2">
              <TextField
                label="Office address"
                value={f.office_address}
                onChange={(v) => set("office_address", v)}
                error={errors.office_address}
              />
            </div>
          </div>
        </section>

        <section className="panel panel-pad">
          <h2 className="mb-4 text-lg font-bold">Website</h2>
          <div className="space-y-5">
            <TextField
              label="Low seats threshold"
              type="number"
              min={1}
              value={String(f.low_seat_threshold)}
              onChange={(v) => set("low_seat_threshold", Number(v))}
              error={errors.low_seat_threshold}
              hint="Dates show “few seats left” at or below this number."
            />
            <TextField
              label="Announcement banner"
              value={f.announcement}
              onChange={(v) => set("announcement", v)}
              error={errors.announcement}
              hint="Shown at the top of the website. Leave empty for no banner."
            />
            <TextField
              textarea
              label="Footer disclaimer"
              value={f.footer_disclaimer}
              onChange={(v) => set("footer_disclaimer", v)}
              error={errors.footer_disclaimer}
            />
          </div>
        </section>

        <div className="flex items-center gap-4">
          <button type="submit" className="btn btn-primary" disabled={state === "saving"}>
            {state === "saving" ? "Saving…" : "Save settings"}
          </button>
          {state === "saved" && (
            <span role="status" className="text-ok font-semibold">
              Saved
            </span>
          )}
          {state === "error" && (
            <span role="alert" className="text-crimson font-semibold">
              Please fix the highlighted fields.
            </span>
          )}
        </div>
      </form>
    </>
  );
}
