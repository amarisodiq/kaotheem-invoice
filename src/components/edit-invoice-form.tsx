"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Save, Loader2 } from "lucide-react";
import {
  updateRejectedInvoice,
  adminUpdateApprovedInvoice,
  resubmitRejectedInvoice,
  submitInvoiceForApproval,
} from "@/app/(dashboard)/invoices/actions";

type InvoiceItem = {
  description: string;
  quantity: number;
  uom: string;
  price: number;
};

type Props = {
  invoiceId: string;
  status: "draft" | "rejected" | "approved";
  canSubmit: boolean;
  vatEnabled: boolean;
  vatRate: number;
  initialData: {
    currency: string;
    invoiceDate: string;
    dueDate: string;
    items: InvoiceItem[];
  };
};

const currencies = ["NGN", "USD", "GBP", "EUR"];

export default function EditInvoiceForm({
  invoiceId,
  status,
  canSubmit,
  vatEnabled,
  vatRate,
  initialData,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [currency, setCurrency] = useState(initialData.currency);
  const [invoiceDate, setInvoiceDate] = useState(initialData.invoiceDate);
  const [dueDate, setDueDate] = useState(initialData.dueDate);
  const [items, setItems] = useState<InvoiceItem[]>(initialData.items);
  const [message, setMessage] = useState("");

  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0
  );

  const vatAmount = vatEnabled
    ? Number(((subtotal * vatRate) / 100).toFixed(2))
    : 0;

  const total = subtotal + vatAmount;

  function updateItem(index: number, field: keyof InvoiceItem, value: string) {
    setItems((current) =>
      current.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]:
                field === "description" || field === "uom"
                  ? value
                  : Number(value),
            }
          : item
      )
    );
  }

  function addItem() {
    setItems((current) => [
      ...current,
      { description: "", quantity: 1, uom: "PCS", price: 0 },
    ]);
  }

  function removeItem(index: number) {
    setItems((current) => current.filter((_, i) => i !== index));
  }

  function validateForm() {
    if (!invoiceDate || !currency) {
      setMessage("Please complete the invoice date and currency.");
      return false;
    }

    if (dueDate && dueDate < invoiceDate) {
      setMessage("The due date cannot be before the invoice date.");
      return false;
    }

    if (
      items.length === 0 ||
      items.some(
        (item) =>
          !item.description.trim() ||
          !item.uom ||
          !Number.isFinite(item.quantity) ||
          !Number.isFinite(item.price) ||
          item.quantity <= 0 ||
          item.price <= 0
      )
    ) {
      setMessage(
        "Check every item. Descriptions, quantities and prices are required."
      );
      return false;
    }

    return true;
  }

  async function saveChanges() {
    const input = {
      invoiceDate,
      dueDate,
      currency,
      items,
    };

    if (status === "approved") {
      return await adminUpdateApprovedInvoice(invoiceId, input);
    }

    return await updateRejectedInvoice(invoiceId, input);
  }

  function handleSave() {
    setMessage("");

    if (!validateForm()) return;

    startTransition(async () => {
      const result = await saveChanges();

      setMessage(result.message);

      if (result.success) {
        router.refresh();
      }
    });
  }

  function handleSubmit() {
    setMessage("");

    if (!canSubmit) return;
    if (!validateForm()) return;

    startTransition(async () => {
      const saveResult = await saveChanges();

      if (!saveResult.success) {
        setMessage(saveResult.message);
        return;
      }

      const submitResult =
        status === "rejected"
          ? await resubmitRejectedInvoice(invoiceId)
          : await submitInvoiceForApproval(invoiceId);

      setMessage(submitResult.message);

      if (submitResult.success) {
        router.push(`/invoices/${invoiceId}`);
        router.refresh();
      }
    });
  }

  const isRejected = status === "rejected";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <div className="grid gap-5 md:grid-cols-3">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Invoice Date
          </label>
          <input
            type="date"
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
            disabled={isPending}
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Due Date
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            disabled={isPending}
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Currency
          </label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            disabled={isPending}
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm"
          >
            {currencies.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Invoice Items</h2>

          <button
            type="button"
            onClick={addItem}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-[#142B49] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Plus size={16} />
            Add Item
          </button>
        </div>

        <div className="space-y-4">
          {items.map((item, index) => (
            <div
              key={index}
              className="grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-12"
            >
              <div className="md:col-span-5">
                <label className="mb-1 block text-xs font-semibold text-slate-500">
                  Description
                </label>
                <input
                  value={item.description}
                  onChange={(e) =>
                    updateItem(index, "description", e.target.value)
                  }
                  disabled={isPending}
                  placeholder="Service description"
                  className="w-full rounded-lg border border-slate-300 px-3 py-3 text-sm"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-500">
                  Quantity
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={item.quantity}
                  onChange={(e) =>
                    updateItem(index, "quantity", e.target.value)
                  }
                  disabled={isPending}
                  className="w-full rounded-lg border border-slate-300 px-3 py-3 text-sm"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-500">
                  UOM
                </label>
                <select
                  value={item.uom}
                  onChange={(e) => updateItem(index, "uom", e.target.value)}
                  disabled={isPending}
                  className="w-full rounded-lg border border-slate-300 px-3 py-3 text-sm"
                >
                  {[
                    "PCS",
                    "LOT",
                    "SET",
                    "DAY",
                    "HR",
                    "MTR",
                    "KG",
                    "LTR",
                    "JOB",
                    "Other",
                  ].map((uom) => (
                    <option key={uom} value={uom}>
                      {uom}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3">
                <label className="mb-1 block text-xs font-semibold text-slate-500">
                  Unit Price
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={item.price}
                  onChange={(e) => updateItem(index, "price", e.target.value)}
                  disabled={isPending}
                  className="w-full rounded-lg border border-slate-300 px-3 py-3 text-sm"
                />
              </div>

              <div className="flex items-end justify-between md:col-span-2">
                <div>
                  <p className="text-xs text-slate-500">Amount</p>
                  <p className="font-bold text-slate-900">
                    {(item.quantity * item.price).toLocaleString()}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  disabled={isPending || items.length === 1}
                  className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:opacity-30"
                  aria-label="Remove item"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <div className="w-full max-w-sm rounded-xl bg-slate-50 p-5">
          <div className="flex justify-between text-sm text-slate-600">
            <span>Subtotal</span>
            <span>
              {currency}{" "}
              {subtotal.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>

          {vatEnabled && (
            <div className="mt-3 flex justify-between text-sm text-slate-600">
              <span>VAT ({vatRate}%)</span>
              <span>
                {currency}{" "}
                {vatAmount.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          )}

          <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 font-bold text-slate-900">
            <span>Total</span>
            <span>
              {currency}{" "}
              {total.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>
      </div>

      {message && (
        <p className="mt-5 rounded-lg bg-slate-100 p-4 text-sm text-slate-700">
          {message}
        </p>
      )}

      <div className="mt-8 flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 size={17} className="animate-spin" />
          ) : (
            <Save size={17} />
          )}
          {status === "approved"
            ? "Save Approved Invoice"
            : isRejected
            ? "Save Corrections"
            : "Save Draft"}
        </button>

        {canSubmit && status !== "approved" && (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="rounded-lg bg-[#142B49] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {isPending
              ? "Processing..."
              : isRejected
              ? "Save & Resubmit"
              : "Save & Submit for Approval"}
          </button>
        )}
      </div>
    </div>
  );
}
