
import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard-shell";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", userId)
    .maybeSingle();

  if (profileError || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-bold text-slate-900">
            Profile not found
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Your account profile could not be loaded. Please contact your
            administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <DashboardShell
      profile={{
        full_name: profile.full_name,
        role: profile.role,
      }}
    >
      {children}
    </DashboardShell>
  );
}
