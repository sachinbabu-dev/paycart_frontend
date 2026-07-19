"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError, pickAccessToken } from "@/lib/api";
import { useAuth } from "@/lib/stores";
import { Loader2 } from "lucide-react";

type Mode = "login" | "signup";

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const setSession = useAuth((s) => s.setSession);
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res =
        mode === "signup"
          ? await api.signup({ email, password })
          : await api.login({ email, password });
      const token = pickAccessToken(res);
      if (!token) {
        throw new Error(
          "Signed in, but the server didn't return a token I could recognize.",
        );
      }
      setSession(token, email);
      router.push(next);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? `${err.message} (HTTP ${err.status})`
          : err instanceof Error
            ? err.message
            : "Something went wrong.";
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <div className="ticket rounded-2xl p-8">
        <div className="stamp mb-2">§ Access</div>
        <h1 className="display text-4xl">
          {mode === "login" ? "Sign in" : "Create an account"}
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          {mode === "login"
            ? "Your JWT lives in your browser only. No cookies, no tracking."
            : "One account across all your orders. Bearer JWT — plain and simple."}
        </p>

        <div className="mt-6 inline-flex bg-paper-2 rounded-full p-1 text-sm mono">
          {(["login", "signup"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`px-4 py-1.5 rounded-full transition ${
                mode === m ? "bg-ink text-cream" : "text-ink-soft"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="stamp">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              className="field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="stamp">Password</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              className="field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="min 8 characters"
            />
          </label>

          {error && (
            <div className="text-sm text-ember-deep bg-ember/10 border border-ember/30 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="btn-primary justify-center mt-2"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        <div className="mt-6 text-xs text-ink-mute">
          By continuing you agree to be a demo user for the Payment Backend API.
          Don&apos;t use a real password — this is a sandbox.
        </div>
      </div>

      <Link
        href="/"
        className="stamp block text-center mt-6 hover:text-ember transition"
      >
        ← back to the shop
      </Link>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <AuthForm />
    </Suspense>
  );
}
