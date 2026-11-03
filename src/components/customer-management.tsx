
"use client";

import { useMemo, useState } from "react";
import { Search, Plus, Building2, Mail, Phone, MapPin, Pencil, Users } from "lucide-react";
import CustomerForm from "@/components/customer-form";

type Customer = {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  address: string;
  created_by: string;
};

export default function CustomerManagement({
  customers,
}: {
  customers: Customer[];
}) {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return customers;

    return customers.filter((customer) =>
      [
        customer.company_name,
        customer.contact_name,
        customer.email,
        customer.phone,
        customer.address,
      ].some((value) => value?.toLowerCase().includes(query))
    );
  }, [customers, search]);

  function closeForm() {
    setShowForm(false);
    setEditingCustomer(null);
  }

  return (
    <div className="space-y-6 py-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">
              Total Customers
            </p>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
              <Users size={20} />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {customers.length}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">
              Search Results
            </p>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
              <Search size={20} />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {filteredCustomers.length}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Customer Directory
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              View and update customer information.
            </p>
          </div>

          <button
            onClick={() => {
              setEditingCustomer(null);
              setShowForm(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#142B49] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#203F63]"
          >
            <Plus size={17} />
            Add Customer
          </button>
        </div>

        <div className="border-b border-slate-100 p-5">
          <div className="relative max-w-md">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search company, contact, email or phone..."
              className="w-full rounded-lg border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-[#142B49] focus:ring-2 focus:ring-[#142B49]/10"
            />
          </div>
        </div>

        {filteredCustomers.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <Building2 size={25} />
            </div>
            <h3 className="mt-4 font-semibold text-slate-900">
              {customers.length === 0
                ? "No customers yet"
                : "No matching customers"}
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              {customers.length === 0
                ? "Add your first customer to get started."
                : "Try searching with a different keyword."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                className="flex flex-col gap-5 p-5 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#142B49]/5 text-[#142B49]">
                    <Building2 size={22} />
                  </div>

                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-slate-900">
                      {customer.company_name}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {customer.contact_name}
                    </p>

                    <div className="mt-3 flex flex-col gap-2 text-xs text-slate-500 sm:flex-row sm:flex-wrap sm:gap-4">
                      <span className="flex items-center gap-2">
                        <Mail size={14} />
                        {customer.email}
                      </span>
                      <span className="flex items-center gap-2">
                        <Phone size={14} />
                        {customer.phone}
                      </span>
                      <span className="flex items-center gap-2">
                        <MapPin size={14} />
                        {customer.address}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setEditingCustomer(customer);
                    setShowForm(true);
                  }}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-[#142B49] hover:text-[#142B49]"
                >
                  <Pencil size={15} />
                  Edit
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4">
          <div className="my-auto w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900">
                {editingCustomer ? "Edit Customer" : "Add New Customer"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Enter the customer's business and contact information.
              </p>
            </div>

            <CustomerForm
              customer={editingCustomer ?? undefined}
              onCancel={closeForm}
            />
          </div>
        </div>
      )}
    </div>
  );
}
