"use client";

import { useEffect, useState } from "react";
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
import { createClient } from "@/lib/supabase/client";
import { saveInvoice, submitInvoiceForApproval } from "../actions";

type InvoiceItem = {
  id: number;
  description: string;
  quantity: number;
  uom: string;
  price: number;
};

type CustomerRecord = {
  id: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
};

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#142B49] focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100";

const labelClass = "mb-2 block text-sm font-medium text-slate-700";

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

  const [paymentAccount, setPaymentAccount] = useState<
    "product" | "equipment" | ""
  >("");

  // Customer selection
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [customersLoading, setCustomersLoading] = useState(true);
  const [customerLoadError, setCustomerLoadError] = useState("");

  // Customer details
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
      uom: "PCS",
      price: 0,
    },
  ]);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"error" | "success">("error");

  const [savedInvoiceId, setSavedInvoiceId] = useState<string | null>(null);

  // VAT remains disabled until an administrator enables it.
  const [vatEnabled, setVatEnabled] = useState(false);
  const [vatRate, setVatRate] = useState(7.5);
  const [vatLoading, setVatLoading] = useState(true);

  // Load existing customers from Supabase.
  useEffect(() => {
    async function loadCustomers() {
      try {
        const supabase = createClient();

        const { data, error } = await supabase
          .from("customers")
          .select("id, company_name, contact_name, email, phone, address")
          .order("company_name", { ascending: true });

        if (error) {
          console.error("Customer loading error:", error);
          setCustomerLoadError(
            "Unable to load customers. Please refresh the page."
          );
          return;
        }

        setCustomers(data ?? []);
      } catch (error) {
        console.error("Customer loading error:", error);
        setCustomerLoadError("Something went wrong while loading customers.");
      } finally {
        setCustomersLoading(false);
      }
    }

    void loadCustomers();
  }, []);

  useEffect(() => {
    async function loadVatSettings() {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("company_settings")
        .select("setting_value")
        .eq("setting_key", "vat")
        .maybeSingle();

      if (error) {
        console.error("VAT settings error:", error);
        setVatLoading(false);
        return;
      }

      const settings = data?.setting_value as {
        enabled?: boolean;
        rate?: number;
      } | null;

      setVatEnabled(settings?.enabled === true);
      setVatRate(Number(settings?.rate ?? 7.5));
      setVatLoading(false);
    }

    void loadVatSettings();
  }, []);

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

  const handleCustomerChange = (selectedId: string) => {
    setCustomerId(selectedId);

    const selectedCustomer = customers.find((item) => item.id === selectedId);

    if (!selectedCustomer) {
      setCustomer("");
      setEmail("");
      setPhone("");
      setAddress("");
      return;
    }

    setCustomer(selectedCustomer.company_name);
    setEmail(selectedCustomer.email ?? "");
    setPhone(selectedCustomer.phone ?? "");
    setAddress(selectedCustomer.address ?? "");
  };

  const addItem = () => {
    if (savedInvoiceId) return;

    setItems((current) => [
      ...current,
      {
        id: Date.now(),
        description: "",
        quantity: 1,
        uom: "PCS",
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

    setItems((current) => current.filter((item) => item.id !== id));
  };

  const formatMoney = (amount: number) =>
    `${symbol}${amount.toLocaleString("en-NG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const isFormValid =
    Boolean(customerId) &&
    Boolean(paymentAccount) &&
    customer.trim().length > 0;

  async function handleSaveDraft() {
    if (!isFormValid || saving || savedInvoiceId) return;

    setSaving(true);
    setMessage("");

    try {
      const result = await saveInvoice({
        customerId,
        customer,
        email,
        phone,
        address,
        currency,
        paymentAccount: paymentAccount as "product" | "equipment",
        invoiceDate,
        dueDate,
        items: items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          uom: item.uom,
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
      setMessage("Something went wrong while saving. Please try again.");
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
          customerId,
          customer,
          email,
          phone,
          address,
          currency,
          paymentAccount: paymentAccount as "product" | "equipment",
          invoiceDate,
          dueDate,
          items: items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            uom: item.uom,
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

      // Submit through the secure database function.
      const submitResult = await submitInvoiceForApproval(invoiceId);

      if (!submitResult.success) {
        setMessageType("error");
        setMessage(
          `Your invoice was saved as a draft, but submission failed: ${submitResult.message}`
        );
        return;
      }

      setMessageType("success");
      setMessage("Invoice submitted successfully. Redirecting...");

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
                <label className={labelClass}>Invoice Reference</label>

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
                <label className={labelClass}>Payment Account *</label>

                <select
                  value={paymentAccount}
                  disabled={Boolean(savedInvoiceId)}
                  onChange={(e) =>
                    setPaymentAccount(
                      e.target.value as "product" | "equipment" | ""
                    )
                  }
                  className={inputClass}
                >
                  <option value="">Select payment account</option>
                  <option value="product">
                    Product Payments — PremiumTrust Bank
                  </option>
                  <option value="equipment">
                    Service & Equipment Payments — Providus Bank
                  </option>
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
              Select a registered customer. Their information will be filled in
              automatically.
            </p>

            <div className="mb-5">
              <label className={labelClass}>Select Customer / Company *</label>

              <select
                value={customerId}
                disabled={Boolean(savedInvoiceId) || customersLoading}
                onChange={(e) => handleCustomerChange(e.target.value)}
                className={inputClass}
              >
                <option value="">
                  {customersLoading
                    ? "Loading customers..."
                    : "Select a customer"}
                </option>

                {customers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.company_name}
                  </option>
                ))}
              </select>

              {customerLoadError && (
                <p className="mt-2 text-sm text-red-600">{customerLoadError}</p>
              )}

              {!customersLoading &&
                !customerLoadError &&
                customers.length === 0 && (
                  <p className="mt-2 text-sm text-amber-700">
                    No customers have been registered yet.{" "}
                    <Link href="/customers" className="font-semibold underline">
                      Add a customer
                    </Link>{" "}
                    before creating an invoice.
                  </p>
                )}

              {!customersLoading &&
                customers.length > 0 &&
                !customerLoadError && (
                  <p className="mt-2 text-xs text-slate-500">
                    Need to register another customer?{" "}
                    <Link
                      href="/customers"
                      className="font-semibold text-[#142B49] underline"
                    >
                      Manage customers
                    </Link>
                  </p>
                )}
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className={labelClass}>Customer / Company Name</label>

                <input
                  value={customer}
                  readOnly
                  placeholder="Customer company name"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Email Address</label>

                <input
                  type="email"
                  value={email}
                  readOnly
                  placeholder="customer@company.com"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Phone Number</label>

                <input
                  type="tel"
                  value={phone}
                  readOnly
                  placeholder="Customer phone number"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Customer Address</label>

                <input
                  value={address}
                  readOnly
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
                <h2 className="font-semibold text-slate-900">Invoice Items</h2>

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
                          updateItem(item.id, "description", e.target.value)
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
                        UOM
                      </label>

                      <select
                        value={item.uom}
                        disabled={Boolean(savedInvoiceId)}
                        onChange={(e) =>
                          updateItem(item.id, "uom", e.target.value)
                        }
                        className={inputClass}
                      >
                        <option value="PCS">PCS</option>
                        <option value="LOT">LOT</option>
                        <option value="SET">SET</option>
                        <option value="DAY">DAY</option>
                        <option value="HR">HR</option>
                        <option value="MTR">MTR</option>
                        <option value="KG">KG</option>
                        <option value="LTR">LTR</option>
                        <option value="JOB">JOB</option>
                        <option value="Other">Other</option>
                      </select>
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
                          updateItem(item.id, "price", Number(e.target.value))
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

                    <span className="text-[#142B49]">{formatMoney(total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Feedback */}
          {!vatEnabled && (
            <p className="mt-4 text-xs text-slate-500">
              VAT is currently disabled by system configuration.
            </p>
          )}
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
              disabled={
                !isFormValid || saving || vatLoading || Boolean(savedInvoiceId)
              }
              onClick={handleSaveDraft}
              className="flex items-center gap-2 rounded-lg bg-[#142B49] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#203F63] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save size={17} />
              {saving ? "Processing..." : "Save Draft"}
            </button>

            <button
              type="button"
              disabled={!isFormValid || saving || vatLoading}
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
