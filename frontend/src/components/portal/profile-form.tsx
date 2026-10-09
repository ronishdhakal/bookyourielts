"use client";

import { useState } from "react";
import { authApi } from "@/lib/api";
import { useAuth } from "../auth-provider";
import { ProfileCard } from "./profile-card";

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
    <div className="grid items-start gap-6 lg:grid-cols-[24rem_minmax(0,1fr)]">
      <ProfileCard user={user} />
      <form onSubmit={save} className="panel panel-pad" noValidate>
        <h2 className="text-xl font-bold md:text-2xl">Your details</h2>
        <div className="form-row">
          <p className="form-row-label">Personal detail</p>
          <div className="grid max-w-3xl gap-5 sm:grid-cols-2">
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
          </div>
        </div>
        <div className="form-row">
          <p className="form-row-label">Email address</p>
          <div>
            <p className="font-semibold">{user.email}</p>
            <p className="field-hint">
              {user.email_verified
                ? "Verified"
                : "Not verified yet. Check your inbox for our link."}
            </p>
          </div>
        </div>
        {state === "error" && message && (
          <p role="alert" className="field-error">
            {message}
          </p>
        )}
        <div className="border-mist flex items-center gap-4 border-t pt-6">
          <button type="submit" className="btn btn-dark" disabled={state === "saving"}>
            {state === "saving" ? "Saving…" : "Save changes"}
          </button>
          {state === "saved" && (
            <span role="status" className="font-semibold">
              Saved
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
