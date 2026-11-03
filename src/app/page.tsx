
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
  Bell,
  Plus,
  ArrowUpRight,
  Clock,
  CheckCircle2,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/logout-button";

const navigation = [
  { name: "Dashboard", icon: LayoutDashboard, href: "/", active: true },
  { name: "Invoices", icon: FileText, href: "/invoices" },
  { name: "Customers", icon: Users, href: "/customers" },
  { name: "Payments", icon: Wallet, href: "/payments" },
  { name: "Staff", icon: UserRoundCog, href: "/staff" },
  { name: "Reports", icon: ChartNoAxesCombined, href: "/reports" },
  { name: "Settings", icon: Settings, href: "/settings" },
];

const statistics = [
  {
    title: "Total Invoices",
    value: "0",
    description: "All invoices created",
    icon: FileText,
  },
  {
    title: "Pending Approval",
    value: "0",
    description: "Awaiting administrator review",
    icon: Clock,
  },
  {
    title: "Paid Invoices",
    value: "0",
    description: "Successfully paid invoices",
    icon: CheckCircle2,
  },
  {
    title: "Outstanding",
    value: "₦0.00",
    description: "Unpaid invoice balance",
    icon: Wallet,
  },
];

export default async function Dashboard() {
  // Verify the logged-in user
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();

  const claims = error ? null : data?.claims;

  if (!claims || typeof claims.sub !== "string") {
    redirect("/login");
  }

  // Retrieve the user's profile and role
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", claims.sub)
    .maybeSingle();

  if (profileError || !profile) {
    redirect("/login");
  }

  const initials = (profile.full_name as string)
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

        {/* Company Logo */}
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

        {/* Navigation */}
        <div className="flex-1 px-4 py-8">
          <p className="mb-4 px-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
            Main Menu
          </p>

          <nav className="space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${
                    item.active
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

        {/* Sidebar Footer */}
        <div className="border-t border-white/10 p-5">
          <p className="text-xs text-slate-400">
            Kaotheem Energy Services Ltd
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Invoice Management System
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="min-w-0 flex-1">

        {/* Top Header */}
        <header className="flex min-h-20 items-center justify-between border-b border-slate-200 bg-white px-5 py-4 md:px-8">

          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Dashboard
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Welcome to your invoice management workspace.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              aria-label="Notifications"
              className="text-slate-500 hover:text-slate-900"
            >
              <Bell size={21} />
            </button>

            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-800">
                {profile.full_name}
              </p>
              <p className="text-xs capitalize text-slate-500">
                {profile.role}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#101D35] text-sm font-semibold text-white">
              {initials || "K"}
            </div>

            <LogoutButton />
          </div>
        </header>

        {/* Dashboard Body */}
        <div className="p-5 md:p-8">

          {/* Overview Heading */}
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Overview
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Here's what's happening with your invoices.
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

          {/* Statistics */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {statistics.map((stat) => {
              const Icon = stat.icon;

              return (
                <div
                  key={stat.title}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-500">
                      {stat.title}
                    </p>

                    <div className="rounded-lg bg-blue-50 p-2.5 text-blue-700">
                      <Icon size={20} />
                    </div>
                  </div>

                  <h3 className="mt-5 text-2xl font-bold text-slate-900">
                    {stat.value}
                  </h3>

                  <p className="mt-2 text-xs text-slate-500">
                    {stat.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Recent Invoices */}
          <section className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

            <div className="flex flex-col justify-between gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center">
              <div>
                <h3 className="font-semibold text-slate-900">
                  Recent Invoices
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Keep track of your latest invoices.
                </p>
              </div>

              <Link
                href="/invoices/new"
                className="flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-900"
              >
                Create Invoice
                <ArrowUpRight size={16} />
              </Link>
            </div>

            <div className="flex min-h-72 flex-col items-center justify-center px-5 py-12 text-center">
              <div className="rounded-full bg-slate-100 p-5">
                <FileText size={30} className="text-slate-400" />
              </div>

              <h4 className="mt-5 font-semibold text-slate-800">
                No invoices yet
              </h4>

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
          </section>

          {/* Footer */}
          <footer className="mt-8 text-center text-xs text-slate-400">
            © {new Date().getFullYear()} Kaotheem Energy Services Ltd. All
            rights reserved.
          </footer>

        </div>
      </main>
    </div>
  );
}
