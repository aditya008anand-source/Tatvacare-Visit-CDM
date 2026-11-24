"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function canAccessLead(leadId: string) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { ok: false as const };

  const { data: me } = await supabase
    .from("users")
    .select("role")
    .eq("id", authData.user.id)
    .single();

  const { data: lead } = await supabase
    .from("leads")
    .select("rm_id")
    .eq("id", leadId)
    .single();

  if (!me || !lead) return { ok: false as const };

  const isAdmin = me.role === "admin";
  const isOwningRm = me.role === "rm" && lead.rm_id === authData.user.id;

  if (!isAdmin && !isOwningRm) return { ok: false as const };

  return { ok: true as const, supabase, userId: authData.user.id };
}

export async function addCallLogAction(formData: FormData) {
  const leadId = String(formData.get("leadId"));
  const outcome = String(formData.get("outcome"));
  const comment = String(formData.get("comment") || "");

  const access = await canAccessLead(leadId);
  if (!access.ok) return { error: "Not allowed." };

  const { error } = await access.supabase.from("call_logs").insert({
    lead_id: leadId,
    created_by: access.userId,
    outcome,
    comment: comment || null,
  });

  if (error) return { error: error.message };

  revalidatePath(`/leads/${leadId}`);
  return { success: true };
}

export async function updateAddressAction(formData: FormData) {
  const leadId = String(formData.get("leadId"));
  const pincode = String(formData.get("pincode") || "").trim();
  const city = String(formData.get("city") || "").trim();
  const state = String(formData.get("state") || "").trim();
  const addressLine = String(formData.get("addressLine") || "").trim();

  const access = await canAccessLead(leadId);
  if (!access.ok) return { error: "Not allowed." };

  // Address is mandatory as a group: if any field is filled, all must be.
  const anyFilled = pincode || city || state || addressLine;
  const allFilled = pincode && city && state && addressLine;
  if (anyFilled && !allFilled) {
    return { error: "Fill in Pincode, City, State and Address together, or leave all blank." };
  }

  const { error } = await access.supabase
    .from("leads")
    .update({
      pincode: pincode || null,
      city: city || null,
      state: state || null,
      address_line: addressLine || null,
    })
    .eq("id", leadId);

  if (error) return { error: error.message };

  revalidatePath(`/leads/${leadId}`);
  return { success: true };
}

export async function updateOrderDetailsAction(formData: FormData) {
  const leadId = String(formData.get("leadId"));
  const orderId = String(formData.get("orderId") || "").trim();
  const awb = String(formData.get("awb") || "").trim();

  const access = await canAccessLead(leadId);
  if (!access.ok) return { error: "Not allowed." };

  const { error } = await access.supabase
    .from("leads")
    .update({
      order_id: orderId || null,
      awb: awb || null,
    })
    .eq("id", leadId);

  if (error) return { error: error.message };

  revalidatePath(`/leads/${leadId}`);
  return { success: true };
}

// Separate from order details on purpose: device status can change days or
// weeks after the order was placed, and shouldn't require re-entering the
// order ID/AWB to update.
export async function updateDeviceStatusAction(formData: FormData) {
  const leadId = String(formData.get("leadId"));
  const deviceStatus = String(formData.get("deviceStatus") || "").trim();

  const access = await canAccessLead(leadId);
  if (!access.ok) return { error: "Not allowed." };

  const { error } = await access.supabase
    .from("leads")
    .update({ device_status: deviceStatus || null })
    .eq("id", leadId);

  if (error) return { error: error.message };

  revalidatePath(`/leads/${leadId}`);
  return { success: true };
}
