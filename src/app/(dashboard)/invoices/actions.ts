"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function writeAuditLog(input: {
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, unknown>;
}) {
  try {
    const adminClient = createAdminClient();

    const { error } = await adminClient.from("audit_logs").insert({
      user_id: input.userId,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      details: input.details ?? {},
    });

    if (error) {
      console.error("Audit log error:", error);
    }
  } catch (error) {
    console.error("Audit log failure:", error);
  }
}

export type InvoiceItemInput = {
  description: string;
  quantity: number;
  uom: string;
  price: number;
};

export type SaveInvoiceInput = {
  customerId?: string;
  customer: string;
  email: string;
  phone: string;
  address: string;
  currency: string;
  paymentAccount: "product" | "equipment";
  invoiceDate: string;
  dueDate: string;
  items: InvoiceItemInput[];
};

const ALLOWED_CURRENCIES = ["NGN", "USD", "GBP", "EUR"];

const ALLOWED_UOMS = [
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
];

async function getAuthenticatedUser() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  const claims = error ? null : data?.claims;

  if (!claims || typeof claims.sub !== "string") {
    return {
      supabase,
      userId: null,
    };
  }

  return {
    supabase,
    userId: claims.sub,
  };
}

async function isAdministrator(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  return !error && profile?.role === "admin";
}

// SAVE A NEW INVOICE AS DRAFT

export async function saveInvoice(input: SaveInvoiceInput) {
  const { supabase, userId } = await getAuthenticatedUser();

  if (!userId) {
    return {
      success: false,
      message: "Your session has expired. Please sign in again.",
    };
  }

  if (!input.customerId) {
    return {
      success: false,
      message: "Please select a registered customer.",
    };
  }

  if (!ALLOWED_CURRENCIES.includes(input.currency)) {
    return {
      success: false,
      message: "Invalid invoice currency.",
    };
  }

  if (!["product", "equipment"].includes(input.paymentAccount)) {
    return {
      success: false,
      message: "Please select a valid payment account.",
    };
  }

  if (!input.items?.length || input.items.length > 100) {
    return {
      success: false,
      message: "Add between 1 and 100 invoice items.",
    };
  }

  const validItems = input.items.filter(
    (item) =>
      item.description?.trim() &&
      ALLOWED_UOMS.includes(item.uom) &&
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
    (input.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate))
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

  const { data: invoiceId, error } = await supabase.rpc(
    "save_invoice_with_items",
    {
      p_customer_id: input.customerId,
      p_currency: input.currency,
      p_payment_account: input.paymentAccount,
      p_invoice_date: input.invoiceDate,
      p_due_date: input.dueDate || null,
      p_items: validItems.map((item) => ({
        description: item.description.trim(),
        quantity: item.quantity,
        uom: item.uom,
        price: item.price,
      })),
    }
  );

  if (error || !invoiceId) {
    console.error("Invoice saving error:", error);

    return {
      success: false,
      message: error?.message || "Unable to save invoice. Please try again.",
    };
  }

  revalidatePath("/invoices");
  revalidatePath("/customers");
  revalidatePath("/");

  return {
    success: true,
    invoiceId,
    message: "Invoice and items saved successfully as a draft.",
  };
}

// SUBMIT A NEW DRAFT FOR APPROVAL
export async function submitInvoiceForApproval(invoiceId: string) {
  const { supabase, userId } = await getAuthenticatedUser();

  if (!userId) {
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

  const { data, error } = await supabase.rpc("submit_invoice_for_approval", {
    p_invoice_id: invoiceId,
  });

  if (error) {
    console.error("Invoice submission error:", error);

    return {
      success: false,
      message:
        "The invoice could not be submitted. It may already have been submitted or may not belong to your account.",
    };
  }

  await writeAuditLog({
    userId,
    action: "submitted_for_approval",
    entityType: "invoice",
    entityId: invoiceId,
  });

  revalidatePath("/approvals");
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);

  return {
    success: true,
    message:
      typeof data === "string"
        ? data
        : "Invoice submitted for administrator approval.",
  };
}

