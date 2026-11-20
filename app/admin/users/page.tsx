import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { setRoleAction } from "./actions";

export default async function AdminUsersPage() {
  const supabase = await createClient();

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");

  const { data: me } = await supabase
    .from("users")
    .select("role")
    .eq("id", authData.user.id)
    .single();

  if (!me || me.role !== "admin") redirect("/");

  const { data: users } = await supabase
    .from("users")
    .select("id, name, email, role, created_at")
    .order("created_at", { ascending: false });

  const pending = (users || []).filter((u) => u.role === "pending");
  const active = (users || []).filter((u) => u.role !== "pending");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold">Users</h1>

      <h2 className="mb-2 text-sm font-medium text-gray-500">
        Pending approval ({pending.length})
      </h2>
      <div className="mb-8 divide-y rounded border">
        {pending.length === 0 && (
          <p className="p-4 text-sm text-gray-400">Nothing waiting.</p>
        )}
        {pending.map((u) => (
          <div key={u.id} className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-medium">{u.name}</p>
              <p className="text-sm text-gray-500">{u.email}</p>
            </div>
            <form action={setRoleAction} className="flex items-center gap-2">
              <input type="hidden" name="userId" value={u.id} />
              <select name="role" className="rounded border px-2 py-1 text-sm">
                <option value="rm">RM</option>
                <option value="dispatch">Dispatch</option>
                <option value="admin">Admin</option>
              </select>
              <button
                type="submit"
                className="rounded bg-black px-3 py-1 text-sm text-white"
              >
                Approve
              </button>
            </form>
          </div>
        ))}
      </div>

      <h2 className="mb-2 text-sm font-medium text-gray-500">
        Active users ({active.length})
      </h2>
      <div className="divide-y rounded border">
        {active.map((u) => (
          <div key={u.id} className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-medium">{u.name}</p>
              <p className="text-sm text-gray-500">{u.email}</p>
            </div>
            <form action={setRoleAction} className="flex items-center gap-2">
              <input type="hidden" name="userId" value={u.id} />
              <select name="role" defaultValue={u.role} className="rounded border px-2 py-1 text-sm">
                <option value="rm">RM</option>
                <option value="dispatch">Dispatch</option>
                <option value="admin">Admin</option>
                <option value="pending">Revoke (set pending)</option>
              </select>
              <button
                type="submit"
                className="rounded border px-3 py-1 text-sm"
              >
                Update
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
