
"use client";

import { PDFDownloadLink } from "@react-pdf/renderer";
import { Download } from "lucide-react";
import InvoicePdf from "@/components/invoice-pdf";

type Invoice = {
  invoice_number: string | null;
  status: string;
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

export default function InvoicePdfDownload({
  invoice,
  items,
}: {
  invoice: Invoice;
  items: InvoiceItem[];
}) {
  const filename = `${invoice.invoice_number || "Draft-Invoice"}.pdf`;

  return (
    <PDFDownloadLink
      document={<InvoicePdf invoice={invoice} items={items} />}
      fileName={filename}
      className="inline-flex items-center gap-2 rounded-lg bg-[#142B49] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#203F63]"
    >
      {({ loading }) => (
        <>
          <Download size={17} />
          {loading ? "Preparing PDF..." : "Download PDF"}
        </>
      )}
    </PDFDownloadLink>
  );
}
