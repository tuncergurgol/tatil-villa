import { notFound, redirect } from "next/navigation";
import { villaAdminHizliFiyatPath } from "@/lib/villa-admin-path";
import { findVillaByRouteParam } from "@/lib/villa-admin-path.server";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LegacyVillaHizliFiyatRedirectPage({
  params,
}: PageProps) {
  const { id: routeId } = await params;
  const routeVilla = await findVillaByRouteParam(routeId);

  if (!routeVilla) notFound();

  redirect(villaAdminHizliFiyatPath(routeVilla));
}
