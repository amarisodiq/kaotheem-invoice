
import Link from "next/link";
import {
  FileText,
  Plus,
  Search,
  Eye,
  CalendarDays,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";

type Invoice = {
  id: string;
  invoice_number: string | null;
  status: string;
  currency: string;
  invoice_date: string;
  due_date: string | null;
  total: number;
  customers: {
    company_name: string;
  } | null;
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

export default async function InvoicesPage() {
  const supabase = await createClient();

  const { data: invoiceData, error: invoiceError } = await supabase
    .from("invoices")
    .select(`
      id,
      invoice_number,
      status,
      currency,
      invoice_date,
      due_date,
      total,
      customers (
        company_name
      )
    `)
    .order("created_at", { ascending: false });

  const invoices = (invoiceData ?? []) as unknown as Invoice[];

  return (
    <div className="min-w-0">
      {/* Page Heading */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Invoices
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            View, track and manage your company invoices.
          </p>
        </div>

        <Link
          href="/invoices/new"
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#101D35] px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 sm:w-auto"
        >
          <Plus size={18} />
          Create Invoice
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Invoices visible</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">
            {invoices.length}
          </h2>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Pending approval</p>
          <h2 className="mt-2 text-2xl font-bold text-amber-600">
            {
              invoices.filter(
                (invoice) => invoice.status === "pending_approval"
              ).length
            }
          </h2>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Paid invoices</p>
          <h2 className="mt-2 text-2xl font-bold text-green-600">
            {invoices.filter((invoice) => invoice.status === "paid").length}
          </h2>
        </div>
      </div>

      {/* Invoice Records */}
      <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-semibold text-slate-900">
              Invoice Records
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Your latest invoice records.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-400">
            <Search size={17} />
            <span>Invoice search coming next</span>
          </div>
        </div>

        {invoiceError ? (
          <div className="p-8 text-center text-sm text-red-600">
            Unable to load invoices: {invoiceError.message}
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center px-5 py-12 text-center">
            <div className="rounded-full bg-slate-100 p-5">
              <FileText size={30} className="text-slate-400" />
            </div>

            <h3 className="mt-5 font-semibold text-slate-800">
              No invoices yet
            </h3>

            <p className="mt-2 max-w-sm text-sm text-slate-500">
              Invoices created in the system will appear here.
            </p>

            <Link
              href="/invoices/new"
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#101D35] px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-800"
            >
              <Plus size={17} />
              Create your first invoice
            </Link>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="whitespace-nowrap px-5 py-4">Invoice</th>
                  <th className="whitespace-nowrap px-5 py-4">Customer</th>
                  <th className="whitespace-nowrap px-5 py-4">Invoice Date</th>
                  <th className="whitespace-nowrap px-5 py-4">Due Date</th>
                  <th className="whitespace-nowrap px-5 py-4">Amount</th>
                  <th className="whitespace-nowrap px-5 py-4">Status</th>
                  <th className="whitespace-nowrap px-5 py-4">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="transition hover:bg-slate-50">
                    <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-800">
                      {invoice.invoice_number || "Not assigned"}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {invoice.customers?.company_name || "Unknown customer"}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                      <span className="inline-flex items-center gap-2">
                        <CalendarDays size={15} />
                        {formatDate(invoice.invoice_date)}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                      {formatDate(invoice.due_date)}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-800">
                      {formatCurrency(Number(invoice.total), invoice.currency)}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusStyle(
                          invoice.status
                        )}`}
                      >
                        {statusLabel(invoice.status)}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4">
                      <Link
                        href={`/invoices/${invoice.id}`}
                        className="inline-flex items-center gap-2 font-medium text-[#142B49] hover:text-blue-700"
                      >
                        <Eye size={16} />
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <footer className="mt-8 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} Kaotheem Energy Services Ltd. All rights reserved.
      </footer>
    </div>
  );
}
