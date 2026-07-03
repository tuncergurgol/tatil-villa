import { redirect } from "next/navigation";
import { villaTakvimPath } from "@/lib/villa-takvim-path";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ villaId: string }>;
}

export default async function VillaTakvimRedirectPage({ params }: PageProps) {
  const { villaId } = await params;
  redirect(villaTakvimPath(villaId));
}
