import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AuditLogView } from "@/components/audit/AuditLogView";
import { Icon } from "@/components/icons/Icon";

export default async function AuditPage() {
  const session = await auth();
  if (!session?.user) return redirect("/login");

  // RBAC: ADMIN only
  if (session.user.role !== "ADMIN") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 400,
          gap: 12,
          color: "var(--ink-3)",
        }}
      >
        <Icon name="lock" size={36} style={{ color: "var(--ink-4)" }} />
        <div style={{ fontSize: 16, fontWeight: 600, color: "var(--ink-2)" }}>
          Access Restricted
        </div>
        <div style={{ fontSize: 13 }}>
          Audit logs are only accessible to administrators.
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 20,
        paddingBottom: 40,
      }}
    >
      {/* Header */}
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 6,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background:
                "linear-gradient(135deg, var(--nt-blue), var(--nt-cyan))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="clipboard" size={18} style={{ color: "#fff" }} />
          </div>
          <div>
            <h1
              className="mono"
              style={{
                fontSize: 22,
                fontWeight: 700,
                margin: 0,
                color: "var(--ink)",
              }}
            >
              Audit Log
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: "var(--ink-3)",
              }}
            >
              Complete trail of all security-relevant actions across the
              platform.
            </p>
          </div>
        </div>
      </div>

      <AuditLogView />
    </div>
  );
}
