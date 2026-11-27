import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import LeadNameLink from "@/components/LeadNameLink";
import CallLogForm from "./CallLogForm";
import AddressForm from "./AddressForm";
import OrderForm from "./OrderForm";
import DeviceStatusForm from "./DeviceStatusForm";

type SearchParams = Promise<{ q?: string; from?: string; to?: string; rm?: string; status?: string }>;

function buildQuery(params: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export default async function LeadDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const { q, from, to, rm, status } = await searchParams;
  const supabase = await createClient();

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");

  const { data: me } = await supabase.from("users").select("role").eq("id", authData.user.id).single();
  if (!me) redirect("/login");

  const { data: lead } = await supabase.from("leads").select("*").eq("id", id).single();
  if (!lead) notFound();

  const isAdmin = me.role === "admin";
  const isOwningRm = me.role === "rm" && lead.rm_id === authData.user.id;
  if (!isAdmin && !isOwningRm) redirect("/");

  const { data: callLogs } = await supabase
    .from("call_logs")
    .select("id, outcome, comment, created_at")
    .eq("lead_id", id)
    .order("created_at", { ascending: false });

  const backHref = isAdmin ? "/admin" : "/rm";
  const filterQuery = { q, from, to, rm, status };

  // Sidebar: the same filtered list the user came from, so they can jump between leads.
  let sidebarQuery = supabase
    .from("leads")
    .select("id, name, phone")
    .order("created_at", { ascending: false });

  if (isAdmin) {
    if (q) sidebarQuery = sidebarQuery.or(`name.ilike.%${q}%,phone.ilike.%${q}%`);
    if (from) sidebarQuery = sidebarQuery.gte("enrolment_date", from);
    if (to) sidebarQuery = sidebarQuery.lte("enrolment_date", to);
    if (rm === "unassigned") sidebarQuery = sidebarQuery.is("rm_id", null);
    else if (rm) sidebarQuery = sidebarQuery.eq("rm_id", rm);
    if (status === "pending") sidebarQuery = sidebarQuery.is("device_status", null);
    else if (status) sidebarQuery = sidebarQuery.eq("device_status", status);
  } else {
    sidebarQuery = sidebarQuery.eq("rm_id", authData.user.id);
    if (q) sidebarQuery = sidebarQuery.or(`name.ilike.%${q}%,phone.ilike.%${q}%`);
    if (from) sidebarQuery = sidebarQuery.gte("enrolment_date", from);
    if (to) sidebarQuery = sidebarQuery.lte("enrolment_date", to);
  }

  const { data: sidebarLeads } = await sidebarQuery;

  return (
    <div className="mx-auto flex max-w-6xl gap-6 px-4 py-8">
      <aside className="sticky top-8 h-fit w-64 shrink-0 rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-3">
          <LeadNameLink href={`${backHref}${buildQuery(filterQuery)}`}>← Back to list</LeadNameLink>
        </div>
        <div className="max-h-[70vh] overflow-y-auto">
          {(sidebarLeads || []).map((l) => (
            <div
              key={l.id}
              className={`border-b border-slate-50 px-3 py-2 text-sm transition-colors ${
                l.id === id ? "border-l-4 border-l-blue-500 bg-blue-50" : "hover:bg-slate-50"
              }`}
            >
              <LeadNameLink href={`/leads/${l.id}${buildQuery(filterQuery)}`}>{l.name}</LeadNameLink>
              <p className="text-xs text-gray-400">{l.phone || "No phone number"}</p>
            </div>
          ))}
          {(!sidebarLeads || sidebarLeads.length === 0) && (
            <p className="p-3 text-sm text-gray-400">No leads in this list.</p>
          )}
        </div>
      </aside>

      <div className="flex-1">
        <h1 className="mb-1 text-xl font-semibold">{lead.name}</h1>
        <p className="mb-1 text-sm text-gray-500">
          {lead.phone || "No phone number"} · {lead.program}
        </p>
        <p className="mb-6 text-sm">
          <span className="text-gray-500">Client: </span>
          <span className="font-medium text-gray-800">{lead.client || "Not specified"}</span>
        </p>

        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-medium">Add Call Log</h2>
          <CallLogForm leadId={id} />

          {callLogs && callLogs.length > 0 && (
            <div className="mt-4 divide-y divide-slate-100 border-t border-slate-100 pt-3">
              {callLogs.map((c) => (
                <div key={c.id} className="py-2 text-sm">
                  <p className="font-medium">
                    {c.outcome}{" "}
                    <span className="font-normal text-gray-400">
                      · {new Date(c.created_at).toLocaleString()}
                    </span>
                  </p>
                  {c.comment && <p className="text-gray-600">{c.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-medium">Address</h2>
          <AddressForm
            leadId={id}
            pincode={lead.pincode}
            city={lead.city}
            state={lead.state}
            addressLine={lead.address_line}
          />
        </div>

        <div className="mb-6 rounded-lg border border-slate-200 bg-amber-50/40 p-4">
          <h2 className="mb-3 text-sm font-medium">Order Details</h2>
          <OrderForm leadId={id} orderId={lead.order_id} awb={lead.awb} />
        </div>

        <div className="rounded-lg border border-slate-200 bg-green-50/40 p-4">
          <h2 className="mb-1 text-sm font-medium">Device Status</h2>
          <p className="mb-3 text-xs text-gray-500">
            Can be updated any time, independently of order details.
          </p>
          <DeviceStatusForm leadId={id} deviceStatus={lead.device_status} />
        </div>
      </div>
    </div>
  );
}
