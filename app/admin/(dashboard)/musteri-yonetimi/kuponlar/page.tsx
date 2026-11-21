import CouponManagement from "@/components/admin/coupons/CouponManagement";
import { getAdminCouponListData } from "@/lib/queries/admin-coupons";

export const dynamic = "force-dynamic";

export default async function AdminCouponsPage() {
  const coupons = await getAdminCouponListData();
  return <CouponManagement coupons={coupons} />;
}
