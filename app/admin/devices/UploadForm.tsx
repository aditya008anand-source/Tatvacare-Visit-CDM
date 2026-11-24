"use client";

import { useState, useTransition } from "react";
import { bulkDeviceUpdateAction } from "./actions";

type Result = {
  error?: string;
  success?: boolean;
  matched?: number;
  unmatchedCount?: number;
  ambiguousCount?: number;
  unmatched?: string[];
  ambiguous?: string[];
};

export default function UploadForm() {
  const [result, setResult] = useState<Result | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          const res = await bulkDeviceUpdateAction(formData);
          setResult(res);
        });
      }}
      className="space-y-3 rounded border p-4"
    >
      <p className="text-sm font-medium">Upload Order ID / AWB file</p>
      <p className="text-sm text-gray-500">
        File needs a Phone column, plus Order ID and/or AWB and/or Device Status columns. Matches
        by the last 5 digits of the phone number.
      </p>
      <input type="file" name="file" accept=".xlsx,.xls,.csv" required className="block text-sm" />
      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-black px-3 py-1.5 text-sm text-white disabled:opacity-50"
      >
        {isPending ? "Updating..." : "Upload and Match"}
      </button>

      {result?.error && <p className="text-sm text-red-600">{result.error}</p>}
      {result?.success && (
        <div className="text-sm">
          <p className="text-green-700">Updated {result.matched} lead(s).</p>
          {result.unmatchedCount! > 0 && (
            <p className="text-gray-600">
              No matching lead for {result.unmatchedCount} number(s): {result.unmatched?.join(", ")}
            </p>
          )}
          {result.ambiguousCount! > 0 && (
            <p className="text-amber-700">
              {result.ambiguousCount} number(s) matched more than one lead, skipped:{" "}
              {result.ambiguous?.join(", ")}
            </p>
          )}
        </div>
      )}
    </form>
  );
}
