"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ApiError, authApi } from "@/lib/api";
import { validateEmail, validatePassword, validatePhone } from "@/lib/validate";
import { useAuth } from "./auth-provider";
import { FormError, TextField } from "./text-field";

function fieldErrors(e: unknown): Record<string, string> {
  if (!(e instanceof ApiError)) return {};
  return Object.fromEntries(Object.entries(e.fields).map(([k, v]) => [k, v[0] ?? ""]));
}

function useSubmit() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return { busy, setBusy, error, setError };
}

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const { setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errs, setErrs] = useState<Record<string, string>>({});
  const { busy, setBusy, error, setError } = useSubmit();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next_errs: Record<string, string> = {};
    const em = validateEmail(email);
    if (em) next_errs.email = em;
    if (!password) next_errs.password = "Enter your password.";
    setErrs(next_errs);
    setError(null);
    if (Object.keys(next_errs).length) return;
    setBusy(true);
    try {
      const user = await authApi.login(email.trim(), password);
      setUser(user);
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not log in. Please try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FormError message={error} />
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        inputMode="email"
        value={email}
        onChange={setEmail}
        error={errs.email}
        required
      />
      <TextField
        label="Password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={setPassword}
        error={errs.password}
        required
      />
      <button type="submit" className="btn btn-primary w-full" disabled={busy}>
        {busy ? "Logging in…" : "Log in"}
      </button>
      <p className="text-center text-[0.9375rem]">
        <Link
          href="/forgot-password"
          className="text-crimson font-semibold underline underline-offset-4"
        >
          Forgot your password?
        </Link>
      </p>
      <p className="border-mist border-t pt-5 text-center">
        New here?{" "}
        <Link
          href={`/register?next=${encodeURIComponent(next)}`}
          className="text-crimson font-semibold underline underline-offset-4"
        >
          Create a free account
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm({ next }: { next: string }) {
  const router = useRouter();
  const { setUser } = useAuth();
  const [v, setV] = useState({ full_name: "", phone: "", email: "", password: "" });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const { busy, setBusy, error, setError } = useSubmit();
  const set = (k: keyof typeof v) => (val: string) => setV((s) => ({ ...s, [k]: val }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found: Record<string, string> = {};
    if (v.full_name.trim().length < 2)
      found.full_name = "Enter your full name, as it appears on your passport.";
    const ph = validatePhone(v.phone);
    if (ph) found.phone = ph;
    const em = validateEmail(v.email);
    if (em) found.email = em;
    const pw = validatePassword(v.password);
    if (pw) found.password = pw;
    setErrs(found);
    setError(null);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      const user = await authApi.register({
        ...v,
        full_name: v.full_name.trim(),
        email: v.email.trim(),
      });
      setUser(user);
      router.push(next);
      router.refresh();
    } catch (err) {
      setErrs(fieldErrors(err));
      setError(
        err instanceof ApiError && Object.keys(err.fields).length === 0
          ? err.message
          : "Please fix the highlighted fields.",
      );
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FormError message={error} />
      <TextField
        label="Full name"
        autoComplete="name"
        value={v.full_name}
        onChange={set("full_name")}
        error={errs.full_name}
        hint="Use the name on your passport."
        required
      />
      <TextField
        label="Mobile / WhatsApp number"
        type="tel"
        autoComplete="tel"
        inputMode="tel"
        value={v.phone}
        onChange={set("phone")}
        error={errs.phone}
        hint="For example 98XXXXXXXX. We use it to reach you about your booking."
        required
      />
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        inputMode="email"
        value={v.email}
        onChange={set("email")}
        error={errs.email}
        required
      />
      <TextField
        label="Password"
        type="password"
        autoComplete="new-password"
        value={v.password}
        onChange={set("password")}
        error={errs.password}
        hint="At least 8 characters."
        required
      />
      <button type="submit" className="btn btn-primary w-full" disabled={busy}>
        {busy ? "Creating account…" : "Create account"}
      </button>
      <p className="text-muted text-center text-sm">
        By creating an account you agree to our{" "}
        <Link href="/terms" className="underline">
          terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline">
          privacy policy
        </Link>
        .
      </p>
      <p className="border-mist border-t pt-5 text-center">
        Already have an account?{" "}
        <Link
          href={`/login?next=${encodeURIComponent(next)}`}
          className="text-crimson font-semibold underline underline-offset-4"
        >
          Log in
        </Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const { busy, setBusy, error, setError } = useSubmit();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const em = validateEmail(email);
    setErr(em);
    setError(null);
    if (em) return;
    setBusy(true);
    try {
      await authApi.requestReset(email.trim());
      setDone(true);
    } catch (e2) {
      setError(e2 instanceof ApiError ? e2.message : "Could not send the email. Please try again.");
    }
    setBusy(false);
  }

  if (done)
    return (
      <div role="status" className="space-y-3">
        <h2 className="text-2xl font-bold">Check your email</h2>
        <p className="text-muted">
          If {email} has an account, a link to choose a new password is on its way. It can take a
          few minutes; check your spam folder too.
        </p>
      </div>
    );
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FormError message={error} />
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        inputMode="email"
        value={email}
        onChange={setEmail}
        error={err}
        required
      />
      <button type="submit" className="btn btn-primary w-full" disabled={busy}>
        {busy ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}

export function ResetPasswordForm({ uid, token }: { uid: string; token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const { busy, setBusy, error, setError } = useSubmit();

  if (!uid || !token)
    return (
      <p role="alert" className="text-crimson font-medium">
        This reset link is incomplete. Open the link from your email again, or{" "}
        <Link href="/forgot-password" className="underline">
          request a new one
        </Link>
        .
      </p>
    );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const pw = validatePassword(password);
    setErr(pw);
    setError(null);
    if (pw) return;
    setBusy(true);
    try {
      await authApi.confirmReset({ uid, token, password });
      setDone(true);
      setTimeout(() => router.push("/login"), 1800);
    } catch (e2) {
      const f = fieldErrors(e2);
      if (f.password) setErr(f.password);
      else setError(e2 instanceof ApiError ? e2.message : "Could not update the password.");
    }
    setBusy(false);
  }

  if (done)
    return (
      <p role="status" className="text-lg font-semibold">
        Password updated. Taking you to log in…
      </p>
    );
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FormError message={error} />
      <TextField
        label="New password"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={setPassword}
        error={err}
        hint="At least 8 characters."
        required
      />
      <button type="submit" className="btn btn-primary w-full" disabled={busy}>
        {busy ? "Saving…" : "Save new password"}
      </button>
    </form>
  );
}

export function VerifyEmail({ token }: { token: string }) {
  const { refresh } = useAuth();
  const [state, setState] = useState<"working" | "ok" | "error">(token ? "working" : "error");
  const [message, setMessage] = useState(
    token ? "" : "This verification link is incomplete. Open the link from your email again.",
  );
  const ran = useRef(false);

  useEffect(() => {
    if (!token || ran.current) return;
    ran.current = true;
    authApi
      .verifyEmail(token)
      .then(() => {
        setState("ok");
        void refresh();
      })
      .catch((e) => {
        setState("error");
        setMessage(
          e instanceof ApiError ? e.message : "We could not verify your email. Please try again.",
        );
      });
  }, [token, refresh]);

  if (state === "working") return <p role="status">Verifying your email…</p>;
  if (state === "ok")
    return (
      <div role="status" className="space-y-4">
        <p className="text-lg font-semibold">Your email is verified. Thank you!</p>
        <Link href="/ielts-test-dates" className="btn btn-primary">
          See IELTS test dates
        </Link>
      </div>
    );
  return (
    <div role="alert" className="space-y-4">
      <p className="text-crimson font-medium">{message}</p>
      <Link href="/dashboard" className="btn btn-outline">
        Go to my account
      </Link>
    </div>
  );
}
