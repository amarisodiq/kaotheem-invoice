
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type InvoiceItemInput = {
  description: string;
  quantity: number;
  price: number;
};

export type SaveInvoiceInput = {
  customerId?: string;
  customer: string;
  email: string;
  phone: string;
  address: string;
  currency: string;
  invoiceDate: string;
  dueDate: string;
  items: InvoiceItemInput[];
};

const ALLOWED_CURRENCIES = ["NGN", "USD", "GBP", "EUR"];

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

  if (!input.customer?.trim()) {
    return {
      success: false,
      message: "Customer name is required.",
    };
  }

  if (!ALLOWED_CURRENCIES.includes(input.currency)) {
    return {
      success: false,
      message: "Invalid invoice currency.",
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

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (profileError || !profile) {
    return {
      success: false,
      message: "Your user profile could not be verified.",
    };
  }

  // VERIFY THE SELECTED CUSTOMER OR FIND/CREATE A CUSTOMER
  let resolvedCustomerId: string;

  if (input.customerId) {
    const { data: selectedCustomer, error: customerError } = await supabase
      .from("customers")
      .select("id")
      .eq("id", input.customerId)
      .maybeSingle();

    if (customerError || !selectedCustomer) {
      return {
        success: false,
        message: "The selected customer could not be verified.",
      };
    }

    resolvedCustomerId = selectedCustomer.id;
  } else {
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
      resolvedCustomerId = existingCustomer.id;
    } else {
      const { data: newCustomer, error: customerError } = await supabase
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

      resolvedCustomerId = newCustomer.id;
    }
  }

  // CREATE THE INVOICE
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .insert({
      customer_id: resolvedCustomerId,
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

  // SAVE INVOICE LINE ITEMS
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
    console.error("Invoice items save error:", itemsError);

    return {
      success: false,
      invoiceId: invoice.id,
      message:
        "The invoice was created, but its items could not be saved. Please contact the administrator before retrying.",
    };
  }

  revalidatePath("/invoices");
  revalidatePath("/customers");

  return {
    success: true,
    invoiceId: invoice.id,
    message: "Invoice saved successfully as a draft.",
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

  revalidatePath("/approvals");
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);

  return {
    success: true,
    message:
      typeof data === "string" ? data : "Invoice approved successfully.",
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

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/approvals");

  return {
    success: true,
    message: "Invoice updated successfully.",
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

  const { error: profileError } = await adminClient.from("profiles").upsert(
    {
      id: staffUserId,
      full_name: cleanName,
      role: "staff",
    },
    {
      onConflict: "id",
    }
  );

  if (profileError) {
    console.error("Staff profile creation error:", profileError);

    return {
      success: false,
      message: `Account exists, but profile creation failed: ${profileError.message}`,
    };
  }

  revalidatePath("/staff");

  return {
    success: true,
    message: existingUser
      ? `Staff profile created for ${cleanEmail}.`
      : `Invitation sent to ${cleanEmail}.`,
  };
}
