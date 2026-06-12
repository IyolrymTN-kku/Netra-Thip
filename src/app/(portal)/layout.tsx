import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/layout/AppShell";

import { prisma } from "@/lib/db/prisma";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;
  const user = {
    name: session.user.name ?? null,
    email: session.user.email ?? "",
    role: session.user.role,
  };

  const [scans, findings, aiKeys] = await Promise.all([
    prisma.scanJob.count({ where: { project: { userId } } }),
    prisma.finding.count({ where: { project: { userId }, status: "OPEN" } }), // or total findings
    prisma.apiKey.count({ where: { project: { userId } } })
  ]);

  const navCounts = { scans, findings, aiKeys };

  return <AppShell user={user} navCounts={navCounts}>{children}</AppShell>;
}
