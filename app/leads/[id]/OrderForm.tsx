"use client";

import { useState, useTransition } from "react";
import { updateOrderDetailsAction } from "./actions";

export default function OrderForm({
  leadId,
  orderId,
  awb,
}: {
  leadId: string;
  orderId: string | null;
  awb: string | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          const res = await updateOrderDetailsAction(formData);
          setError(res.error || null);
          setSaved(Boolean(res.success));
        });
      }}
      className="space-y-2"
    >
      <input type="hidden" name="leadId" value={leadId} />
      <input
        name="orderId"
        defaultValue={orderId || ""}
        placeholder="Order ID"
        className="w-full rounded border border-slate-200 px-3 py-1.5 text-sm"
      />
      <input
        name="awb"
        defaultValue={awb || ""}
        placeholder="AWB number"
        className="w-full rounded border border-slate-200 px-3 py-1.5 text-sm"
      />
      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-black px-3 py-1.5 text-sm text-white transition-colors active:bg-gray-700 disabled:opacity-50"
      >
        {isPending ? "Saving..." : "Save Order Details"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && !error && <p className="text-sm text-green-700">Saved.</p>}
    </form>
  );
}
