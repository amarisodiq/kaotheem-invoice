
"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordInvoicePayment } from "@/app/(dashboard)/invoices/actions";

type Payment = {
  id: string;
  invoice_id: string;
  amount: number;
  currency: string;
  payment_date: string;
  payment_method: string | null;
  reference: string | null;
};

type Invoice = {
  id: string;
  invoice_number: string | null;
  total: number;
  currency: string;
  status: string;
};

type Props = {
  payments: Payment[];
  invoices: Invoice[];
  isAdmin: boolean;
};

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function localDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function PaymentsManagement({
  payments,
  invoices,
  isAdmin,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [invoiceId, setInvoiceId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(localDate());
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");
  const [reference, setReference] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const paymentTotals = useMemo(() => {
    const totals = new Map<string, number>();

    payments.forEach((payment) => {
      totals.set(
        payment.invoice_id,
        (totals.get(payment.invoice_id) ?? 0) +
          Number(payment.amount)
      );
    });

    return totals;
  }, [payments]);

  const selectedInvoice = invoices.find(
    (invoice) => invoice.id === invoiceId
  );

  const outstandingInvoices = invoices.filter((invoice) => {
    const paid = paymentTotals.get(invoice.id) ?? 0;
    return (
      ["approved", "partially_paid"].includes(invoice.status) &&
      Number(invoice.total) - paid > 0
    );
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setIsError(false);

    if (!invoiceId || !amount || !paymentDate || !paymentMethod.trim()) {
      setMessage("Please complete all required fields.");
      setIsError(true);
      return;
    }

    startTransition(async () => {
      const result = await recordInvoicePayment({
        invoiceId,
        amount: Number(amount),
        paymentDate,
        paymentMethod,
        reference,
      });

      setMessage(result.message);
      setIsError(!result.success);

      if (result.success) {
        setInvoiceId("");
        setAmount("");
        setReference("");
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage invoice payments and track payment history.
        </p>
      </div>

      {isAdmin && (
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Record a Payment
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Record a payment received for an approved invoice.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Select Invoice
              </label>
              <select
                value={invoiceId}
                onChange={(event) => setInvoiceId(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm"
                required
              >
                <option value="">Choose an invoice</option>
                {outstandingInvoices.map((invoice) => {
                  const paid = paymentTotals.get(invoice.id) ?? 0;
                  const balance = Number(invoice.total) - paid;

                  return (
                    <option key={invoice.id} value={invoice.id}>
                      {invoice.invoice_number || "Unnumbered"} — Balance:{" "}
                      {formatMoney(balance, invoice.currency)}
                    </option>
                  );
                })}
              </select>
            </div>

            {selectedInvoice && (
              <div className="rounded-lg bg-gray-50 p-4 text-sm">
                <p className="text-gray-500">Outstanding balance</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  {formatMoney(
                    Number(selectedInvoice.total) -
                      (paymentTotals.get(selectedInvoice.id) ?? 0),
                    selectedInvoice.currency
                  )}
                </p>
              </div>
            )}

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Amount Received
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="Enter amount"
                  className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Payment Date
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(event) => setPaymentDate(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm"
                >
                  <option>Bank Transfer</option>
                  <option>Cash</option>
                  <option>Card</option>
                  <option>Cheque</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Payment Reference
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  placeholder="Transaction reference (optional)"
                  className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm"
                />
              </div>
            </div>

            {message && (
              <p className={`text-sm ${isError ? "text-red-600" : "text-green-600"}`}>
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-blue-900 px-5 py-3 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {isPending ? "Recording..." : "Record Payment"}
            </button>
          </form>
        </section>
      )}

      <section className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Payment History
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {payments.length} payment record(s)
          </p>
        </div>

        {payments.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            No payment records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-6 py-4 font-medium">Invoice</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Method</th>
                  <th className="px-6 py-4 font-medium">Reference</th>
                  <th className="px-6 py-4 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((payment) => {
                  const invoice = invoices.find(
                    (item) => item.id === payment.invoice_id
                  );

                  return (
                    <tr key={payment.id}>
                      <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900">
                        {invoice?.invoice_number || "Invoice"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-gray-600">
                        {payment.payment_date}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {payment.payment_method || "—"}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {payment.reference || "—"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right font-semibold text-gray-900">
                        {formatMoney(Number(payment.amount), payment.currency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