// APPROVE AN INVOICE
export async function approveInvoice(invoiceId: string) {
  const { supabase, userId } = await getAuthenticatedUser();

  if (!userId) {
    return {
      success: false,
      message: "Your session has expired. Please sign in again.",
    };
  }

  if (!(await isAdministrator(supabase, userId))) {
    return {
      success: false,
      message: "Only administrators can approve invoices.",
    };
  }

  if (!invoiceId) {
    return {
      success: false,
      message: "Invalid invoice reference.",
    };
  }

  const { data, error } = await supabase.rpc("approve_invoice", {
    p_invoice_id: invoiceId,
  });

  if (error) {
    console.error("Invoice approval error:", error);

    return {
      success: false,
      message: "Unable to approve this invoice. Please try again.",
    };
  }

  await writeAuditLog({
    userId,
    action: "approved_invoice",
    entityType: "invoice",
    entityId: invoiceId,
  });

  revalidatePath("/approvals");
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);

  return {
    success: true,
    message: typeof data === "string" ? data : "Invoice approved successfully.",
  };
}

// REJECT AN INVOICE
export async function rejectInvoice(invoiceId: string, reason: string) {
  const { supabase, userId } = await getAuthenticatedUser();

  if (!userId) {
    return {
      success: false,
      message: "Your session has expired. Please sign in again.",
    };
  }

  if (!(await isAdministrator(supabase, userId))) {
    return {
      success: false,
      message: "Only administrators can reject invoices.",
    };
  }

  if (!invoiceId || !reason.trim()) {
    return {
      success: false,
      message: "Please provide a rejection reason.",
    };
  }

  if (reason.trim().length > 1000) {
    return {
      success: false,
      message: "The rejection reason must be 1000 characters or fewer.",
    };
  }

  const { data, error } = await supabase
    .from("invoices")
    .update({
      status: "rejected",
      rejection_reason: reason.trim(),
    })
    .eq("id", invoiceId)
    .eq("status", "pending_approval")
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return {
      success: false,
      message: "Unable to reject this invoice. Check its current status.",
    };
  }

  await writeAuditLog({
    userId,
    action: "rejected_invoice",
    entityType: "invoice",
    entityId: invoiceId,
    details: {
      reason: reason.trim(),
    },
  });

  revalidatePath("/approvals");
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);

  return {
    success: true,
    message: "Invoice rejected successfully.",
  };
}

// UPDATE A REJECTED INVOICE
export async function updateRejectedInvoice(
  invoiceId: string,
  input: {
    invoiceDate: string;
    dueDate: string;
    currency: string;
    items: {
      description: string;
      quantity: number;
      uom: string;
      price: number;
    }[];
  }
) {
  const { supabase, userId } = await getAuthenticatedUser();

  if (!userId) {
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

  if (!ALLOWED_CURRENCIES.includes(input.currency)) {
    return {
      success: false,
      message: "Invalid invoice currency.",
    };
  }

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(input.invoiceDate) ||
    (input.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate))
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

  if (!input.items?.length || input.items.length > 100) {
    return {
      success: false,
      message: "Add between 1 and 100 invoice items.",
    };
  }

  const validItems = input.items.filter(
    (item) =>
      item.description?.trim() &&
      ALLOWED_UOMS.includes(item.uom) &&
      Number.isFinite(item.quantity) &&
      Number.isFinite(item.price) &&
      item.quantity > 0 &&
      item.price > 0
  );

  if (validItems.length !== input.items.length) {
    return {
      success: false,
      message: "Check every item description, quantity and price.",
    };
  }

  const { error } = await supabase.rpc("update_rejected_invoice", {
    p_invoice_id: invoiceId,
    p_invoice_date: input.invoiceDate,
    p_due_date: input.dueDate || null,
    p_currency: input.currency,
    p_items: validItems,
  });

  if (error) {
    console.error("Update rejected invoice error:", error);

    return {
      success: false,
      message: error.message || "Unable to update this invoice.",
    };
  }

  await writeAuditLog({
    userId,
    action: "updated_rejected_invoice",
    entityType: "invoice",
    entityId: invoiceId,
  });

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/approvals");

  return {
    success: true,
    message: "Invoice updated successfully.",
  };
}

