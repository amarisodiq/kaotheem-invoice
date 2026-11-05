
"use client";

import { useMemo } from "react";

type Invoice = {
  id: string;
  invoice_number: string | null;
  status: string;
  currency: string;
  subtotal: number;
  vat_amount: number;
  total: number;
  invoice_date: string;
  due_date: string | null;
};

type Payment = {
  id: string;
  invoice_id: string;
  amount: number;
  currency: string;
  payment_date: string;
};

type Props = {
  invoices: Invoice[];
  payments: Payment[];
};

function money(amount: number, currency: string) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function ReportsManagement({
  invoices,
  payments,
}: Props) {
  const currencySummary = useMemo(() => {
    const currencies = new Set([
      ...invoices.map((invoice) => invoice.currency),
      ...payments.map((payment) => payment.currency),
    ]);

    return Array.from(currencies).sort().map((currency) => {
      const currencyInvoices = invoices.filter(
        (invoice) =>
          invoice.currency === currency &&
          ["approved", "partially_paid", "paid"].includes(invoice.status)
      );

      const currencyPayments = payments.filter(
        (payment) => payment.currency === currency
      );

      const totalInvoiced = currencyInvoices.reduce(
        (sum, invoice) => sum + Number(invoice.total),
        0
      );

      const totalVAT = currencyInvoices.reduce(
        (sum, invoice) => sum + Number(invoice.vat_amount),
        0
      );

      const totalCollected = currencyPayments.reduce(
        (sum, payment) => sum + Number(payment.amount),
        0
      );

      const outstanding = currencyInvoices
        .filter((invoice) =>
          ["approved", "partially_paid"].includes(invoice.status)
        )
        .reduce((sum, invoice) => {
          const paid = currencyPayments
            .filter((payment) => payment.invoice_id === invoice.id)
            .reduce((paymentSum, payment) => {
              return paymentSum + Number(payment.amount);
            }, 0);

          return sum + Math.max(0, Number(invoice.total) - paid);
        }, 0);

      return {
        currency,
        totalInvoiced,
        totalVAT,
        totalCollected,
        outstanding,
      };
    });
  }, [invoices, payments]);

  const monthlyPayments = useMemo(() => {
    const monthly = new Map<string, number>();

    payments.forEach((payment) => {
      const month = payment.payment_date.slice(0, 7);
      const key = `${month}|${payment.currency}`;

      monthly.set(
        key,
        (monthly.get(key) ?? 0) + Number(payment.amount)
      );
    });

    return Array.from(monthly.entries())
      .map(([key, amount]) => {
        const [month, currency] = key.split("|");
        return { month, currency, amount };
      })
      .sort((a, b) => b.month.localeCompare(a.month));
  }, [payments]);

  const totalInvoices = invoices.length;
  const paidInvoices = invoices.filter(
    (invoice) => invoice.status === "paid"
  ).length;
  const pendingInvoices = invoices.filter(
    (invoice) => invoice.status === "pending"
  ).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Financial Reports
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of invoice performance, payments and outstanding balances.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Total Invoices</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {totalInvoices}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Fully Paid Invoices</p>
          <p className="mt-2 text-3xl font-bold text-green-700">
            {paidInvoices}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Pending Approval</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">
            {pendingInvoices}
          </p>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Financial Summary
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Amounts are separated by currency.
          </p>
        </div>

        {currencySummary.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">
            No financial records available.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-6 py-4">Currency</th>
                  <th className="px-6 py-4">Total Invoiced</th>
                  <th className="px-6 py-4">VAT</th>
                  <th className="px-6 py-4">Collected</th>
                  <th className="px-6 py-4">Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {currencySummary.map((item) => (
                  <tr key={item.currency}>
                    <td className="px-6 py-4 font-semibold text-gray-900">
                      {item.currency}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {money(item.totalInvoiced, item.currency)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {money(item.totalVAT, item.currency)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 font-medium text-green-700">
                      {money(item.totalCollected, item.currency)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 font-medium text-amber-700">
                      {money(item.outstanding, item.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Monthly Payment Reports
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Payments received, grouped by month and currency.
          </p>
        </div>

        {monthlyPayments.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">
            No payments recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-6 py-4">Month</th>
                  <th className="px-6 py-4">Currency</th>
                  <th className="px-6 py-4 text-right">Amount Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {monthlyPayments.map((item) => (
                  <tr key={`${item.month}-${item.currency}`}>
                    <td className="px-6 py-4 text-gray-700">
                      {new Date(`${item.month}-02T00:00:00`).toLocaleDateString(
                        "en",
                        { month: "long", year: "numeric" }
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {item.currency}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right font-semibold text-gray-900">
                      {money(item.amount, item.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
