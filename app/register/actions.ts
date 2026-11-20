"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function registerAction(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!name || !email || !password) {
    redirect("/register?error=" + encodeURIComponent("All fields are required."));
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error || !data.user) {
    redirect("/register?error=" + encodeURIComponent(error?.message || "Could not create account."));
  }

  // Create the profile row with role "pending" - admin approves and assigns a role later.
  const { error: profileError } = await supabase.from("users").insert({
    id: data.user.id,
    name,
    email,
    role: "pending",
  });

  if (profileError) {
    redirect("/register?error=" + encodeURIComponent(profileError.message));
  }

  redirect("/pending");
}
