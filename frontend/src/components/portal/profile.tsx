"use client";

import { useState } from "react";
import { authApi } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { useAuth } from "../auth-provider";

export function Profile() {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.full_name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [dob, setDob] = useState(user?.date_of_birth ?? "");
  const [emailNews, setEmailNews] = useState(user?.email_notifications ?? true);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  if (!user) return null;
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setState("saving");
    setMessage(null);
    try {
      setUser(
        await authApi.updateMe({
          full_name: name.trim(),
          phone,
          date_of_birth: dob || null,
          email_notifications: emailNews,
        }),
      );
      setState("saved");
    } catch (err) {
      setState("error");
      setMessage(err instanceof Error ? err.message : "Could not save your details.");
    }
  }

  return (
    <>
      <h1 className="text-2xl font-bold md:text-3xl">Profile</h1>
      <p className="text-muted mt-1 mb-6">
        Your account details. For the people you book for, see Candidates.
      </p>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <form onSubmit={save} className="panel panel-pad" noValidate>
          <h2 className="mb-5 text-lg font-bold">Your details</h2>
          <div className="grid max-w-2xl gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
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
            <div className="sm:col-span-2">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  className="accent-crimson mt-1 h-4.5 w-4.5"
                  checked={emailNews}
                  onChange={(e) => setEmailNews(e.target.checked)}
                />
                <span>
                  <span className="block font-semibold">Email me booking updates</span>
                  <span className="text-muted block text-[0.875rem]">
                    Confirmations and venue details also go to {user.email}. They always appear in
                    your portal.
                  </span>
                </span>
              </label>
            </div>
          </div>
          {state === "error" && message && (
            <p role="alert" className="field-error mt-4">
              {message}
            </p>
          )}
          <div className="border-mist mt-6 flex items-center gap-4 border-t pt-5">
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

        <section className="panel panel-pad !p-5" aria-labelledby="acct">
          <h2 id="acct" className="text-lg font-bold">
            Account
          </h2>
          <dl className="divide-mist mt-2 divide-y text-[0.9375rem]">
            <div className="py-2.5">
              <dt className="text-muted text-[0.8125rem]">Email</dt>
              <dd className="font-semibold break-all">{user.email}</dd>
              <dd className="mt-1 text-[0.8125rem]">
                {user.email_verified ? (
                  <span className="font-semibold">Verified</span>
                ) : (
                  <>
                    <span className="text-crimson font-semibold">Not verified</span>{" "}
                    <button
                      type="button"
                      className="underline"
                      onClick={() =>
                        void authApi.resendVerification().then(
                          () => setResent(true),
                          () => undefined,
                        )
                      }
                    >
                      Send the link again
                    </button>
                    {resent && " (sent)"}
                  </>
                )}
              </dd>
            </div>
            <div className="py-2.5">
              <dt className="text-muted text-[0.8125rem]">Member since</dt>
              <dd className="font-semibold">{formatDate(user.date_joined.slice(0, 10))}</dd>
            </div>
          </dl>
        </section>
      </div>
    </>
  );
}
