
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ClipboardCheck,
  FileText,
  ArrowRight,
  Clock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function ApprovalsPage() {
  const supabase = await createClient();

  const { data: authData, error: authError } =
    await supabase.auth.getClaims();

  const claims = authError ? null : authData?.claims;

  if (!claims || typeof claims.sub !== "string") {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", claims.sub)
    .maybeSingle();

  if (!profile || profile.role !== "admin") {
    redirect("/");
  }

  const { data: invoices, error } = await supabase
    .from("invoices")
    .select(`
      id,
      invoice_number,
      currency,
      total,
      invoice_date,
      due_date,
      created_at,
      customers (
        company_name
      )
    `)
    .eq("status", "pending_approval")
    .order("created_at", { ascending: true });

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-bold text-red-600">
          Unable to load pending invoices
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {error.message}
        </p>
      </div>
    );
  }

  const formatCurrency = (amount: number, currency: string) =>
    new Intl.NumberFormat("en", {
      style: "currency",
      currency,
    }).format(amount);

  return (
    <main className="min-w-0">
      <div className="min-w-0">
        <div className="mb-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-3">
                <ClipboardCheck className="text-[#142B49]" size={28} />
                <h1 className="text-2xl font-bold text-slate-900">
                  Invoice Approvals
                </h1>
              </div>

              <p className="mt-2 text-sm text-slate-500">
                Review invoices submitted by staff before approval.
              </p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3">
              <p className="text-xs font-medium text-amber-700">
                Awaiting approval
              </p>
              <p className="mt-1 text-2xl font-bold text-amber-800">
                {invoices?.length ?? 0}
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {invoices && invoices.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Invoice</th>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Invoice Date</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {invoices.map((invoice: any) => (
                    <tr key={invoice.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-semibold text-slate-800">
                        {invoice.invoice_number || "Awaiting number"}
                      </td>

                      <td className="px-6 py-4 text-slate-600">
                        {invoice.customers?.company_name || "Unknown customer"}
                      </td>

                      <td className="px-6 py-4 text-slate-600">
                        {new Date(invoice.invoice_date).toLocaleDateString()}
                      </td>

                      <td className="px-6 py-4 font-semibold text-slate-800">
                        {formatCurrency(invoice.total, invoice.currency)}
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                          <Clock size={13} />
                          Pending Approval
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <Link
                          href={`/invoices/${invoice.id}`}
                          className="inline-flex items-center gap-2 font-semibold text-[#142B49] hover:underline"
                        >
                          Review
                          <ArrowRight size={15} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
              <FileText size={42} className="text-slate-300" />
              <h2 className="mt-4 text-lg font-semibold text-slate-800">
                No pending approvals
              </h2>
              <p className="mt-2 max-w-sm text-sm text-slate-500">
                Invoices submitted by staff will appear here for administrator review.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