// ADMIN UPDATE AN APPROVED INVOICE
export async function adminUpdateApprovedInvoice(
  invoiceId: string,
  input: {
    invoiceDate: string;
    dueDate: string;
    currency: string;
    items: InvoiceItemInput[];
  }
) {
  const { supabase, userId } = await getAuthenticatedUser();

  if (!userId) {
    return {
      success: false,
      message: "Your session has expired. Please sign in again.",
    };
  }

  if (!(await isAdministrator(supabase, userId))) {
    return {
      success: false,
      message: "Only administrators can edit approved invoices.",
    };
  }

  if (!invoiceId) {
    return {
      success: false,
      message: "Invalid invoice reference.",
    };
  }

  if (!ALLOWED_CURRENCIES.includes(input.currency)) {
    return {
      success: false,
      message: "Invalid invoice currency.",
    };
  }

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(input.invoiceDate) ||
    (input.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate))
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

  if (!input.items?.length || input.items.length > 100) {
    return {
      success: false,
      message: "Add between 1 and 100 invoice items.",
    };
  }

  const validItems = input.items.filter(
    (item) =>
      item.description?.trim() &&
      ALLOWED_UOMS.includes(item.uom) &&
      Number.isFinite(item.quantity) &&
      Number.isFinite(item.price) &&
      item.quantity > 0 &&
      item.price > 0
  );

  if (validItems.length !== input.items.length) {
    return {
      success: false,
      message: "Check every item description, quantity and price.",
    };
  }

  const { data, error } = await supabase.rpc("admin_update_approved_invoice", {
    p_invoice_id: invoiceId,
    p_invoice_date: input.invoiceDate,
    p_due_date: input.dueDate || null,
    p_currency: input.currency,
    p_items: validItems,
  });

  if (error) {
    console.error("Approved invoice update error:", error);

    return {
      success: false,
      message: error.message || "Unable to update this invoice.",
    };
  }

  await writeAuditLog({
    userId,
    action: "updated_approved_invoice",
    entityType: "invoice",
    entityId: invoiceId,
  });

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/approvals");

  return {
    success: true,
    message:
      typeof data === "string"
        ? data
        : "Approved invoice updated successfully.",
  };
}

// RESUBMIT A CORRECTED REJECTED INVOICE
export async function resubmitRejectedInvoice(invoiceId: string) {
  const { supabase, userId } = await getAuthenticatedUser();

  if (!userId) {
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

  const { data, error } = await supabase.rpc("resubmit_rejected_invoice", {
    p_invoice_id: invoiceId,
  });

  if (error) {
    console.error("Resubmission error:", error);

    return {
      success: false,
      message: error.message || "Unable to resubmit this invoice.",
    };
  }

  await writeAuditLog({
    userId,
    action: "resubmitted_invoice",
    entityType: "invoice",
    entityId: invoiceId,
  });

  revalidatePath("/approvals");
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);

  return {
    success: true,
    message:
      typeof data === "string" ? data : "Invoice resubmitted successfully.",
  };
}

// INVITE A NEW STAFF MEMBER
export async function inviteStaffMember(fullName: string, email: string) {
  const { supabase, userId } = await getAuthenticatedUser();

  if (!userId) {
    return {
      success: false,
      message: "Your session has expired. Please sign in again.",
    };
  }

  if (!(await isAdministrator(supabase, userId))) {
    return {
      success: false,
      message: "Only administrators can invite staff members.",
    };
  }

  const cleanName = fullName.trim();
  const cleanEmail = email.trim().toLowerCase();

  if (!cleanName || !cleanEmail) {
    return {
      success: false,
      message: "Please enter the staff member's name and email.",
    };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return {
      success: false,
      message: "Please enter a valid email address.",
    };
  }

  const adminClient = createAdminClient();

  const { data: usersData, error: usersError } =
    await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

  if (usersError) {
    console.error("Staff account lookup error:", usersError);

    return {
      success: false,
      message: "Unable to check existing staff accounts.",
    };
  }

  const existingUser = usersData.users.find(
    (user) => user.email?.toLowerCase() === cleanEmail
  );

  let staffUserId: string;

  if (existingUser) {
    staffUserId = existingUser.id;
  } else {
    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(
      cleanEmail,
      {
        data: {
          full_name: cleanName,
        },
      }
    );

    if (error || !data.user) {
      console.error("Staff invitation error:", error);

      return {
        success: false,
        message: error?.message || "Unable to invite this staff member.",
      };
    }

    staffUserId = data.user.id;
  }

  const { data: existingProfile, error: lookupError } = await adminClient
    .from("profiles")
    .select("id, role")
    .eq("id", staffUserId)
    .maybeSingle();

  if (lookupError) {
    return {
      success: false,
      message: "Unable to verify the existing profile.",
    };
  }

  if (existingProfile?.role === "admin") {
    return {
      success: false,
      message: "This account is already an administrator.",
    };
  }

  const { error: profileError } = await adminClient.from("profiles").upsert(
    {
      id: staffUserId,
      full_name: cleanName,
      role: "staff",
    },
    { onConflict: "id" }
  );

  if (profileError) {
    console.error("Staff profile creation error:", profileError);

    return {
      success: false,
      message: `Account exists, but profile creation failed: ${profileError.message}`,
    };
  }

  await writeAuditLog({
    userId,
    action: "invited_staff",
    entityType: "staff",
    entityId: staffUserId,
    details: {
      email: cleanEmail,
      fullName: cleanName,
    },
  });

  revalidatePath("/staff");

  return {
    success: true,
    message: existingUser
      ? `Staff profile created for ${cleanEmail}.`
      : `Invitation sent to ${cleanEmail}.`,
  };
}

