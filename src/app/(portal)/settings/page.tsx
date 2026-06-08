import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import { AIProviderSettings } from "@/components/settings/AIProviderSettings";
import { getAiProviderMetadata } from "@/lib/settings/types";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) return redirect("/login");
  const userId = session.user.id;

  const project = await prisma.project.findFirst({
    where: { userId },
    select: { id: true, name: true }
  });

  if (!project) return redirect("/");

  // Fetch saved configs
  const keys = (await prisma.apiKey.findMany({
    where: { projectId: project.id },
    select: { provider: true, createdAt: true, updatedAt: true, metadata: true },
  })).map((key) => ({
    provider: key.provider,
    createdAt: key.createdAt.toISOString(),
    updatedAt: key.updatedAt.toISOString(),
    metadata: getAiProviderMetadata(key.metadata),
  }));

  return (
    <div style={{ 
      display: "flex", 
      flexDirection: "column", 
      gap: 40, 
      maxWidth: 860, 
      margin: "0 auto", 
      padding: "48px 24px 80px 24px" 
    }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid var(--line)", paddingBottom: 24 }}>
        <h1 className="mono" style={{ fontSize: 28, fontWeight: 600, margin: "0 0 12px 0", color: "var(--ink)", letterSpacing: "-0.5px" }}>Project Settings</h1>
        <p style={{ margin: 0, color: "var(--ink-3)", fontSize: 15, lineHeight: 1.6 }}>
          Manage global configurations, API keys, and default behaviors for <strong style={{color: "var(--ink)"}}>{project.name}</strong>.
        </p>
      </div>

      {/* AI Provider Config Section */}
      <section style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 8px 0", color: "var(--ink)" }}>AI Providers & Engines</h2>
          <p style={{ margin: 0, color: "var(--ink-3)", fontSize: 14, lineHeight: 1.6 }}>
            Save your API keys and custom endpoint configurations (Model, Base URL) here.
            Once saved, you won&apos;t need to enter them every time you run a scan.
            <span style={{ display: "block", marginTop: 8, color: "var(--ink-2)", fontSize: 13, background: "var(--surface-2)", padding: "8px 12px", borderRadius: 6, width: "fit-content" }}>
              🔒 Keys are strongly encrypted via <strong>AES-256-GCM</strong>.
            </span>
          </p>
        </div>

        <AIProviderSettings initialKeys={keys} />
      </section>

    </div>
  );
}
