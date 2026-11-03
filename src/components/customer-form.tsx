
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCustomer, updateCustomer } from "@/app/(dashboard)/customers/actions";

type Customer = {
  id?: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  address: string;
};

type CustomerFormProps = {
  customer?: Customer;
  onCancel?: () => void;
};

const emptyCustomer: Customer = {
  company_name: "",
  contact_name: "",
  email: "",
  phone: "",
  address: "",
};

export default function CustomerForm({
  customer,
  onCancel,
}: CustomerFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<Customer>(customer ?? emptyCustomer);
  const [error, setError] = useState("");

  function handleChange(
    field: keyof Customer,
    value: string
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    startTransition(async () => {
      try {
        if (customer?.id) {
          await updateCustomer(customer.id, form);
        } else {
          await createCustomer(form);
        }

        router.refresh();
        onCancel?.();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong. Please try again."
        );
      }
    });
  }

  const fields: {
    name: keyof Customer;
    label: string;
    placeholder: string;
    type?: string;
  }[] = [
    {
      name: "company_name",
      label: "Company Name",
      placeholder: "Enter company name",
    },
    {
      name: "contact_name",
      label: "Contact Person",
      placeholder: "Enter contact person's name",
    },
    {
      name: "email",
      label: "Email Address",
      placeholder: "company@example.com",
      type: "email",
    },
    {
      name: "phone",
      label: "Phone Number",
      placeholder: "Enter phone number",
    },
    {
      name: "address",
      label: "Business Address",
      placeholder: "Enter full business address",
    },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {fields.map((field) => (
        <div key={field.name}>
          <label
            htmlFor={field.name}
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            {field.label}
          </label>

          <input
            id={field.name}
            type={field.type ?? "text"}
            value={form[field.name]}
            onChange={(event) =>
              handleChange(field.name, event.target.value)
            }
            placeholder={field.placeholder}
            required
            disabled={isPending}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#142B49] focus:ring-2 focus:ring-[#142B49]/10 disabled:bg-slate-50"
          />
        </div>
      ))}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-lg border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-[#142B49] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#203F63] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending
            ? "Saving..."
            : customer?.id
              ? "Save Changes"
              : "Add Customer"}
        </button>
      </div>
    </form>
  );
}
