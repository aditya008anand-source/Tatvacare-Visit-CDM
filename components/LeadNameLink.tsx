"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import type { ReactNode } from "react";

function Spinner() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span className="ml-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-blue-600 border-t-transparent align-middle" />
  );
}

export default function LeadNameLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="-mx-1 rounded px-1 font-medium text-blue-600 transition-colors hover:text-blue-800 hover:underline active:bg-blue-100"
    >
      {children}
      <Spinner />
    </Link>
  );
}
