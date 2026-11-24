"use client";
import Link from "next/link";
import { useLinkStatus } from "next/link";
import type { ReactNode } from "react";

function LoadingOverlay() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-[1px]">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
    </div>
  );
}

export default function LeadNameLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="-mx-1 rounded px-1 font-medium text-blue-600 transition-colors hover:text-blue-800 hover:underline active:bg-blue-100"
    >
      {children}
      <LoadingOverlay />
    </Link>
  );
}
