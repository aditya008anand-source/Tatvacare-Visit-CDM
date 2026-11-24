import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function RmHome() {
  const supabase = await createClient();

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");

  const { data: me } = await supabase.from("users").select("role").eq("id", authData.user.id).single();
  if (!me || me.role !== "rm") redirect("/");

  const { data: leads } = await supabase
    .from("leads")
    .select("id, name, phone, enrolment_date, device_status, pincode, city, state, address_line")
    .eq("rm_id", authData.user.id)
    .order("created_at", { ascending: false });

  const leadIds = (leads || []).map((l) => l.id);
  const { data: callRows } = leadIds.length
    ? await supabase.from("call_logs").select("lead_id").in("lead_id", leadIds)
    : { data: [] as { lead_id: string }[] };

  const callCounts: Record<string, number> = {};
  for (const row of callRows || []) {
    callCounts[row.lead_id] = (callCounts[row.lead_id] || 0) + 1;
  }

  function formatAddress(l: {
    pincode: string | null;
    city: string | null;
    state: string | null;
    address_line: string | null;
  }) {
    const parts = [l.address_line, l.city, l.state, l.pincode].filter(Boolean);
    return parts.length ? parts.join(", ") : "Not saved";
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold">My Leads</h1>

      <p className="mb-2 text-sm text-gray-500">{leads?.length ?? 0} leads assigned to you</p>

      <div className="overflow-x-auto rounded border">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Number</th>
              <th className="p-3">Date of Joining</th>
              <th className="p-3">Calls Attempted</th>
              <th className="p-3">Address</th>
              <th className="p-3">Device Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {(leads || []).map((l) => (
              <tr key={l.id} className="hover:bg-gray-50">
                <td className="p-3 font-medium">
                  <Link href={`/leads/${l.id}`} className="underline">
                    {l.name}
                  </Link>
                </td>
                <td className="p-3">{l.phone || "No phone number"}</td>
                <td className="p-3">{l.enrolment_date || "-"}</td>
                <td className="p-3">{callCounts[l.id] || 0}</td>
                <td className="p-3 text-gray-600">{formatAddress(l)}</td>
                <td className="p-3">{l.device_status || "Pending"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!leads || leads.length === 0) && (
          <p className="p-4 text-gray-400">No leads assigned yet.</p>
        )}
      </div>
    </div>
  );
}
