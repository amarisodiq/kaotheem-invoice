import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ReportsManagement from "@/components/reports-management";

export default async function ReportsPage() {
  const supabase = await createClient();

  const { data: claims } = await supabase.auth.getClaims();

  if (!claims) redirect("/login");

  const userId = claims.claims.sub;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (profile?.role !== "admin") {
    redirect("/");
  }

  const { data: invoices, error: invoiceError } = await supabase
    .from("invoices")
    .select(
      "id, invoice_number, status, currency, subtotal, vat_amount, total, invoice_date, due_date"
    )
    .order("invoice_date", { ascending: false });

  if (invoiceError) throw new Error(invoiceError.message);

  const { data: payments, error: paymentError } = await supabase
    .from("payments")
    .select("id, invoice_id, amount, currency, payment_date");

  if (paymentError) throw new Error(paymentError.message);

  return (
    <ReportsManagement
      invoices={invoices ?? []}
      payments={payments ?? []}
    />
  );
}