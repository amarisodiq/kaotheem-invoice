
"use client";

import { useState, useTransition } from "react";
import { UserPlus, Loader2 } from "lucide-react";
import { inviteStaffMember } from "@/app/(dashboard)/invoices/actions";

export default function StaffInviteForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setSuccess(false);

    startTransition(async () => {
      const result = await inviteStaffMember(fullName, email);

      setMessage(result.message);
      setSuccess(result.success);

      if (result.success) {
        setFullName("");
        setEmail("");
      }
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-lg bg-blue-50 p-3 text-[#142B49]">
          <UserPlus size={22} />
        </div>

        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Invite Staff Member
          </h2>
          <p className="text-sm text-slate-500">
            Send an invitation to join Kaotheem Invoice.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="fullName"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Full Name
          </label>

          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Enter staff member's full name"
            required
            disabled={isPending}
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#142B49] focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Email Address
          </label>

          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="staff@kaotheem.com"
            required
            disabled={isPending}
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#142B49] focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#142B49] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#203F63] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? (
            <>
              <Loader2 size={17} className="animate-spin" />
              Sending Invitation...
            </>
          ) : (
            <>
              <UserPlus size={17} />
              Send Staff Invitation
            </>
          )}
        </button>

        {message && (
          <p
            role="status"
            className={`rounded-lg p-3 text-sm ${
              success
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {message}
          </p>
        )}
      </form>
    </div>
  );
}
