
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";

import {
  approveInvoice,
  rejectInvoice,
} from "@/app/(dashboard)/invoices/actions";

export default function InvoiceApprovalActions({
  invoiceId,
}: {
  invoiceId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [reason, setReason] = useState("");

  function handleApprove() {
    const confirmed = window.confirm(
      "Approve this invoice and generate its official KES reference?"
    );

    if (!confirmed) return;

    setMessage("");

    startTransition(async () => {
      const result = await approveInvoice(invoiceId);
      setMessage(result.message);

      if (result.success) {
        router.refresh();
      }
    });
  }

  function handleReject() {
    if (!reason.trim()) {
      setMessage("Please provide a reason for rejecting this invoice.");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to reject this invoice?"
    );

    if (!confirmed) return;

    setMessage("");

    startTransition(async () => {
      const result = await rejectInvoice(invoiceId, reason);
      setMessage(result.message);

      if (result.success) {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-3 print:hidden">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleApprove}
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-5 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
        >
          {isPending ? (
            <Loader2 size={17} className="animate-spin" />
          ) : (
            <CheckCircle size={17} />
          )}
          Approve Invoice
        </button>

        <button
          type="button"
          onClick={() => {
            setMessage("");
            setShowRejectForm(!showRejectForm);
          }}
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-5 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
        >
          <XCircle size={17} />
          Reject Invoice
        </button>
      </div>

      {showRejectForm && (
        <div className="w-full max-w-md rounded-xl border border-red-200 bg-red-50 p-4">
          <label
            htmlFor="rejection-reason"
            className="mb-2 block text-sm font-semibold text-slate-800"
          >
            Reason for rejection
          </label>

          <textarea
            id="rejection-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={1000}
            rows={4}
            placeholder="Explain why this invoice needs correction..."
            className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm outline-none focus:border-red-500"
          />

          <p className="mt-1 text-right text-xs text-slate-500">
            {reason.length}/1000
          </p>

          <button
            type="button"
            onClick={handleReject}
            disabled={isPending || !reason.trim()}
            className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending && (
              <Loader2 size={17} className="animate-spin" />
            )}
            Confirm Rejection
          </button>
        </div>
      )}

      {message && (
        <p className="max-w-md text-sm text-slate-600">
          {message}
        </p>
      )}
    </div>
  );
}
