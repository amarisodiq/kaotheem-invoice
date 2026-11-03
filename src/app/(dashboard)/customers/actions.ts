
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type CustomerInput = {
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  address: string;
};


async function getAuthorizedUser() {
  const supabase = await createClient();

  const { data, error: authError } = await supabase.auth.getClaims();

  const userId = data?.claims?.sub;

  if (authError || !userId) {
    throw new Error("You must be signed in.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (
    profileError ||
    !profile ||
    !["admin", "staff"].includes(profile.role)
  ) {
    throw new Error("You are not authorized to manage customers.");
  }

  return { supabase, userId };
}


function validateCustomer(input: CustomerInput) {
  if (!input.company_name.trim()) {
    throw new Error("Customer company name is required.");
  }

  if (!input.contact_name.trim()) {
    throw new Error("Contact name is required.");
  }

  if (!input.email.trim()) {
    throw new Error("Customer email is required.");
  }

  if (!input.phone.trim()) {
    throw new Error("Customer phone number is required.");
  }

  if (!input.address.trim()) {
    throw new Error("Customer address is required.");
  }
}

export async function createCustomer(input: CustomerInput) {
  const { supabase, userId } = await getAuthorizedUser();

  validateCustomer(input);

  const { error } = await supabase.from("customers").insert({
    company_name: input.company_name.trim(),
    contact_name: input.contact_name.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    address: input.address.trim(),
    created_by: userId,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/customers");

  return { success: true, message: "Customer added successfully." };
}

export async function updateCustomer(
  customerId: string,
  input: CustomerInput
) {
  const { supabase } = await getAuthorizedUser();

  if (!customerId) {
    throw new Error("Invalid customer record.");
  }

  validateCustomer(input);

  const { error } = await supabase
    .from("customers")
    .update({
      company_name: input.company_name.trim(),
      contact_name: input.contact_name.trim(),
      email: input.email.trim(),
      phone: input.phone.trim(),
      address: input.address.trim(),
    })
    .eq("id", customerId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/customers");
  revalidatePath("/invoices");

  return { success: true, message: "Customer updated successfully." };
}
