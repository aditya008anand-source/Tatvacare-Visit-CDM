"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function setRoleAction(formData: FormData) {
  const userId = String(formData.get("userId"));
  const role = String(formData.get("role"));

  const supabase = await createClient();
  await supabase.from("users").update({ role }).eq("id", userId);

  revalidatePath("/admin/users");
}
