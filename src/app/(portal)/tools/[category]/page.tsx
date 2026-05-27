import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { TOOLS } from "@/lib/tools/registry";
import { ToolsHubClient } from "@/components/tools/ToolsHubClient";
import { getOrCreateDefaultProject } from "@/lib/projects/default";
import { prisma } from "@/lib/db/prisma";

// Map URL slugs to actual registry categories
const SLUG_TO_CATEGORY: Record<string, string[]> = {
  "va": ["VA Scan"],
  "pentest": ["Pentest"],
  "recon": ["Workflow", "API"], // Assuming recon encompasses these for now
  "webaudit": ["Web Audit"],
  "sca": ["SCA"]
};

const SLUG_TO_TITLE: Record<string, { title: string, desc: string }> = {
  "va": { title: "Vulnerability Assessments", desc: "Automated scanners to identify known vulnerabilities in infrastructure and applications." },
  "pentest": { title: "Penetration Testing", desc: "Deep-dive tools that chain exploits and validate security posture across multiple layers." },
  "recon": { title: "Reconnaissance & Workflows", desc: "Information gathering, surface mapping, and AI-orchestrated security workflows." }
};

export default async function ToolsHubPage({ params }: { params: { category: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  
  const categoryParam = params.category.toLowerCase();
  const mappedCategories = SLUG_TO_CATEGORY[categoryParam];
  
  if (!mappedCategories) {
    redirect("/dashboard");
  }

  // Filter tools for this category
  const categoryTools = TOOLS.filter(t => mappedCategories.includes(t.category));

  // Get project and saved API keys (reusing the logic from NewScanPage so the drawer form auto-fills)
  const project = await getOrCreateDefaultProject(session.user.id);
  
  const selectQuery: any = { provider: true, metadata: true };
  const savedConfigs = await (prisma.apiKey as any).findMany({
    where: { projectId: project.id },
    select: selectQuery
  });

  const headerInfo = SLUG_TO_TITLE[categoryParam] || { title: "Security Tools", desc: "Select a tool to begin." };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div style={{ padding: "32px 32px 24px" }}>
        <h1 className="mono" style={{ fontSize: 24, fontWeight: 600, margin: "0 0 8px 0", color: "var(--ink)" }}>
          {headerInfo.title}
        </h1>
        <p style={{ margin: 0, color: "var(--ink-3)", fontSize: 14, maxWidth: 600 }}>
          {headerInfo.desc}
        </p>
      </div>

      {/* Main content area */}
      <ToolsHubClient 
        tools={categoryTools} 
        projectId={project.id} 
        savedConfigs={savedConfigs} 
      />
    </div>
  );
}
