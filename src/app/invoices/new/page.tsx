
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Trash2,
  FileText,
  Calculator,
  Save,
  Send,
} from "lucide-react";
import Link from "next/link";
import {
  saveInvoice,
  submitInvoiceForApproval,
} from "../actions";

type InvoiceItem = {
  id: number;
  description: string;
  quantity: number;
  price: number;
};

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#142B49] focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100";

const labelClass =
  "mb-2 block text-sm font-medium text-slate-700";

function getLocalDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function NewInvoicePage() {
  const router = useRouter();

  const [currency, setCurrency] = useState("NGN");
  const [customer, setCustomer] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(getLocalDate);
  const [dueDate, setDueDate] = useState("");

  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: 1,
      description: "",
      quantity: 1,
      price: 0,
    },
  ]);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] =
    useState<"error" | "success">("error");

  const [savedInvoiceId, setSavedInvoiceId] =
    useState<string | null>(null);

  // VAT remains disabled until an administrator enables it.
  const vatEnabled = false;
  const vatRate = 7.5;

  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0
  );

  const vat = vatEnabled ? subtotal * (vatRate / 100) : 0;
  const total = subtotal + vat;

  const symbols: Record<string, string> = {
    NGN: "₦",
    USD: "$",
    GBP: "£",
    EUR: "€",
  };

  const symbol = symbols[currency];

  const addItem = () => {
    if (savedInvoiceId) return;

    setItems((current) => [
      ...current,
      {
        id: Date.now(),
        description: "",
        quantity: 1,
        price: 0,
      },
    ]);
  };

  const updateItem = (
    id: number,
    field: keyof InvoiceItem,
    value: string | number
  ) => {
    if (savedInvoiceId) return;

    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const removeItem = (id: number) => {
    if (savedInvoiceId) return;

    setItems((current) =>
      current.filter((item) => item.id !== id)
    );
  };

  const formatMoney = (amount: number) =>
    `${symbol}${amount.toLocaleString("en-NG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const isFormValid =
    customer.trim().length > 0 &&
    items.length > 0 &&
    items.every(
      (item) =>
        item.description.trim().length > 0 &&
        Number.isFinite(item.quantity) &&
        Number.isFinite(item.price) &&
        item.quantity > 0 &&
        item.price > 0
    ) &&
    (!dueDate || dueDate >= invoiceDate);

  async function handleSaveDraft() {
    if (!isFormValid || saving || savedInvoiceId) return;

    setSaving(true);
    setMessage("");

    try {
      const result = await saveInvoice({
        customer,
        email,
        phone,
        address,
        currency,
        invoiceDate,
        dueDate,
        items: items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          price: item.price,
        })),
      });

      if (!result.success) {
        setMessageType("error");
        setMessage(result.message);
        return;
      }

      setMessageType("success");
      setMessage("Invoice saved successfully. Redirecting...");

      router.push("/invoices");
      router.refresh();
    } catch (error) {
      console.error("Save invoice error:", error);

      setMessageType("error");
      setMessage(
        "Something went wrong while saving. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmitForApproval() {
    if (!isFormValid || saving) return;

    setSaving(true);
    setMessage("");

    try {
      let invoiceId = savedInvoiceId;

      // Save the invoice first if it has not already been saved.
      if (!invoiceId) {
        const saveResult = await saveInvoice({
          customer,
          email,
          phone,
          address,
          currency,
          invoiceDate,
          dueDate,
          items: items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            price: item.price,
          })),
        });

        if (!saveResult.success) {
          setMessageType("error");
          setMessage(saveResult.message);
          return;
        }

        invoiceId = saveResult.invoiceId;

        setSavedInvoiceId(invoiceId);
      }

      if (!invoiceId) {
        setMessageType("error");
        setMessage("Unable to identify the saved invoice.");
        return;
      }

      // Submit the saved invoice through the secure database function.
      const submitResult =
        await submitInvoiceForApproval(invoiceId);

      if (!submitResult.success) {
        setMessageType("error");
        setMessage(
          `Your invoice was saved as a draft, but submission failed: ${submitResult.message}`
        );
        return;
      }

      setMessageType("success");
      setMessage(
        "Invoice submitted successfully. Redirecting..."
      );

      router.push(`/invoices/${invoiceId}`);
      router.refresh();
    } catch (error) {
      console.error("Invoice submission error:", error);

      setMessageType("error");
      setMessage(
        "Something went wrong while submitting the invoice. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-5 md:p-8">
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft size={17} />
            Back to Dashboard
          </Link>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Create New Invoice
              </h1>

              <p className="mt-1 text-sm text-slate-600">
                Prepare an invoice for administrator review.
              </p>
            </div>

            <span className="rounded-full bg-amber-100 px-4 py-2 text-xs font-semibold text-amber-800">
              {savedInvoiceId ? "SAVED DRAFT" : "DRAFT"}
            </span>
          </div>
        </div>

        <div className="space-y-6">

          {/* Invoice Information */}
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2 text-[#142B49]">
                <FileText size={21} />
              </div>

              <div>
                <h2 className="font-semibold text-slate-900">
                  Invoice Information
                </h2>

                <p className="text-xs text-slate-600">
                  Set the invoice currency and payment deadline.
                </p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className={labelClass}>
                  Invoice Reference
                </label>

                <input
                  disabled
                  value="Generated when approved"
                  className="w-full rounded-lg border border-slate-300 bg-slate-100 px-4 py-3 text-sm text-slate-700"
                />
              </div>

              <div>
                <label className={labelClass}>Currency</label>

                <select
                  value={currency}
                  disabled={Boolean(savedInvoiceId)}
                  onChange={(e) => setCurrency(e.target.value)}
                  className={inputClass}
                >
                  <option value="NGN">NGN — Nigerian Naira</option>
                  <option value="USD">USD — US Dollar</option>
                  <option value="GBP">GBP — British Pound</option>
                  <option value="EUR">EUR — Euro</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>Invoice Date</label>

                <input
                  type="date"
                  value={invoiceDate}
                  disabled={Boolean(savedInvoiceId)}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Due Date</label>

                <input
                  type="date"
                  min={invoiceDate}
                  value={dueDate}
                  disabled={Boolean(savedInvoiceId)}
                  onChange={(e) => setDueDate(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          {/* Customer Information */}
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-1 font-semibold text-slate-900">
              Customer Information
            </h2>

            <p className="mb-6 text-xs text-slate-600">
              Enter the details of the customer receiving this invoice.
            </p>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className={labelClass}>
                  Customer / Company Name *
                </label>

                <input
                  value={customer}
                  disabled={Boolean(savedInvoiceId)}
                  onChange={(e) => setCustomer(e.target.value)}
                  placeholder="Enter customer name"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Email Address</label>

                <input
                  type="email"
                  value={email}
                  disabled={Boolean(savedInvoiceId)}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="customer@company.com"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Phone Number</label>

                <input
                  type="tel"
                  value={phone}
                  disabled={Boolean(savedInvoiceId)}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+234..."
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Customer Address</label>

                <input
                  value={address}
                  disabled={Boolean(savedInvoiceId)}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Customer business address"
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          {/* Invoice Items */}
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-slate-900">
                  Invoice Items
                </h2>

                <p className="mt-1 text-xs text-slate-600">
                  Add products, inspection services or other charges.
                </p>
              </div>

              <button
                type="button"
                onClick={addItem}
                disabled={Boolean(savedInvoiceId)}
                className="flex items-center gap-2 rounded-lg bg-[#142B49] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#203F63] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus size={17} />
                Add Item
              </button>
            </div>

            <div className="space-y-4">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-slate-200 p-4"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-800">
                      Item {index + 1}
                    </span>

                    {items.length > 1 && (
                      <button
                        type="button"
                        disabled={Boolean(savedInvoiceId)}
                        onClick={() => removeItem(item.id)}
                        className="text-red-600 transition hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Remove item"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-12">
                    <div className="md:col-span-6">
                      <label className="mb-2 block text-xs font-medium text-slate-700">
                        Description
                      </label>

                      <input
                        value={item.description}
                        disabled={Boolean(savedInvoiceId)}
                        onChange={(e) =>
                          updateItem(
                            item.id,
                            "description",
                            e.target.value
                          )
                        }
                        placeholder="e.g. Ultrasonic Testing Services"
                        className={inputClass}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-2 block text-xs font-medium text-slate-700">
                        Quantity
                      </label>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.quantity}
                        disabled={Boolean(savedInvoiceId)}
                        onChange={(e) =>
                          updateItem(
                            item.id,
                            "quantity",
                            Number(e.target.value)
                          )
                        }
                        className={inputClass}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-2 block text-xs font-medium text-slate-700">
                        Unit Price
                      </label>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.price}
                        disabled={Boolean(savedInvoiceId)}
                        onChange={(e) =>
                          updateItem(
                            item.id,
                            "price",
                            Number(e.target.value)
                          )
                        }
                        className={inputClass}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-2 block text-xs font-medium text-slate-700">
                        Amount
                      </label>

                      <div className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-3 text-sm font-semibold text-slate-900">
                        {formatMoney(item.quantity * item.price)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Invoice Summary */}
          <section className="flex justify-end">
            <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-2">
                <Calculator size={20} className="text-[#142B49]" />

                <h2 className="font-semibold text-slate-900">
                  Invoice Summary
                </h2>
              </div>

              <div className="space-y-4 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>

                  <span className="font-medium text-slate-900">
                    {formatMoney(subtotal)}
                  </span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>VAT ({vatRate}%)</span>

                  <span className="font-medium text-slate-900">
                    {formatMoney(vat)}
                  </span>
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <div className="flex justify-between text-lg font-bold text-slate-900">
                    <span>Total</span>

                    <span className="text-[#142B49]">
                      {formatMoney(total)}
                    </span>
                  </div>
                </div>
              </div>

              {!vatEnabled && (
                <p className="mt-4 text-xs text-slate-500">
                  VAT is currently disabled by system configuration.
                </p>
              )}
            </div>
          </section>

          {/* Feedback */}
          {message && (
            <div
              role="status"
              aria-live="polite"
              className={`rounded-lg border p-4 text-sm ${
                messageType === "success"
                  ? "border-green-200 bg-green-50 text-green-800"
                  : "border-red-200 bg-red-50 text-red-800"
              }`}
            >
              {message}
            </div>
          )}

          {/* Form Actions */}
          <section className="flex flex-wrap justify-end gap-3 pb-10">
            <Link
              href="/"
              className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Cancel
            </Link>

            <button
              type="button"
              disabled={!isFormValid || saving || Boolean(savedInvoiceId)}
              onClick={handleSaveDraft}
              className="flex items-center gap-2 rounded-lg bg-[#142B49] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#203F63] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save size={17} />
              {saving ? "Processing..." : "Save Draft"}
            </button>

            <button
              type="button"
              disabled={!isFormValid || saving}
              onClick={handleSubmitForApproval}
              className="flex items-center gap-2 rounded-lg bg-emerald-700 px-5 py-3 text-sm font-medium text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send size={17} />
              {saving
                ? "Processing..."
                : savedInvoiceId
                  ? "Retry Submission"
                  : "Submit for Approval"}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
