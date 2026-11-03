"use client";

import { Printer } from "lucide-react";

export default function PrintInvoiceButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-lg bg-[#142B49] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#203F63] print:hidden"
    >
      <Printer size={17} />
      Print Invoice
    </button>
  );
}