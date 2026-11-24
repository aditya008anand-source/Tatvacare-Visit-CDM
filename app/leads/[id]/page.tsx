import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import CallLogForm from "./CallLogForm";
import AddressForm from "./AddressForm";
import DeviceForm from "./DeviceForm";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href={backHref} className="mb-4 inline-block text-sm text-gray-500 underline">
        Back
      </Link>

      <h1 className="mb-1 text-xl font-semibold">{lead.name}</h1>
      <p className="mb-6 text-sm text-gray-500">
        {lead.phone || "No phone number"} · {lead.client} · {lead.program}
      </p>

      <div className="mb-8 rounded border p-4">
        <h2 className="mb-3 text-sm font-medium">Add Call Log</h2>
        <CallLogForm leadId={id} />

        {callLogs && callLogs.length > 0 && (
          <div className="mt-4 divide-y border-t pt-3">
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

      <div className="mb-8 rounded border p-4">
        <h2 className="mb-3 text-sm font-medium">Address</h2>
        <AddressForm
          leadId={id}
          pincode={lead.pincode}
          city={lead.city}
          state={lead.state}
          addressLine={lead.address_line}
        />
      </div>

      <div className="rounded border p-4">
        <h2 className="mb-3 text-sm font-medium">Device Details</h2>
        <DeviceForm
          leadId={id}
          orderId={lead.order_id}
          awb={lead.awb}
          deviceStatus={lead.device_status}
        />
      </div>
    </div>
  );
}
