import InvoicePdfDownload from "@/components/invoice-pdf-download";
import InvoiceApprovalActions from "@/components/invoice-approval-actions";
import InvoiceSubmitAction from "@/components/invoice-submit-action";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarDays, Building2, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type InvoiceDetails = {
  id: string;
  invoice_number: string | null;
  status: string;
  created_by: string;
  rejection_reason: string | null;
  currency: string;
  invoice_date: string;
  due_date: string | null;
  subtotal: number;
  vat_enabled: boolean;
  vat_rate: number;
  vat_amount: number;
  total: number;
  customers: {
    company_name: string;
    contact_name: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
  } | null;
};

type InvoiceItem = {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

function formatCurrency(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

function formatDate(date: string | null) {
  if (!date) return "—";

  return new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusStyle(status: string) {
  const styles: Record<string, string> = {
    draft: "bg-slate-100 text-slate-700",
    pending_approval: "bg-amber-100 text-amber-800",
    approved: "bg-blue-100 text-blue-800",
    rejected: "bg-red-100 text-red-800",
    paid: "bg-green-100 text-green-800",
    partially_paid: "bg-purple-100 text-purple-800",
    void: "bg-gray-200 text-gray-700",
  };

  return styles[status] || "bg-slate-100 text-slate-700";
}

function statusLabel(status: string) {
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function InvoiceDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();

  // Verify the logged-in user.
  const { data: authData, error: authError } = await supabase.auth.getClaims();

  const claims = authError ? null : authData?.claims;

  if (!claims || typeof claims.sub !== "string") {
    redirect("/login");
  }

  // Get the user's role.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", claims.sub)
    .maybeSingle();

  const isAdmin = profile?.role === "admin";

  // Fetch the selected invoice.
  const { data: invoiceData, error: invoiceError } = await supabase
    .from("invoices")
    .select(
      `
      id,
      invoice_number,
      status,
      created_by,
      rejection_reason,
      currency,
      invoice_date,
      due_date,
      subtotal,
      vat_enabled,
      vat_rate,
      vat_amount,
      total,
      customers (
        company_name,
        contact_name,
        email,
        phone,
        address
      )
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (invoiceError) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-3xl rounded-xl border border-red-200 bg-white p-6 text-red-700">
          Unable to load invoice: {invoiceError.message}
        </div>
      </div>
    );
  }

  if (!invoiceData) {
    notFound();
  }

  // Convert the fetched invoice into our invoice type.
  const invoice = invoiceData as unknown as InvoiceDetails;

  // Check whether the logged-in user created this invoice.
  const isOwner = invoice.created_by === claims.sub;

  // Fetch the invoice line items.
  const { data: itemData, error: itemError } = await supabase
    .from("invoice_items")
    .select("id, description, quantity, unit_price, line_total")
    .eq("invoice_id", id)
    .order("id", { ascending: true });

  if (itemError) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-3xl rounded-xl border border-red-200 bg-white p-6 text-red-700">
          Unable to load invoice items: {itemError.message}
        </div>
      </div>
    );
  }

  const items = (itemData ?? []) as InvoiceItem[];

  const customer = invoice.customers;

  return (
    <div className="min-h-screen bg-slate-50 p-5 md:p-8">
      <div className="mx-auto max-w-5xl">
        {/* Back navigation */}
        <Link
          href="/invoices"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 print:hidden"
        >
          <ArrowLeft size={17} />
          Back to Invoices
        </Link>

        {/* Page heading */}
        <div className="mb-7 flex flex-wrap items-center justify-between gap-4 print:hidden">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Invoice Details
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              View invoice information and customer records.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full px-4 py-2 text-xs font-semibold ${statusStyle(
                invoice.status
              )}`}
            >
              {statusLabel(invoice.status)}
            </span>

            <InvoicePdfDownload invoice={invoice} items={items} />

            {/* Submit button for the invoice creator */}
            {isOwner && invoice.status === "draft" && (
              <InvoiceSubmitAction invoiceId={invoice.id} />
            )}

            {/* Edit button for draft and rejected invoices */}
            {(isOwner || isAdmin) &&
              ["draft", "rejected"].includes(invoice.status) && (
                <Link
                  href={`/invoices/${invoice.id}/edit`}
                  className="rounded-lg bg-[#142B49] px-5 py-3 text-sm font-semibold text-white hover:bg-[#203F63] print:hidden"
                >
                  {invoice.status === "draft" ? "Edit Draft" : "Edit Invoice"}
                </Link>
              )}

            {/* Approval controls for administrators */}
            {isAdmin && invoice.status === "pending_approval" && (
              <InvoiceApprovalActions invoiceId={invoice.id} />
            )}
          </div>
        </div>

        {/* Invoice document */}
        <div className="invoice-document overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm print:overflow-visible print:border-0 print:shadow-none">
          <div className="border-b border-slate-200 p-6 md:p-9">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div>
                <Image
                  src="/kaotheem-logo.jpg"
                  alt="Kaotheem Energy Services Ltd"
                  width={180}
                  height={90}
                  className="h-auto w-44 object-contain"
                />
              </div>

              <div className="text-left sm:text-right">
                <h2 className="text-3xl font-bold tracking-wide text-[#142B49]">
                  INVOICE
                </h2>

                <p className="mt-2 text-sm font-semibold text-slate-800">
                  {invoice.invoice_number ||
                    (invoice.status === "pending_approval"
                      ? "Awaiting Approval"
                      : invoice.status === "rejected"
                      ? "Rejected — Revision Required"
                      : "Draft — Not assigned")}
                </p>

                <span className="mt-2 inline-flex items-center gap-2 text-xs text-slate-500">
                  <CalendarDays size={14} />
                  {formatDate(invoice.invoice_date)}
                </span>
              </div>
            </div>
          </div>

          {/* Customer and invoice information */}
          <div className="invoice-info-grid grid grid-cols-1 gap-8 border-b border-slate-200 p-6 md:grid-cols-2 md:p-9">
            <div>
              <div className="mb-4 flex items-center gap-2 text-[#142B49]">
                <Building2 size={18} />
                <h3 className="text-sm font-bold uppercase tracking-wide">
                  Bill To
                </h3>
              </div>

              <h4 className="font-semibold text-slate-900">
                {customer?.company_name || "Unknown Customer"}
              </h4>

              {customer?.contact_name && (
                <p className="mt-1 text-sm text-slate-600">
                  {customer.contact_name}
                </p>
              )}

              {customer?.email && (
                <p className="mt-1 text-sm text-slate-600">{customer.email}</p>
              )}

              {customer?.phone && (
                <p className="mt-1 text-sm text-slate-600">{customer.phone}</p>
              )}

              {customer?.address && (
                <p className="mt-1 max-w-xs text-sm text-slate-600">
                  {customer.address}
                </p>
              )}
            </div>

            <div>
              <div className="mb-4 flex items-center gap-2 text-[#142B49]">
                <FileText size={18} />
                <h3 className="text-sm font-bold uppercase tracking-wide">
                  Invoice Information
                </h3>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Invoice Date</span>
                  <span className="font-medium text-slate-800">
                    {formatDate(invoice.invoice_date)}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Due Date</span>
                  <span className="font-medium text-slate-800">
                    {formatDate(invoice.due_date)}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Currency</span>
                  <span className="font-medium text-slate-800">
                    {invoice.currency}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Status</span>
                  <span className="font-medium text-slate-800">
                    {statusLabel(invoice.status)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Rejection reason */}
          {invoice.status === "rejected" && invoice.rejection_reason && (
            <div className="border-b border-red-200 bg-red-50 p-6 md:p-9">
              <h3 className="font-bold text-red-800">Invoice Rejected</h3>

              <p className="mt-2 text-sm text-red-700">
                {invoice.rejection_reason}
              </p>

              <p className="mt-2 text-xs text-red-600">
                Please correct the issues and resubmit this invoice.
              </p>
            </div>
          )}

          {/* Invoice items */}
          <div className="p-6 md:p-9">
            <h3 className="mb-5 font-bold text-slate-900">Invoice Items</h3>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-4">Description</th>
                    <th className="px-4 py-4 text-right">Quantity</th>
                    <th className="px-4 py-4 text-right">Unit Price</th>
                    <th className="px-4 py-4 text-right">Amount</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-4 font-medium text-slate-800">
                        {item.description}
                      </td>

                      <td className="px-4 py-4 text-right text-slate-600">
                        {Number(item.quantity).toLocaleString()}
                      </td>

                      <td className="px-4 py-4 text-right text-slate-600">
                        {formatCurrency(
                          Number(item.unit_price),
                          invoice.currency
                        )}
                      </td>

                      <td className="px-4 py-4 text-right font-semibold text-slate-800">
                        {formatCurrency(
                          Number(item.line_total),
                          invoice.currency
                        )}
                      </td>
                    </tr>
                  ))}

                  {items.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-8 text-center text-slate-500"
                      >
                        No invoice items found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="mt-8 flex justify-end">
              <div className="w-full max-w-sm space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-medium text-slate-800">
                    {formatCurrency(Number(invoice.subtotal), invoice.currency)}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">
                    VAT{" "}
                    {invoice.vat_enabled
                      ? `(${invoice.vat_rate}%)`
                      : "(Disabled)"}
                  </span>
                  <span className="font-medium text-slate-800">
                    {formatCurrency(
                      Number(invoice.vat_amount),
                      invoice.currency
                    )}
                  </span>
                </div>

                <div className="flex justify-between border-t border-slate-200 pt-4">
                  <span className="text-base font-bold text-slate-900">
                    Total
                  </span>
                  <span className="text-xl font-bold text-[#142B49]">
                    {formatCurrency(Number(invoice.total), invoice.currency)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bank Details and Authorised Signatory */}
          <div className="border-t border-slate-200 p-6 md:p-9">
            <div className="invoice-payment-grid grid grid-cols-2 gap-5">
              {/* Bank Details */}
              <div>
                <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[#142B49]">
                  Payment Details
                </h3>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Bank</span>
                    <span className="font-semibold text-slate-800">
                      PremiumTrust Bank
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Account Name</span>
                    <span className="text-right font-semibold text-slate-800">
                      Kaotheem Energy Services Ltd
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Account Number</span>
                    <span className="font-semibold tracking-wide text-slate-800">
                      0010133736
                    </span>
                  </div>
                </div>
              </div>

              {/* Authorised Signatory */}
              <div>
                <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[#142B49]">
                  Authorised Signatory
                </h3>

                {/* Company Stamp */}
                {["approved", "paid", "partially_paid"].includes(
                  invoice.status
                ) && (
                  <div className="mb-4">
                    <Image
                      src="/kaotheem-stamp.png"
                      alt="Kaotheem Energy Services Ltd Official Stamp"
                      width={160}
                      height={160}
                      className="h-auto w-40 object-contain"
                    />
                  </div>
                )}

                <div className="border-t border-slate-300 pt-3">
                  <p className="font-bold text-slate-900">Jimoh Ibrahim</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Business Development Manager
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 bg-slate-50 px-6 py-5 text-center">
            <p className="text-xs text-slate-500">
              Kaotheem Energy Services Ltd. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
