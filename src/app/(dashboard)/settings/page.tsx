import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SettingsManagement from "@/components/settings-management";

export default async function SettingsPage() {
  const supabase = await createClient();

  const { data: claims } = await supabase.auth.getClaims();

  if (!claims) redirect("/login");

  const userId = claims.claims.sub;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", userId)
    .single();

  if (!profile) redirect("/login");

  const { data: settings, error } = await supabase
    .from("company_settings")
    .select("setting_key, setting_value");

  if (error) throw new Error(error.message);

  return (
    <SettingsManagement
      settings={settings ?? []}
      isAdmin={profile.role === "admin"}
      fullName={profile.full_name ?? ""}
      email={claims.claims.email ?? ""}
    />
  );
}