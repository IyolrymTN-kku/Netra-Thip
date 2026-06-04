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
    <div style={{ display: "flex", flexDirection: "column", gap: 32, paddingBottom: 60, maxWidth: 800 }}>
      {/* Header */}
      <div>
        <h1 className="mono" style={{ fontSize: 24, fontWeight: 600, margin: "0 0 8px 0", color: "var(--ink)" }}>Project Settings</h1>
        <p style={{ margin: 0, color: "var(--ink-3)", fontSize: 14 }}>
          Manage global configurations, API keys, and default behaviors for <strong style={{color: "var(--ink)"}}>{project.name}</strong>.
        </p>
      </div>

      {/* AI Provider Config Section */}
      <section>
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 4px 0", color: "var(--ink)" }}>AI Providers & Engines</h2>
          <p style={{ margin: 0, color: "var(--ink-3)", fontSize: 13 }}>
            Save your API keys and custom endpoint configurations (Model, Base URL) here.
            Once saved, you won&apos;t need to enter them every time you run a scan. Keys are strongly encrypted via AES-256-GCM.
          </p>
        </div>

        <AIProviderSettings initialKeys={keys} />
      </section>

    </div>
  );
}
