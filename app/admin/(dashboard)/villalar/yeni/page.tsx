import { Suspense } from "react";
import VillaCreateForm from "@/components/admin/villas/VillaCreateForm";

function VillaCreateFormFallback() {
  return (
    <div className="flex h-[calc(100dvh-3rem)] items-center justify-center rounded-2xl border border-gray-200 bg-white p-8 text-sm text-gray-500">
      Yükleniyor...
    </div>
  );
}

export default function NewVillaPage() {
  return (
    <Suspense fallback={<VillaCreateFormFallback />}>
      <VillaCreateForm />
    </Suspense>
  );
}
