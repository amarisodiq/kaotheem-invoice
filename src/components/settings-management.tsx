"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateVATSettings,
  updatePersonalProfile,
} from "@/app/(dashboard)/invoices/actions";

type Setting = {
  setting_key: string;
  setting_value: Record<string, unknown>;
};

type Props = {
  settings: Setting[];
  isAdmin: boolean;
  fullName: string;
  email: string;
};

export default function SettingsManagement({
  settings,
  isAdmin,
  fullName,
  email,
}: Props) {
  const vatSetting = settings.find((setting) => setting.setting_key === "vat");

  const [isProfilePending, startProfileTransition] = useTransition();

  const [name, setName] = useState(fullName);
  const [profileMessage, setProfileMessage] = useState("");

  function handleProfileSave() {
    setProfileMessage("");

    startProfileTransition(async () => {
      const result = await updatePersonalProfile({
        fullName: name,
      });

      setProfileMessage(result.message);

      if (result.success) {
        router.refresh();
      }
    });
  }

  const vatValue = vatSetting?.setting_value ?? {};

  const [vatEnabled, setVatEnabled] = useState(vatValue.enabled === true);

  const [vatRate, setVatRate] = useState(Number(vatValue.rate ?? 7.5));

  const [message, setMessage] = useState("");

  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [isPasswordPending, startPasswordTransition] = useTransition();

  async function handlePasswordChange() {
    setPasswordMessage("");

    if (newPassword.length < 8) {
      setPasswordMessage("Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage("Passwords do not match.");
      return;
    }

    startPasswordTransition(async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setPasswordMessage(error.message);
        return;
      }

      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage("Password updated successfully.");
    });
  }

  function handleSaveVAT() {
    setMessage("");

    startTransition(async () => {
      const result = await updateVATSettings({
        enabled: vatEnabled,
        rate: vatRate,
      });

      setMessage(result.message);

      if (result.success) {
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your account and company preferences.
        </p>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Personal Profile
        </h2>

        <div className="mt-4 max-w-md">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Full Name
          </label>

          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={100}
            className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm"
          />

          <div className="mt-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Email Address
            </label>

            <input
              type="email"
              value={email}
              readOnly
              className="w-full rounded-lg border border-gray-300 bg-gray-100 px-3 py-3 text-sm text-gray-600"
            />
          </div>

          <p className="mt-4 text-sm text-gray-500">
            Account Role: {isAdmin ? "Administrator" : "Staff"}
          </p>

          {profileMessage && (
            <p className="mt-3 text-sm text-gray-600">{profileMessage}</p>
          )}

          <button
            type="button"
            onClick={handleProfileSave}
            disabled={isProfilePending || name.trim().length < 2}
            className="mt-4 rounded-lg bg-blue-900 px-5 py-3 text-sm font-medium text-white disabled:opacity-50"
          >
            {isProfilePending ? "Saving..." : "Save Name"}
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Account Security
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Change your account password.
        </p>

        <div className="mt-5 max-w-md space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              New Password
            </label>

            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="Enter new password"
              autoComplete="new-password"
              className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Confirm New Password
            </label>

            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Confirm new password"
              autoComplete="new-password"
              className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm"
            />
          </div>

          {passwordMessage && (
            <p className="text-sm text-gray-600">{passwordMessage}</p>
          )}

          <button
            type="button"
            onClick={handlePasswordChange}
            disabled={isPasswordPending || !newPassword || !confirmPassword}
            className="rounded-lg bg-blue-900 px-5 py-3 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
          >
            {isPasswordPending ? "Updating..." : "Update Password"}
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Company Information
        </h2>

        <div className="mt-4 space-y-3 text-sm">
          <div>
            <p className="text-gray-500">Company Name</p>
            <p className="font-medium text-gray-900">
              Kaotheem Energy Services Ltd
            </p>
          </div>

          <div>
            <p className="text-gray-500">Bank</p>
            <p className="font-medium text-gray-900">PremiumTrust Bank</p>
          </div>

          <div>
            <p className="text-gray-500">Account Name</p>
            <p className="font-medium text-gray-900">
              Kaotheem Energy Services Ltd
            </p>
          </div>

          <div>
            <p className="text-gray-500">Account Number</p>
            <p className="font-medium text-gray-900">0010133736</p>
          </div>
        </div>

        {!isAdmin && (
          <p className="mt-4 text-xs text-gray-500">
            Company information is managed by your administrator.
          </p>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">
          VAT Configuration
        </h2>

        <div className="mt-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-medium text-gray-900">Enable VAT</p>
            <p className="text-sm text-gray-500">Apply VAT to new invoices.</p>
          </div>

          <input
            type="checkbox"
            checked={vatEnabled}
            onChange={(event) => setVatEnabled(event.target.checked)}
            disabled={!isAdmin}
            className="h-5 w-5"
          />
        </div>

        <div className="mt-5 max-w-xs">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            VAT Rate (%)
          </label>

          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={vatRate}
            onChange={(event) => setVatRate(Number(event.target.value))}
            disabled={!isAdmin}
            className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm disabled:bg-gray-100"
          />
        </div>

        {!isAdmin && (
          <p className="mt-4 text-xs text-gray-500">
            Only administrators can change VAT settings.
          </p>
        )}

        {isAdmin && (
          <>
            <p className="mt-4 text-sm text-gray-500">
              Update the VAT configuration for new invoices.
            </p>

            {message && <p className="mt-3 text-sm text-gray-600">{message}</p>}

            <button
              type="button"
              onClick={handleSaveVAT}
              disabled={
                isPending ||
                !Number.isFinite(vatRate) ||
                vatRate < 0 ||
                vatRate > 100
              }
              className="mt-4 rounded-lg bg-blue-900 px-5 py-3 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {isPending ? "Saving..." : "Save VAT Settings"}
            </button>
          </>
        )}
      </section>
    </div>
  );
}
