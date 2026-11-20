"use client";

import { useState, useTransition } from "react";
import { importLeadsAction } from "./actions";

export default function UploadForm() {
  const [result, setResult] = useState<{ error?: string; success?: boolean; imported?: number; skippedNoName?: number } | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          const res = await importLeadsAction(formData);
          setResult(res);
        });
      }}
      className="mb-8 space-y-3 rounded border p-4"
    >
      <p className="text-sm font-medium">Import leads from Excel</p>
      <input
        type="file"
        name="file"
        accept=".xlsx,.xls,.csv"
        required
        className="block text-sm"
      />
      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-black px-3 py-1.5 text-sm text-white disabled:opacity-50"
      >
        {isPending ? "Importing..." : "Import"}
      </button>

      {result?.error && (
        <p className="text-sm text-red-600">{result.error}</p>
      )}
      {result?.success && (
        <p className="text-sm text-green-700">
          Imported {result.imported} leads
          {result.skippedNoName ? ` (skipped ${result.skippedNoName} rows with no name)` : ""}.
        </p>
      )}
    </form>
  );
}
