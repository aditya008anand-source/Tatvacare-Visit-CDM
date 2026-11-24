import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LeadNameLink from "@/components/LeadNameLink";

type SearchParams = Promise<{ q?: string; from?: string; to?: string }>;

function buildQuery(params: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export default async function RmHome({ searchParams }: { searchParams: SearchParams }) {
  const { q, from, to } = await searchParams;
  const supabase = await createClient();

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");

  const { data: me } = await supabase.from("users").select("role").eq("id", authData.user.id).single();
  if (!me || me.role !== "rm") redirect("/");

  let query = supabase
    .from("leads")
    .select("id, name, phone, enrolment_date, device_status, pincode, city, state, address_line", {
      count: "exact",
    })
    .eq("rm_id", authData.user.id)
    .order("created_at", { ascending: false });

  if (q) query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%`);
  if (from) query = query.gte("enrolment_date", from);
  if (to) query = query.lte("enrolment_date", to);

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

  const isFiltered = Boolean(q || from || to);
  const filterQuery = { q, from, to };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold">My Leads</h1>

      <form className="mb-4 flex flex-wrap items-center gap-2" method="get">
        <input type="text" name="q" defaultValue={q} placeholder="Search name or phone" className="rounded border border-slate-200 px-3 py-1.5 text-sm" />
        <input type="date" name="from" defaultValue={from} className="rounded border border-slate-200 px-3 py-1.5 text-sm" />
        <input type="date" name="to" defaultValue={to} className="rounded border border-slate-200 px-3 py-1.5 text-sm" />
        <button type="submit" className="rounded bg-black px-3 py-1.5 text-sm text-white transition-colors active:bg-gray-700">
          Filter
        </button>
        {isFiltered && (
          <a href="/rm" className="text-sm text-gray-500 hover:underline">
            Clear
          </a>
        )}
      </form>

      <p className="mb-2 text-sm text-gray-500">
        {count ?? 0} lead{count === 1 ? "" : "s"} assigned to you{isFiltered ? " (filtered)" : ""}
      </p>

      <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Number</th>
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