// RECORD AN INVOICE PAYMENT
export async function recordInvoicePayment(input: {
  invoiceId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  reference: string;
}) {
  const { supabase, userId } = await getAuthenticatedUser();

  if (!userId) {
    return {
      success: false,
      message: "Your session has expired. Please sign in again.",
    };
  }

  if (!(await isAdministrator(supabase, userId))) {
    return {
      success: false,
      message: "Only administrators can record payments.",
    };
  }

  if (!input.invoiceId) {
    return {
      success: false,
      message: "Invalid invoice reference.",
    };
  }

  if (
    !Number.isFinite(input.amount) ||
    input.amount <= 0 ||
    input.amount > 999999999999
  ) {
    return {
      success: false,
      message: "Enter a valid payment amount.",
    };
  }

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(input.paymentDate) ||
    !Number.isFinite(Date.parse(`${input.paymentDate}T00:00:00Z`)) ||
    !input.paymentMethod.trim()
  ) {
    return {
      success: false,
      message: "Enter a valid payment date and payment method.",
    };
  }

  const { data, error } = await supabase.rpc("record_invoice_payment", {
    p_invoice_id: input.invoiceId,
    p_amount: input.amount,
    p_payment_date: input.paymentDate,
    p_payment_method: input.paymentMethod.trim(),
    p_reference: input.reference.trim() || null,
  });

  if (error) {
    console.error("Payment recording error:", error);

    return {
      success: false,
      message: error.message || "Unable to record payment.",
    };
  }

  await writeAuditLog({
    userId,
    action: "recorded_payment",
    entityType: "invoice",
    entityId: input.invoiceId,
    details: {
      amount: input.amount,
      paymentDate: input.paymentDate,
      paymentMethod: input.paymentMethod,
      reference: input.reference,
    },
  });

  revalidatePath("/payments");
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${input.invoiceId}`);
  revalidatePath("/");

  return {
    success: true,
    message: typeof data === "string" ? data : "Payment recorded successfully.",
  };
}

// UPDATE VAT SETTINGS
export async function updateVATSettings(input: {
  enabled: boolean;
  rate: number;
}) {
  const { supabase, userId } = await getAuthenticatedUser();

  if (!userId) {
    return {
      success: false,
      message: "Please sign in again.",
    };
  }

  if (!(await isAdministrator(supabase, userId))) {
    return {
      success: false,
      message: "Only administrators can update VAT settings.",
    };
  }

  if (!Number.isFinite(input.rate) || input.rate < 0 || input.rate > 100) {
    return {
      success: false,
      message: "VAT rate must be between 0 and 100.",
    };
  }

  const { data, error } = await supabase.rpc("update_vat_settings", {
    p_enabled: input.enabled,
    p_rate: input.rate,
  });

  if (error) {
    console.error("VAT settings error:", error);

    return {
      success: false,
      message: error.message,
    };
  }

  await writeAuditLog({
    userId,
    action: "updated_vat_settings",
    entityType: "company_settings",
    details: {
      enabled: input.enabled,
      rate: input.rate,
    },
  });

  revalidatePath("/settings");
  revalidatePath("/invoices/new");

  return {
    success: true,
    message:
      typeof data === "string" ? data : "VAT settings saved successfully.",
  };
}

// UPDATE PERSONAL PROFILE
export async function updatePersonalProfile(input: { fullName: string }) {
  const { supabase, userId } = await getAuthenticatedUser();

  if (!userId) {
    return {
      success: false,
      message: "Your session has expired. Please sign in again.",
    };
  }

  const fullName = input.fullName.trim();

  if (fullName.length < 2 || fullName.length > 100) {
    return {
      success: false,
      message: "Name must be between 2 and 100 characters.",
    };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", userId);

  if (error) {
    return {
      success: false,
      message: error.message,
    };
  }

  await writeAuditLog({
    userId,
    action: "updated_profile",
    entityType: "profile",
    entityId: userId,
    details: {
      fullName,
    },
  });

  revalidatePath("/settings");
  revalidatePath("/");

  return {
    success: true,
    message: "Your name has been updated successfully.",
  };
}
