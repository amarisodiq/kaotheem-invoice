
"use server";

import { createClient } from "@/lib/supabase/server";

export type InvoiceItemInput = {
  description: string;
  quantity: number;
  price: number;
};

export type SaveInvoiceInput = {
  customer: string;
  email: string;
  phone: string;
  address: string;
  currency: string;
  invoiceDate: string;
  dueDate: string;
  items: InvoiceItemInput[];
};

export async function saveInvoice(input: SaveInvoiceInput) {
  const supabase = await createClient();

  // Verify the authenticated user
  const { data: authData, error: authError } =
    await supabase.auth.getClaims();

  const claims = authError ? null : authData?.claims;

  if (!claims || typeof claims.sub !== "string") {
    return {
      success: false,
      message: "Your session has expired. Please sign in again.",
    };
  }

  const userId = claims.sub;

  // Validate required information
  if (!input.customer?.trim()) {
    return {
      success: false,
      message: "Customer name is required.",
    };
  }

  const allowedCurrencies = ["NGN", "USD", "GBP", "EUR"];

  if (!allowedCurrencies.includes(input.currency)) {
    return {
      success: false,
      message: "Invalid invoice currency.",
    };
  }

  if (!input.items?.length || input.items.length > 100) {
    return {
      success: false,
      message: "Add at least one invoice item.",
    };
  }

  const validItems = input.items.filter(
    (item) =>
      item.description?.trim() &&
      Number.isFinite(item.quantity) &&
      Number.isFinite(item.price) &&
      item.quantity > 0 &&
      item.price > 0
  );

  if (validItems.length !== input.items.length) {
    return {
      success: false,
      message: "Check your invoice descriptions, quantities and prices.",
    };
  }

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(input.invoiceDate) ||
    (input.dueDate &&
      !/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate))
  ) {
    return {
      success: false,
      message: "Please enter valid invoice dates.",
    };
  }

  if (input.dueDate && input.dueDate < input.invoiceDate) {
    return {
      success: false,
      message: "The due date cannot be before the invoice date.",
    };
  }

  const subtotal = validItems.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0
  );

  if (!Number.isFinite(subtotal) || subtotal <= 0) {
    return {
      success: false,
      message: "The invoice total must be greater than zero.",
    };
  }

  // Verify the user's profile exists
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", userId)
    .maybeSingle();

  if (profileError || !profile) {
    return {
      success: false,
      message: "Your user profile could not be verified.",
    };
  }

  // Find an existing customer with the same company name.
  let customerId: string | null = null;

  const { data: existingCustomer, error: customerLookupError } =
    await supabase
      .from("customers")
      .select("id")
      .eq("company_name", input.customer.trim())
      .limit(1)
      .maybeSingle();

  if (customerLookupError) {
    return {
      success: false,
      message: "Unable to check existing customer records.",
    };
  }

  if (existingCustomer) {
    customerId = existingCustomer.id;
  } else {
    // Create a new customer
    const { data: newCustomer, error: customerError } =
      await supabase
        .from("customers")
        .insert({
          company_name: input.customer.trim(),
          contact_name: null,
          email: input.email.trim() || null,
          phone: input.phone.trim() || null,
          address: input.address.trim() || null,
          created_by: userId,
        })
        .select("id")
        .single();

    if (customerError || !newCustomer) {
      return {
        success: false,
        message: customerError?.message || "Unable to create customer.",
      };
    }

    customerId = newCustomer.id;
  }

  // Create the invoice as a draft.
  // Invoice number will be assigned by a database sequence later.
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .insert({
      customer_id: customerId,
      created_by: userId,
      status: "draft",
      currency: input.currency,
      invoice_date: input.invoiceDate,
      due_date: input.dueDate || null,
      subtotal,
      vat_enabled: false,
      vat_rate: 0,
      vat_amount: 0,
      total: subtotal,
    })
    .select("id")
    .single();

  if (invoiceError || !invoice) {
    return {
      success: false,
      message: invoiceError?.message || "Unable to save invoice.",
    };
  }

  // Save invoice line items
  const invoiceItems = validItems.map((item) => ({
    invoice_id: invoice.id,
    description: item.description.trim(),
    quantity: item.quantity,
    unit_price: item.price,
    line_total: item.quantity * item.price,
  }));

  const { error: itemsError } = await supabase
    .from("invoice_items")
    .insert(invoiceItems);

  if (itemsError) {
    return {
      success: false,
      message:
        "The invoice was created, but its items could not be saved. Please contact the administrator before retrying.",
    };
  }

  return {
    success: true,
    invoiceId: invoice.id,
    message: "Invoice saved successfully as a draft.",
  };
}

export async function submitInvoiceForApproval(invoiceId: string) {
  const supabase = await createClient();

  const { data: authData, error: authError } =
    await supabase.auth.getClaims();

  const claims = authError ? null : authData?.claims;

  if (!claims || typeof claims.sub !== "string") {
    return {
      success: false,
      message: "Your session has expired. Please sign in again.",
    };
  }

  if (!invoiceId) {
    return {
      success: false,
      message: "Invalid invoice reference.",
    };
  }

  const { data, error } = await supabase.rpc(
    "submit_invoice_for_approval",
    {
      p_invoice_id: invoiceId,
    }
  );

  if (error) {
    console.error("Invoice submission error:", error);

    return {
      success: false,
      message:
        "The invoice could not be submitted. It may already have been submitted or may not belong to your account.",
    };
  }

  return {
    success: true,
    message:
      typeof data === "string"
        ? data
        : "Invoice submitted for administrator approval.",
  };
}