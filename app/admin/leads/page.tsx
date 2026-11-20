import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import UploadForm from "./UploadForm";

export default async function AdminLeadsPage() {
  const supabase = await createClient();

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");

  const { data: me } = await supabase.from("users").select("role").eq("id", authData.user.id).single();
  if (!me || me.role !== "admin") redirect("/");

  const { data: leads, count } = await supabase
    .from("leads")
    .select("id, name, phone, client, program, enrolment_date, device_status", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold">Leads</h1>

      <UploadForm />

      <p className="mb-2 text-sm text-gray-500">
        {count ?? 0} total lead{count === 1 ? "" : "s"} (showing latest 50)
      </p>

      <div className="divide-y rounded border text-sm">
        {(leads || []).map((l) => (
          <div key={l.id} className="flex items-center justify-between gap-3 p-3">
            <div>
              <p className="font-medium">{l.name}</p>
              <p className="text-gray-500">
                {l.phone || "No phone number"} · {l.client} · {l.program}
              </p>
            </div>
            <p className="text-gray-400">{l.enrolment_date || "-"}</p>
          </div>
        ))}
        {(!leads || leads.length === 0) && (
          <p className="p-4 text-gray-400">No leads yet.</p>
        )}
      </div>
    </div>
  );
}
