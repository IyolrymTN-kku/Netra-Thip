import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ReportsDashboard } from "@/components/reports/ReportsDashboard";

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user) return redirect("/login");

  return (
    <div className="max-w-[1200px] mx-auto pb-10">
      <ReportsDashboard />
    </div>
  );
}
