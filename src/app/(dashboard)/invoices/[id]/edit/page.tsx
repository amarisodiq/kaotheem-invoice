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

  const { data: authData, error: authError } = await supabase.auth.getClaims();

  const claims = authError ? null : authData?.claims;

  if (!claims || typeof claims.sub !== "string") {
    redirect("/login");
  }

  const userId = claims.sub;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  const isAdmin = profile?.role === "admin";

  let invoiceQuery = supabase
    .from("invoices")
    .select(
      `
    id,
    invoice_number,
    vat_enabled,
    vat_rate,
    status,
    created_by,
    currency,
    invoice_date,
    due_date,
    rejection_reason,
    customers (
      company_name
    )
  `
    )
    .eq("id", id);

  if (isAdmin) {
    invoiceQuery = invoiceQuery.in("status", ["draft", "rejected", "approved"]);
  } else {
    invoiceQuery = invoiceQuery
      .eq("created_by", userId)
      .in("status", ["draft", "rejected"]);
  }

  const { data: invoice, error } = await invoiceQuery.maybeSingle();

  if (error) {
    throw new Error("Unable to load this invoice.");
  }

  if (!invoice) {
    notFound();
  }

  const { data: items, error: itemsError } = await supabase
    .from("invoice_items")
    .select("description, quantity, unit_price, uom")
    .eq("invoice_id", id);

  if (itemsError) {
    throw new Error("Unable to load invoice items.");
  }

  const isRejected = invoice.status === "rejected";

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
            {invoice.status === "approved"
              ? "Edit Approved Invoice"
              : isRejected
              ? "Edit Rejected Invoice"
              : "Edit Draft Invoice"}
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            {invoice.invoice_number || "Draft — Not assigned"}
          </p>
        </div>

        {isRejected && invoice.rejection_reason && (
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
            status={invoice.status as "draft" | "rejected" | "approved"}
            canSubmit={invoice.created_by === userId && invoice.status !== "approved"}
            vatEnabled={Boolean(invoice.vat_enabled)}
            vatRate={Number(invoice.vat_rate || 0)}
            initialData={{
              currency: invoice.currency,
              invoiceDate: invoice.invoice_date,
              dueDate: invoice.due_date || "",
              items: (items || []).map((item) => ({
                description: item.description,
                quantity: Number(item.quantity),
                uom: item.uom || "PCS",
                price: Number(item.unit_price),
              })),
            }}
          />
        </div>
      </div>
    </main>
  );
}
