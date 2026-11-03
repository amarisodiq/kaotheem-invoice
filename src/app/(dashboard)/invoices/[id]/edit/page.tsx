
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import EditInvoiceForm from "@/components/edit-invoice-form";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditInvoicePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: authData, error: authError } =
    await supabase.auth.getClaims();

  const claims = authError ? null : authData?.claims;

  if (!claims || typeof claims.sub !== "string") {
    redirect("/login");
  }

  const { data: invoice, error } = await supabase
    .from("invoices")
    .select(`
      id,
      invoice_number,
      status,
      created_by,
      currency,
      invoice_date,
      due_date,
      rejection_reason,
      customers (
        company_name
      )
    `)
    .eq("id", id)
    .eq("created_by", claims.sub)
    .eq("status", "rejected")
    .maybeSingle();

  if (error) {
    throw new Error("Unable to load this invoice.");
  }

  if (!invoice) {
    notFound();
  }

  const { data: items, error: itemsError } = await supabase
    .from("invoice_items")
    .select("description, quantity, unit_price")
    .eq("invoice_id", id);

  if (itemsError) {
    throw new Error("Unable to load invoice items.");
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-5xl">
        <Link
          href={`/invoices/${id}`}
          className="text-sm font-semibold text-[#142B49] hover:underline"
        >
          ← Back to Invoice
        </Link>

        <div className="mt-6">
          <h1 className="text-2xl font-bold text-slate-900">
            Edit Rejected Invoice
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            {invoice.invoice_number || "Draft — Not assigned"}
          </p>
        </div>

        {invoice.rejection_reason && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5">
            <h2 className="font-bold text-red-800">
              Administrator's Rejection Reason
            </h2>
            <p className="mt-2 text-sm text-red-700">
              {invoice.rejection_reason}
            </p>
          </div>
        )}

        <div className="mt-8">
          <EditInvoiceForm
            invoiceId={invoice.id}
            initialData={{
              currency: invoice.currency,
              invoiceDate: invoice.invoice_date,
              dueDate: invoice.due_date || "",
              items: (items || []).map((item) => ({
                description: item.description,
                quantity: Number(item.quantity),
                price: Number(item.unit_price),
              })),
            }}
          />
        </div>
      </div>
    </main>
  );
}
