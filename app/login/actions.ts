"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    redirect("/login?error=" + encodeURIComponent("Incorrect email or password."));
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", data.user.id)
    .single();

  if (!profile || profile.role === "pending") {
    redirect("/pending");
  }

  if (profile.role === "admin") redirect("/admin");
  if (profile.role === "dispatch") redirect("/dispatch");
  redirect("/rm");
}
