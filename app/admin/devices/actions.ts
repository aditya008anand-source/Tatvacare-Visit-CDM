"use server";

import { createClient } from "@/lib/supabase/server";
import * as XLSX from "xlsx";
import { revalidatePath } from "next/cache";

function last5Digits(value: unknown): string | null {
  if (!value) return null;
  const digits = String(value).replace(/\D/g, "");
  if (digits.length < 5) return null;
  return digits.slice(-5);
}

function findKey(row: Record<string, unknown>, candidates: string[]): string | undefined {
  const keys = Object.keys(row);
  for (const candidate of candidates) {
    const match = keys.find((k) => k.trim().toLowerCase() === candidate);
    if (match) return match;
  }
  return undefined;
}

export async function bulkDeviceUpdateAction(formData: FormData) {
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return { error: "Please choose a file." };
  }

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { error: "Not logged in." };
  const { data: me } = await supabase.from("users").select("role").eq("id", authData.user.id).single();
  if (!me || me.role !== "admin") return { error: "Admin access required." };

  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet);

  if (rows.length === 0) {
    return { error: "No rows found in the file." };
  }

  // Build a map of last-5-digits -> lead ids, from all current leads.
  const { data: allLeads } = await supabase.from("leads").select("id, phone");
  const byLast5: Record<string, string[]> = {};
  for (const lead of allLeads || []) {
    const key = last5Digits(lead.phone);
    if (!key) continue;
    if (!byLast5[key]) byLast5[key] = [];
    byLast5[key].push(lead.id);
  }

  let matched = 0;
  const unmatched: string[] = [];
  const ambiguous: string[] = [];

  for (const row of rows) {
    const phoneKey = findKey(row, ["phone", "mobile", "phone number", "mobile number"]);
    const orderKey = findKey(row, ["order id", "orderid", "order"]);
    const awbKey = findKey(row, ["awb", "awb number", "awb no"]);
    const statusKey = findKey(row, ["device status", "status"]);

    const phoneRaw = phoneKey ? row[phoneKey] : undefined;
    const last5 = last5Digits(phoneRaw);
    if (!last5) continue;

    const candidates = byLast5[last5] || [];
    if (candidates.length === 0) {
      unmatched.push(String(phoneRaw));
      continue;
    }
    if (candidates.length > 1) {
      ambiguous.push(String(phoneRaw));
      continue;
    }

    const orderId = orderKey ? String(row[orderKey] || "").trim() : "";
    const awb = awbKey ? String(row[awbKey] || "").trim() : "";
    const deviceStatus = statusKey ? String(row[statusKey] || "").trim() : "";

    if (!orderId && !awb && !deviceStatus) continue;

    const updatePayload: Record<string, string> = {};
    if (orderId) updatePayload.order_id = orderId;
    if (awb) updatePayload.awb = awb;
    if (deviceStatus) updatePayload.device_status = deviceStatus;

    const { error } = await supabase.from("leads").update(updatePayload).eq("id", candidates[0]);
    if (!error) matched++;
  }

  revalidatePath("/admin");

  return {
    success: true,
    matched,
    unmatchedCount: unmatched.length,
    ambiguousCount: ambiguous.length,
    unmatched,
    ambiguous,
  };
}
