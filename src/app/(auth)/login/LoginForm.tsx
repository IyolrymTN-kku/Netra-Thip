"use client";

import { signIn } from "next-auth/react";
import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (!res || res.error) {
      setError("Invalid email or password.");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: 12 }}
    >
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>Email</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            height: 36,
            padding: "0 10px",
            borderRadius: 8,
            border: "1px solid var(--line)",
            background: "var(--surface-2)",
            color: "var(--ink)",
            fontSize: 13,
            fontFamily: "var(--font-mono)",
          }}
        />
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>Password</span>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            height: 36,
            padding: "0 10px",
            borderRadius: 8,
            border: "1px solid var(--line)",
            background: "var(--surface-2)",
            color: "var(--ink)",
            fontSize: 13,
          }}
        />
      </label>

      {error && (
        <div
          role="alert"
          style={{
            fontSize: 12,
            color: "var(--err)",
            background: "rgba(239,68,68,0.10)",
            border: "1px solid rgba(239,68,68,0.18)",
            padding: "8px 10px",
            borderRadius: 8,
          }}
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="btn btn-primary btn-lg"
        style={{ justifyContent: "center", marginTop: 4 }}
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
