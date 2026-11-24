"use client";

import { useState, useTransition } from "react";
import { updateAddressAction } from "./actions";

export default function AddressForm({
  leadId,
  pincode,
  city,
  state,
  addressLine,
}: {
  leadId: string;
  pincode: string | null;
  city: string | null;
  state: string | null;
  addressLine: string | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          const res = await updateAddressAction(formData);
          setError(res.error || null);
          setSaved(Boolean(res.success));
        });
      }}
      className="space-y-2"
    >
      <input type="hidden" name="leadId" value={leadId} />
      <input
        name="pincode"
        defaultValue={pincode || ""}
        placeholder="Pincode"
        className="w-full rounded border px-3 py-1.5 text-sm"
      />
      <input
        name="city"
        defaultValue={city || ""}
        placeholder="City"
        className="w-full rounded border px-3 py-1.5 text-sm"
      />
      <input
        name="state"
        defaultValue={state || ""}
        placeholder="State"
        className="w-full rounded border px-3 py-1.5 text-sm"
      />
      <textarea
        name="addressLine"
        defaultValue={addressLine || ""}
        placeholder="Rest of the address"
        className="w-full rounded border px-3 py-1.5 text-sm"
        rows={2}
      />
      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-black px-3 py-1.5 text-sm text-white disabled:opacity-50"
      >
        {isPending ? "Saving..." : "Save Address"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && !error && <p className="text-sm text-green-700">Saved.</p>}
    </form>
  );
}
