import Link from "next/link";

export default function AdminHome() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-4 text-xl font-semibold">Admin</h1>
      <Link href="/admin/users" className="text-sm underline">
        Manage users &amp; roles
      </Link>
      <p className="mt-4 text-sm text-gray-400">
        Leads, imports and reports will be added here next.
      </p>
    </div>
  );
}
