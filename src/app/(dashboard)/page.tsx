
import Link from "next/link";
import {
  FileText,
  Wallet,
  Plus,
  ArrowUpRight,
  Clock,
  CheckCircle2,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";

function formatCurrency(amount: number, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getStatusStyles(status: string) {
  switch (status) {
    case "draft":
      return "bg-slate-100 text-slate-700";
    case "pending_approval":
      return "bg-amber-100 text-amber-800";
    case "approved":
      return "bg-blue-100 text-blue-800";
    case "paid":
      return "bg-green-100 text-green-800";
    case "rejected":
      return "bg-red-100 text-red-800";
    case "partially_paid":
      return "bg-purple-100 text-purple-800";
    case "overdue":
      return "bg-orange-100 text-orange-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function formatStatus(status: string) {
  return status.replaceAll("_", " ").replace(/\b\w/g, (letter) =>
    letter.toUpperCase()
  );
}

export default async function Dashboard() {
  const supabase = await createClient();

  const { data: invoices, error: invoiceError } = await supabase
    .from("invoices")
    .select(
      "id, invoice_number, status, total, currency, invoice_date, created_at"
    )
    .order("created_at", { ascending: false });

  if (invoiceError) {
    console.error("Dashboard invoice query failed:", invoiceError.message);
  }

  const invoiceList = invoices ?? [];

  // Dashboard statistics
  const totalInvoices = invoiceList.length;

  const pendingApproval = invoiceList.filter(
    (invoice) => invoice.status === "pending_approval"
  ).length;

  const paidInvoices = invoiceList.filter(
    (invoice) => invoice.status === "paid"
  ).length;

  const outstanding = invoiceList
    .filter((invoice) =>
      ["approved", "partially_paid", "overdue"].includes(invoice.status)
    )
    .reduce((sum, invoice) => {
      return sum + Number(invoice.total || 0);
    }, 0);

  const statistics = [
    {
      title: "Total Invoices",
      value: totalInvoices.toString(),
      description: "All invoices created",
      icon: FileText,
    },
    {
      title: "Pending Approval",
      value: pendingApproval.toString(),
      description: "Awaiting administrator review",
      icon: Clock,
    },
    {
      title: "Paid Invoices",
      value: paidInvoices.toString(),
      description: "Successfully paid invoices",
      icon: CheckCircle2,
    },
    {
      title: "Outstanding",
      value: formatCurrency(outstanding),
      description: "Approved, unpaid invoice value",
      icon: Wallet,
    },
  ];

  const recentInvoices = invoiceList.slice(0, 5);

  return (
    <div className="min-w-0">
      {/* Overview Heading */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Welcome to your invoice management workspace.
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

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {statistics.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.title}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-500">
                  {stat.title}
                </p>

                <div className="shrink-0 rounded-lg bg-blue-50 p-2.5 text-blue-700">
                  <Icon size={20} />
                </div>
              </div>

              <h2 className="mt-5 break-words text-2xl font-bold text-slate-900">
                {stat.value}
              </h2>

              <p className="mt-2 text-xs text-slate-500">
                {stat.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Recent Invoices */}
      <section className="mt-8 min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-semibold text-slate-900">
              Recent Invoices
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Keep track of your latest invoices.
            </p>
          </div>

          <Link
            href="/invoices"
            className="flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-900"
          >
            View all invoices
            <ArrowUpRight size={16} />
          </Link>
        </div>

        {recentInvoices.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center px-5 py-12 text-center">
            <div className="rounded-full bg-slate-100 p-5">
              <FileText size={30} className="text-slate-400" />
            </div>

            <h3 className="mt-5 font-semibold text-slate-800">
              No invoices yet
            </h3>

            <p className="mt-2 max-w-sm text-sm text-slate-500">
              Your invoices will appear here once you start creating them.
            </p>

            <Link
              href="/invoices/new"
              className="mt-5 inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <Plus size={17} />
              Create your first invoice
            </Link>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="whitespace-nowrap px-5 py-4 font-semibold">
                    Invoice
                  </th>
                  <th className="whitespace-nowrap px-5 py-4 font-semibold">
                    Date
                  </th>
                  <th className="whitespace-nowrap px-5 py-4 font-semibold">
                    Amount
                  </th>
                  <th className="whitespace-nowrap px-5 py-4 font-semibold">
                    Status
                  </th>
                  <th className="whitespace-nowrap px-5 py-4 text-right font-semibold">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {recentInvoices.map((invoice) => (
                  <tr key={invoice.id} className="transition hover:bg-slate-50">
                    <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-900">
                      {invoice.invoice_number || "Draft — Not assigned"}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                      {formatDate(invoice.invoice_date)}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-900">
                      {formatCurrency(
                        Number(invoice.total || 0),
                        invoice.currency || "NGN"
                      )}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusStyles(
                          invoice.status
                        )}`}
                      >
                        {formatStatus(invoice.status)}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-right">
                      <Link
                        href={`/invoices/${invoice.id}`}
                        className="font-medium text-blue-700 hover:text-blue-900"
                      >
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

      {/* Footer */}
      <footer className="mt-8 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} Kaotheem Energy Services Ltd. All rights reserved.
      </footer>
    </div>
  );
}
