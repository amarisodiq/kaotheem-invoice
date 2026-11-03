import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Users,
  Wallet,
  UserRoundCog,
  ChartNoAxesCombined,
  Settings,
  Plus,
  Search,
  Eye,
  CalendarDays,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/logout-button";

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

const navigation = [
  { name: "Dashboard", icon: LayoutDashboard, href: "/" },
  { name: "Invoices", icon: FileText, href: "/invoices" },
  { name: "Customers", icon: Users, href: "/customers" },
  { name: "Payments", icon: Wallet, href: "/payments" },
  { name: "Staff", icon: UserRoundCog, href: "/staff" },
  { name: "Reports", icon: ChartNoAxesCombined, href: "/reports" },
  { name: "Settings", icon: Settings, href: "/settings" },
];

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

  // Verify the logged-in user
  const { data: authData, error: authError } = await supabase.auth.getClaims();

  const claims = authError ? null : authData?.claims;

  if (!claims || typeof claims.sub !== "string") {
    redirect("/login");
  }

  // Retrieve user profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", claims.sub)
    .maybeSingle();

  if (profileError || !profile) {
    return (
      <div className="p-10 text-red-600">
        Unable to load your user profile.
        {profileError?.message}
      </div>
    );
  }

  // Fetch invoices. RLS determines which records this user can see.
  const { data: invoiceData, error: invoiceError } = await supabase
    .from("invoices")
    .select(
      `
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
    `
    )
    .order("created_at", { ascending: false });

  const invoices = (invoiceData ?? []) as unknown as Invoice[];

  const initials = (profile.full_name || "Kaotheem")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col bg-[#101D35] text-white md:flex">
        <div className="flex h-24 items-center justify-center border-b border-white/10 px-5">
          <Image
            src="/kaotheem-logo.jpg"
            alt="Kaotheem Energy Services Ltd"
            width={180}
            height={90}
            priority
            className="h-auto max-h-16 w-44 object-contain"
          />
        </div>

        <div className="flex-1 px-4 py-8">
          <p className="mb-4 px-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
            Main Menu
          </p>

          <nav className="space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = item.href === "/invoices";

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${
                    active
                      ? "bg-blue-700 text-white"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon size={19} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-white/10 p-5">
          <p className="text-xs text-slate-400">Kaotheem Energy Services Ltd</p>
          <p className="mt-1 text-xs text-slate-500">
            Invoice Management System
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="min-w-0 flex-1">
        {/* Header */}
        <header className="flex min-h-20 items-center justify-between border-b border-slate-200 bg-white px-5 py-4 md:px-8">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Invoices</h1>
            <p className="mt-1 text-xs text-slate-500">
              Manage and monitor company invoices.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-800">
                {profile.full_name}
              </p>
              <p className="text-xs capitalize text-slate-500">
                {profile.role}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#101D35] text-sm font-semibold text-white">
              {initials}
            </div>

            <LogoutButton />
          </div>
        </header>

        {/* Invoice Content */}
        <div className="p-5 md:p-8">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                All Invoices
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                View, track and manage your invoices.
              </p>
            </div>

            <Link
              href="/invoices/new"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#101D35] px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
            >
              <Plus size={18} />
              Create Invoice
            </Link>
          </div>

          {/* Summary */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-500">Invoices visible</p>
              <h3 className="mt-2 text-2xl font-bold text-slate-900">
                {invoices.length}
              </h3>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-500">Pending approval</p>
              <h3 className="mt-2 text-2xl font-bold text-amber-600">
                {
                  invoices.filter(
                    (invoice) => invoice.status === "pending_approval"
                  ).length
                }
              </h3>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-500">Paid invoices</p>
              <h3 className="mt-2 text-2xl font-bold text-green-600">
                {invoices.filter((invoice) => invoice.status === "paid").length}
              </h3>
            </div>
          </div>

          {/* Invoice Table */}
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center">
              <div>
                <h3 className="font-semibold text-slate-900">
                  Invoice Records
                </h3>
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

                <h4 className="mt-5 font-semibold text-slate-800">
                  No invoices yet
                </h4>

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
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-5 py-4">Invoice</th>
                      <th className="px-5 py-4">Customer</th>
                      <th className="px-5 py-4">Invoice Date</th>
                      <th className="px-5 py-4">Due Date</th>
                      <th className="px-5 py-4">Amount</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {invoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-slate-50">
                        <td className="px-5 py-4 font-semibold text-slate-800">
                          {invoice.invoice_number || "Not assigned"}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {invoice.customers?.company_name ||
                            "Unknown customer"}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          <span className="inline-flex items-center gap-2">
                            <CalendarDays size={15} />
                            {formatDate(invoice.invoice_date)}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {formatDate(invoice.due_date)}
                        </td>

                        <td className="px-5 py-4 font-semibold text-slate-800">
                          {formatCurrency(
                            Number(invoice.total),
                            invoice.currency
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusStyle(
                              invoice.status
                            )}`}
                          >
                            {statusLabel(invoice.status)}
                          </span>
                        </td>

                        <td className="px-5 py-4">
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
            © {new Date().getFullYear()} Kaotheem Energy Services Ltd. All
            rights reserved.
          </footer>
        </div>
      </main>
    </div>
  );
}
