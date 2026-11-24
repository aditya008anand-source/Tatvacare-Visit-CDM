"use client";

import { useState, useTransition } from "react";
import { addCallLogAction } from "./actions";

export default function CallLogForm({ leadId }: { leadId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          const res = await addCallLogAction(formData);
          setError(res.error || null);
          if (res.success) {
            const form = document.getElementById("call-log-form") as HTMLFormElement | null;
            form?.reset();
          }
        });
      }}
      id="call-log-form"
      className="space-y-2"
    >
      <input type="hidden" name="leadId" value={leadId} />
      <select name="outcome" required className="w-full rounded border px-3 py-1.5 text-sm">
        <option value="">Select outcome</option>
        <option value="Connected">Connected</option>
        <option value="Not connected">Not connected</option>
        <option value="Requested callback">Requested callback</option>
        <option value="Address provided">Address provided</option>
      </select>
      <textarea
        name="comment"
        placeholder="Comment (optional)"
        className="w-full rounded border px-3 py-1.5 text-sm"
        rows={2}
      />
      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-black px-3 py-1.5 text-sm text-white disabled:opacity-50"
      >
        {isPending ? "Saving..." : "Add Call Log"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
