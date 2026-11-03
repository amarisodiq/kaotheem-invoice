
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { submitInvoiceForApproval } from "@/app/(dashboard)/invoices/actions";

export default function InvoiceSubmitAction({
  invoiceId,
}: {
  invoiceId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  async function handleSubmit() {
    if (loading) return;

    const confirmed = window.confirm(
      "Are you sure you want to submit this invoice for administrator approval?"
    );

    if (!confirmed) return;

    setLoading(true);
    setMessage("");
    setError(false);

    try {
      const result = await submitInvoiceForApproval(invoiceId);

      if (!result.success) {
        setError(true);
        setMessage(result.message);
        return;
      }

      setMessage("Invoice submitted successfully.");
      router.refresh();
    } catch {
      setError(true);
      setMessage("Unable to submit invoice. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="print:hidden">
      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg bg-[#142B49] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#203F63] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Send size={17} />
        {loading ? "Submitting..." : "Submit for Approval"}
      </button>

      {message && (
        <p
          className={`mt-2 text-xs ${
            error ? "text-red-600" : "text-green-700"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
