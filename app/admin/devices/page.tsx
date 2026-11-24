import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import UploadForm from "./UploadForm";

export default async function AdminDevicesPage() {
  const supabase = await createClient();

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");

  const { data: me } = await supabase.from("users").select("role").eq("id", authData.user.id).single();
  if (!me || me.role !== "admin") redirect("/");

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Bulk Device Update</h1>
        <Link href="/admin" className="text-sm text-gray-500 underline">
          Back to Leads
        </Link>
      </div>

      <UploadForm />
    </div>
  );
}
