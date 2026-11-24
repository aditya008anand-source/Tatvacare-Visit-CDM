"use client";

import { useEffect, useState } from "react";

export default function CopyLinkButton({ path }: { path: string }) {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUrl(window.location.origin + path);
  }, [path]);

  return (
    <div className="flex items-center gap-2">
      <input
        readOnly
        value={url}
        className="flex-1 rounded border bg-gray-50 px-3 py-1.5 text-sm"
      />
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="rounded bg-black px-3 py-1.5 text-sm text-white"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}
