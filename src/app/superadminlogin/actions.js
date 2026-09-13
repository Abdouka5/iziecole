"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function superAdminSignIn(formData) {
  const email = formData.get("email");
  const password = formData.get("password");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/superadminlogin?error=${encodeURIComponent(error.message)}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_super_admin")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile?.is_super_admin) {
    await supabase.auth.signOut();
    redirect(`/superadminlogin?error=${encodeURIComponent("Ce compte n'est pas un compte Super Admin.")}`);
  }

  redirect("/admin");
}
