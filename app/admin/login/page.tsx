import AdminLoginForm from "@/components/admin/AdminLoginForm";

type Props = {
  searchParams: Promise<{ reason?: string }>;
};

export default async function AdminLoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const idleMessage =
    params.reason === "idle"
      ? "1 saat işlem yapılmadığı için oturumunuz sonlandırıldı. Lütfen tekrar giriş yapın."
      : undefined;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-gray-900">Admin Girişi</h1>
        <p className="mt-1 text-sm text-gray-500">Tatildeyiz yönetim paneli</p>
        <p className="mt-3 text-xs text-gray-500">
          Giriş için WhatsApp ile 5 haneli doğrulama kodu gönderilir.
        </p>
        <div className="mt-6">
          <AdminLoginForm idleMessage={idleMessage} />
        </div>
      </div>
    </div>
  );
}
