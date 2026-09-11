import AdminResetPasswordForm from "@/components/admin/AdminResetPasswordForm";

type Props = {
  searchParams: Promise<{ token?: string }>;
};

export default async function AdminResetPasswordPage({ searchParams }: Props) {
  const params = await searchParams;
  const token = params.token?.trim() ?? "";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-gray-900">Yeni Şifre Belirle</h1>
        <p className="mt-1 text-sm text-gray-500">Bont yönetim paneli</p>
        <div className="mt-6">
          <AdminResetPasswordForm token={token} />
        </div>
      </div>
    </div>
  );
}
