import AdminForgotPasswordForm from "@/components/admin/AdminForgotPasswordForm";

export default function AdminForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-gray-900">Şifremi Unuttum</h1>
        <p className="mt-1 text-sm text-gray-500">Bont yönetim paneli</p>
        <div className="mt-6">
          <AdminForgotPasswordForm />
        </div>
      </div>
    </div>
  );
}
