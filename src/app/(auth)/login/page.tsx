import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        padding: 24,
      }}
    >
      <div
        className="nt-card dot-grid"
        style={{
          width: "100%",
          maxWidth: 400,
          padding: 28,
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: "0.18em",
              color: "var(--nt-blue)",
            }}
          >
            NETRA · CORE PORTAL
          </span>
          <h1
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 700,
              color: "var(--ink)",
              fontFamily: "var(--font-thai)",
            }}
          >
            เข้าสู่ระบบ
            <span
              style={{
                color: "var(--ink-3)",
                fontWeight: 500,
                marginLeft: 8,
              }}
            >
              · Sign in
            </span>
          </h1>
        </div>

        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>

        <p
          style={{
            margin: 0,
            fontSize: 10.5,
            color: "var(--ink-4)",
            textAlign: "center",
          }}
        >
          BYOK keys are encrypted at rest with AES-256-GCM.
        </p>
      </div>
    </main>
  );
}
