import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import CustomerManagement from "@/components/customer-management";

export default async function CustomersPage() {
  const supabase = await createClient();

  const { data, error: authError } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (authError || !userId) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (!profile || !["admin", "staff"].includes(profile.role)) {
    redirect("/");
  }

  const { data: customers, error } = await supabase
    .from("customers")
    .select("id, company_name, contact_name, email, phone, address, created_by")
    .order("company_name", { ascending: true });

  if (error) {
    throw new Error(`Unable to load customers: ${error.message}`);
  }

  return (
    <main className="min-w-0">
      <div className="min-w-0">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Customers
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Manage your company's customer records.
            </p>
          </div>
        </div>

        <CustomerManagement customers={customers ?? []} />
      </div>
    </main>
  );
}
