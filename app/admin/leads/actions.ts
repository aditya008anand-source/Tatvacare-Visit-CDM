"use server";

import { createClient } from "@/lib/supabase/server";
import * as XLSX from "xlsx";
import { revalidatePath } from "next/cache";

function parseDate(value: unknown): string | null {
  if (!value) return null;

  // Excel serial date number
  if (typeof value === "number") {
    const d = XLSX.SSF.parse_date_code(value);
    if (!d) return null;
    return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }

  // Text like "29/04/2026" (DD/MM/YYYY)
  const str = String(value).trim();
  const match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, dd, mm, yyyy] = match;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }

  return null;
}

function cleanPhone(value: unknown): string | null {
  if (!value) return null;
  const str = String(value).trim();
  if (!/^\d+$/.test(str)) return null; // handles "-" and blanks
  return str;
}

export async function importLeadsAction(formData: FormData) {
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return { error: "Please choose a file." };
  }

  const supabase = await createClient();

  // Confirm the caller is an admin before touching anything.
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { error: "Not logged in." };
  const { data: me } = await supabase.from("users").select("role").eq("id", authData.user.id).single();
  if (!me || me.role !== "admin") return { error: "Admin access required." };

  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });

  // Prefer a sheet that looks like the main data tab; otherwise use the first one.
  const mainSheetName =
    workbook.SheetNames.find((n) => /main/i.test(n)) || workbook.SheetNames[0];
  const sheet = workbook.Sheets[mainSheetName];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 0 });

  // Row 0 is the header. Columns A-H only.
  const dataRows = rows.slice(1);

  const toInsert = [];
  let skippedNoName = 0;

  for (const row of dataRows) {
    const [client, enrolmentDateRaw, name, phoneRaw, program, nutritionist, physiotherapist, psychologist] = row;

    const cleanName = name ? String(name).trim() : "";
    if (!cleanName) {
      skippedNoName++;
      continue;
    }

    toInsert.push({
      client: client ? String(client).trim() : null,
      enrolment_date: parseDate(enrolmentDateRaw),
      name: cleanName,
      phone: cleanPhone(phoneRaw),
      program: program ? String(program).trim() : null,
      nutritionist: nutritionist ? String(nutritionist).trim() : null,
      physiotherapist: physiotherapist ? String(physiotherapist).trim() : null,
      psychologist: psychologist ? String(psychologist).trim() : null,
    });
  }

  if (toInsert.length === 0) {
    return { error: "No valid rows found (every row needs at least a name)." };
  }

  // Assign each new lead to whichever RM currently has the fewest leads,
  // so the load stays balanced across the fixed RM order.
  const { data: rms } = await supabase
    .from("users")
    .select("id, rm_rank")
    .eq("role", "rm")
    .order("rm_rank", { ascending: true });

  if (rms && rms.length > 0) {
    const { data: allRmLeads } = await supabase.from("leads").select("rm_id");
    const counts: Record<string, number> = {};
    for (const rm of rms) counts[rm.id] = 0;
    for (const row of allRmLeads || []) {
      if (row.rm_id && counts[row.rm_id] !== undefined) counts[row.rm_id]++;
    }

    for (const row of toInsert) {
      let pick = rms[0].id;
      let lowest = counts[pick];
      for (const rm of rms) {
        if (counts[rm.id] < lowest) {
          lowest = counts[rm.id];
          pick = rm.id;
        }
      }
      (row as typeof row & { rm_id?: string }).rm_id = pick;
      counts[pick]++;
    }
  }

  const { error: insertError } = await supabase.from("leads").insert(toInsert);

  if (insertError) {
    return { error: insertError.message };
  }

  revalidatePath("/admin/leads");

  return {
    success: true,
    imported: toInsert.length,
    skippedNoName,
  };
}
