import { createClient } from "@/lib/supabase/server";
import PaymentsManagement from "@/components/payments-management";

export default async function PaymentsPage() {
  const supabase = await createClient();

  const { data: claims } = await supabase.auth.getClaims();

if (!claims) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", claims.claims.sub)
    .single();

  const isAdmin = profile?.role === "admin";

  const { data: payments, error: paymentsError } = await supabase
    .from("payments")
    .select("*")
    .order("payment_date", { ascending: false });

  if (paymentsError) throw new Error(paymentsError.message);

  const { data: invoices, error: invoicesError } = await supabase
    .from("invoices")
    .select("id, invoice_number, total, currency, status")
    .in("status", ["approved", "partially_paid", "paid"]);

  if (invoicesError) throw new Error(invoicesError.message);

  return (
    <PaymentsManagement
      payments={payments ?? []}
      invoices={invoices ?? []}
      isAdmin={isAdmin}
    />
  );
}