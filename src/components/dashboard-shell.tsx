
"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Users,
  ClipboardCheck,
  Wallet,
  UserRoundCog,
  ChartNoAxesCombined,
  Settings,
  Menu,
  X,
} from "lucide-react";
import LogoutButton from "@/components/logout-button";

type DashboardShellProps = {
  children: React.ReactNode;
  profile: {
    full_name: string | null;
    role: string;
  };
};

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Invoices", href: "/invoices", icon: FileText },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Approvals", href: "/approvals", icon: ClipboardCheck },
  { name: "Payments", href: "/payments", icon: Wallet },
  { name: "Staff", href: "/staff", icon: UserRoundCog },
  { name: "Reports", href: "/reports", icon: ChartNoAxesCombined },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function DashboardShell({
  children,
  profile,
}: DashboardShellProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const fullName = profile.full_name || "User";
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const sidebarContent = (
    <>
      <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
        <Image
          src="/kaotheem-logo.jpg"
          alt="Kaotheem Energy Services"
          width={44}
          height={44}
          className="h-11 w-11 rounded-lg object-contain bg-white p-1"
        />
        <div>
          <p className="text-sm font-bold tracking-wide text-white">
            KAOTHEEM
          </p>
          <p className="text-[10px] text-slate-400">
            Energy Services Ltd
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-6">
        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Main Menu
        </p>

        {navigation.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition ${
                active
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-950/20"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon size={19} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <p className="truncate text-sm font-semibold text-white">
          {fullName}
        </p>
        <p className="mb-4 text-xs capitalize text-slate-400">
          {profile.role}
        </p>
        <LogoutButton />
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-[#101D35] lg:flex">
        {sidebarContent}
      </aside>

      {/* Mobile Header */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
        <div className="flex items-center gap-2">
          <Image
            src="/kaotheem-logo.jpg"
            alt="Kaotheem logo"
            width={36}
            height={36}
            className="h-9 w-9 rounded object-contain"
          />
          <span className="text-sm font-bold text-[#101D35]">
            KAOTHEEM
          </span>
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={mobileMenuOpen}
          className="rounded-lg p-2 text-slate-700 hover:bg-slate-100"
        >
          {mobileMenuOpen ? <X size={23} /> : <Menu size={23} />}
        </button>
      </header>

      {/* Mobile Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation overlay"
            onClick={() => setMobileMenuOpen(false)}
            className="absolute inset-0 bg-black/50"
          />

          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-[#101D35] shadow-xl">
            <div className="flex items-center justify-end border-b border-white/10 p-3">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation"
                className="rounded-lg p-2 text-white hover:bg-white/10"
              >
                <X size={22} />
              </button>
            </div>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="min-w-0 lg:ml-64">
        <header className="hidden h-16 items-center justify-end border-b border-slate-200 bg-white px-8 lg:flex">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
              {initials}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">
                {fullName}
              </p>
              <p className="text-xs capitalize text-slate-500">
                {profile.role}
              </p>
            </div>
          </div>
        </header>

        <main className="min-w-0 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
