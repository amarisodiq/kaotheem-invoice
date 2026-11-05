
"use client";

import { Printer } from "lucide-react";

type PrintInvoiceButtonProps = {
  invoiceNumber: string | null;
};

export default function PrintInvoiceButton({
  invoiceNumber,
}: PrintInvoiceButtonProps) {
  const handlePrint = () => {
    const originalTitle = document.title;

    const filename = invoiceNumber || "Draft-Invoice";

    document.title = filename;

    window.onafterprint = () => {
      document.title = originalTitle;
      window.onafterprint = null;
    };

    window.print();
  };

  return (
    <button
      type="button"
      onClick={handlePrint}
      className="inline-flex items-center gap-2 rounded-lg bg-[#142B49] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#203F63] print:hidden"
    >
      <Printer size={17} />
      Print Invoice
    </button>
  );
}
