import VillaOwnerManagement from "@/components/admin/villa-owners/VillaOwnerManagement";
import { getTurkeyProvinces } from "@/lib/mernis-ilce";
import { getUnlinkedUsers, getVillaOwners } from "@/lib/queries/villa-owners";

export const dynamic = "force-dynamic";

export default async function VillaSahipleriPage() {
  const [owners, unlinkedUsers] = await Promise.all([
    getVillaOwners(),
    getUnlinkedUsers(),
  ]);
  const provinces = getTurkeyProvinces();

  return (
    <VillaOwnerManagement
      owners={owners}
      unlinkedUsers={unlinkedUsers}
      provinces={provinces}
    />
  );
}
