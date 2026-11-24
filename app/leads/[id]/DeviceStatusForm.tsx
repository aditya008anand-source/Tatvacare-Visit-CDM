"use client";

import { useState, useTransition } from "react";
import { updateDeviceStatusAction } from "./actions";

export default function DeviceStatusForm({
  leadId,
  deviceStatus,
}: {
  leadId: string;
  deviceStatus: string | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          const res = await updateDeviceStatusAction(formData);
          setError(res.error || null);
          setSaved(Boolean(res.success));
        });
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <input type="hidden" name="leadId" value={leadId} />
      <input
        name="deviceStatus"
        defaultValue={deviceStatus || ""}
        placeholder="e.g. Ordered, Dispatched, Delivered"
        className="flex-1 rounded border border-slate-200 px-3 py-1.5 text-sm"
      />
      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-black px-3 py-1.5 text-sm text-white transition-colors active:bg-gray-700 disabled:opacity-50"
      >
        {isPending ? "Saving..." : "Update Status"}
      </button>
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
      {saved && !error && <p className="w-full text-sm text-green-700">Saved.</p>}
    </form>
  );
}
