import Link from "next/link";

export default function AdminHome() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-4 text-xl font-semibold">Admin</h1>
      <div className="flex gap-4">
        <Link href="/admin/users" className="text-sm underline">
          Manage users &amp; roles
        </Link>
        <Link href="/admin/leads" className="text-sm underline">
          Leads
        </Link>
      </div>
    </div>
  );
}
