import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import UploadForm from "./leads/UploadForm";

type SearchParams = Promise<{ q?: string; from?: string; to?: string }>;

export default async function AdminHome({ searchParams }: { searchParams: SearchParams }) {
  const { q, from, to } = await searchParams;
  const supabase = await createClient();

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");

  const { data: me } = await supabase.from("users").select("role").eq("id", authData.user.id).single();
  if (!me || me.role !== "admin") redirect("/");

  const { count: totalCount } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true });

  const { data: allRmRows } = await supabase.from("leads").select("rm_id");
  const { data: rmUsers } = await supabase.from("users").select("id, name").eq("role", "rm");

  const rmCounts: Record<string, number> = {};
  for (const row of allRmRows || []) {
    const key = row.rm_id || "unassigned";
    rmCounts[key] = (rmCounts[key] || 0) + 1;
  }

  let query = supabase
    .from("leads")
    .select(
      "id, name, phone, enrolment_date, device_status, pincode, city, state, address_line",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (q) query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%`);
  if (from) query = query.gte("enrolment_date", from);
  if (to) query = query.lte("enrolment_date", to);

  const { data: leads, count: filteredCount } = await query;

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

  const isFiltered = Boolean(q || from || to);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Leads</h1>
        <div className="flex gap-4">
          <Link href="/admin/devices" className="text-sm text-gray-500 underline">
            Bulk Device Update
          </Link>
          <Link href="/admin/users" className="text-sm text-gray-500 underline">
            Settings
          </Link>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded border p-3">
          <p className="text-xs text-gray-500">Total Leads</p>
          <p className="text-2xl font-semibold">{totalCount ?? 0}</p>
        </div>
        <div className="rounded border p-3">
          <p className="text-xs text-gray-500">Unassigned</p>
          <p className="text-2xl font-semibold">{rmCounts["unassigned"] || 0}</p>
        </div>
        {(rmUsers || []).map((u) => (
          <div key={u.id} className="rounded border p-3">
            <p className="truncate text-xs text-gray-500">{u.name}</p>
            <p className="text-2xl font-semibold">{rmCounts[u.id] || 0}</p>
          </div>
        ))}
      </div>

      <UploadForm />

      <form className="mb-4 flex flex-wrap items-center gap-2" method="get">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search name or phone"
          className="rounded border px-3 py-1.5 text-sm"
        />
        <input type="date" name="from" defaultValue={from} className="rounded border px-3 py-1.5 text-sm" />
        <input type="date" name="to" defaultValue={to} className="rounded border px-3 py-1.5 text-sm" />
        <button type="submit" className="rounded bg-black px-3 py-1.5 text-sm text-white">
          Filter
        </button>
        {isFiltered && (
          <Link href="/admin" className="px-3 py-1.5 text-sm underline">
            Clear
          </Link>
        )}
      </form>

      <p className="mb-2 text-sm text-gray-500">
        {filteredCount ?? 0} lead{filteredCount === 1 ? "" : "s"}
        {isFiltered ? " matching filters" : ""} (showing latest 50)
      </p>

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
          <p className="p-4 text-gray-400">No leads found.</p>
        )}
      </div>
    </div>
  );
}
