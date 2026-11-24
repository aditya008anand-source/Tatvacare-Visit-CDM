import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LeadNameLink from "@/components/LeadNameLink";
import UploadForm from "./leads/UploadForm";

type SearchParams = Promise<{ q?: string; from?: string; to?: string; rm?: string }>;

function buildQuery(params: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

const CARD_COLORS = [
  "bg-blue-50 border-blue-100",
  "bg-rose-50 border-rose-100",
  "bg-amber-50 border-amber-100",
  "bg-purple-50 border-purple-100",
  "bg-sky-50 border-sky-100",
  "bg-pink-50 border-pink-100",
];

export default async function AdminHome({ searchParams }: { searchParams: SearchParams }) {
  const { q, from, to, rm } = await searchParams;
  const supabase = await createClient();

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");

  const { data: me } = await supabase.from("users").select("role").eq("id", authData.user.id).single();
  if (!me || me.role !== "admin") redirect("/");

  const { data: rms } = await supabase
    .from("users")
    .select("id, name, rm_rank")
    .eq("role", "rm")
    .order("rm_rank", { ascending: true });

  const { count: totalCount } = await supabase.from("leads").select("id", { count: "exact", head: true });
  const { count: unassignedCount } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .is("rm_id", null);

  const rmCounts: { id: string; name: string; count: number }[] = [];
  for (const r of rms || []) {
    const { count } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("rm_id", r.id);
    rmCounts.push({ id: r.id, name: r.name || "Unnamed", count: count || 0 });
  }

  const rmNameById: Record<string, string> = {};
  for (const r of rms || []) rmNameById[r.id] = r.name || "Unnamed";

  let query = supabase
    .from("leads")
    .select("id, name, phone, enrolment_date, device_status, pincode, city, state, address_line, rm_id", {
      count: "exact",
    })
    .order("created_at", { ascending: false });

  if (q) query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%`);
  if (from) query = query.gte("enrolment_date", from);
  if (to) query = query.lte("enrolment_date", to);
  if (rm === "unassigned") query = query.is("rm_id", null);
  else if (rm) query = query.eq("rm_id", rm);

  const { data: leads, count } = await query;

  const leadIds = (leads || []).map((l) => l.id);
  const { data: callRows } = leadIds.length
    ? await supabase.from("call_logs").select("lead_id").in("lead_id", leadIds)
    : { data: [] as { lead_id: string }[] };

  const callCounts: Record<string, number> = {};
  for (const row of callRows || []) {
    callCounts[row.lead_id] = (callCounts[row.lead_id] || 0) + 1;
  }

  function formatAddress(l: {
    pincode: string | null; city: string | null; state: string | null; address_line: string | null;
  }) {
    const parts = [l.address_line, l.city, l.state, l.pincode].filter(Boolean);
    return parts.length ? parts.join(", ") : "Not saved";
  }

  const isFiltered = Boolean(q || from || to || rm);
  const filterQuery = { q, from, to, rm };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <div className="flex gap-4 text-sm">
          <a href="/admin/devices" className="text-blue-600 hover:underline">
            Bulk Device Update
          </a>
          <a href="/admin/users" className="text-blue-600 hover:underline">
            Settings
          </a>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-gray-500">Total Leads</p>
          <p className="text-2xl font-semibold">{totalCount ?? 0}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs text-gray-500">Unassigned</p>
          <p className="text-2xl font-semibold">{unassignedCount ?? 0}</p>
        </div>
        {rmCounts.map((r, i) => (
          <div key={r.id} className={`rounded-lg border p-4 ${CARD_COLORS[i % CARD_COLORS.length]}`}>
            <p className="text-xs text-gray-600">{r.name}</p>
            <p className="text-2xl font-semibold">{r.count}</p>
          </div>
        ))}
      </div>

      <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
        <UploadForm />
      </div>

      <form className="mb-4 flex flex-wrap items-center gap-2" method="get">
        <input type="text" name="q" defaultValue={q} placeholder="Search name or phone" className="rounded border border-slate-200 px-3 py-1.5 text-sm" />
        <input type="date" name="from" defaultValue={from} className="rounded border border-slate-200 px-3 py-1.5 text-sm" />
        <input type="date" name="to" defaultValue={to} className="rounded border border-slate-200 px-3 py-1.5 text-sm" />
        <select name="rm" defaultValue={rm || ""} className="rounded border border-slate-200 px-3 py-1.5 text-sm">
          <option value="">All RMs</option>
          <option value="unassigned">Unassigned</option>
          {(rms || []).map((r) => (
            <option key={r.id} value={r.id}>
              {r.name || "Unnamed"}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded bg-black px-3 py-1.5 text-sm text-white transition-colors active:bg-gray-700">
          Filter
        </button>
        {isFiltered && (
          <a href="/admin" className="text-sm text-gray-500 hover:underline">
            Clear
          </a>
        )}
      </form>

      <p className="mb-2 text-sm text-gray-500">
        {count ?? 0} lead{count === 1 ? "" : "s"}{isFiltered ? " (filtered)" : ""}
      </p>

      <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Number</th>
              <th className="p-3">RM</th>
              <th className="p-3">Date of Joining</th>
              <th className="p-3">Calls Attempted</th>
              <th className="p-3">Address</th>
              <th className="p-3">Device Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(leads || []).map((l, i) => (
              <tr
                key={l.id}
                className={`transition-colors hover:bg-blue-50 active:bg-blue-100 ${
                  i % 2 === 1 ? "bg-slate-50/60" : "bg-white"
                }`}
              >
                <td className="p-3">
                  <LeadNameLink href={`/leads/${l.id}${buildQuery(filterQuery)}`}>{l.name}</LeadNameLink>
                </td>
                <td className="p-3">{l.phone || "No phone number"}</td>
                <td className="p-3 text-gray-600">{l.rm_id ? rmNameById[l.rm_id] || "Unknown" : "Unassigned"}</td>
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
