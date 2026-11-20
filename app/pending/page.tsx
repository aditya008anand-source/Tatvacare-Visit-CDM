export default function PendingPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="max-w-sm text-center">
        <h1 className="mb-2 text-xl font-semibold">Waiting for approval</h1>
        <p className="text-sm text-gray-500">
          Your account has been created. An admin needs to approve your access
          and assign your role before you can continue. Check back shortly.
        </p>
      </div>
    </div>
  );
}
