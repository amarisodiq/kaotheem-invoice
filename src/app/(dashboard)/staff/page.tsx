
import { redirect } from "next/navigation";
import Link from "next/link";
import { Users, ArrowLeft, ShieldCheck, User } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import StaffInviteForm from "@/components/staff-invite-form";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const supabase = await createClient();

  const { data: authData, error: authError } =
    await supabase.auth.getClaims();

  const claims = authError ? null : authData?.claims;

  if (!claims || typeof claims.sub !== "string") {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", claims.sub)
    .maybeSingle();

  if (profileError || profile?.role !== "admin") {
    redirect("/");
  }

  const { data: staffMembers, error: staffError } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("role", "staff")
    .order("full_name", { ascending: true });

  if (staffError) {
    throw new Error("Unable to load staff members.");
  }

  return (
    <main className="min-w-0">
      <div className="min-w-0">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-100 p-3 text-[#142B49]">
              <Users size={25} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Staff Management
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Manage staff access to Kaotheem Invoice.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <StaffInviteForm />

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Staff Members
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Registered staff profiles.
                </p>
              </div>

              <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-[#142B49]">
                {staffMembers?.length || 0} Staff
              </span>
            </div>

            {!staffMembers || staffMembers.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 py-12 text-center">
                <Users
                  size={32}
                  className="mx-auto mb-3 text-slate-400"
                />
                <p className="font-semibold text-slate-700">
                  No staff members yet
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Invite your first staff member to get started.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {staffMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between gap-4 py-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="rounded-full bg-slate-100 p-3 text-slate-600">
                        <User size={19} />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">
                          {member.full_name || "Unnamed Staff"}
                        </p>
                        <p className="text-xs text-slate-500">
                          Staff account
                        </p>
                      </div>
                    </div>

                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                      <ShieldCheck size={14} />
                      Staff
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
