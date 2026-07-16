import type { Metadata } from "next";
import CallbackRequestPageView from "@/components/corporate/CallbackRequestPageView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sizi Arayalım",
  description:
    "Ücretsiz geri arama formu. Telefonunuzu doğrulayın, villa uzmanlarımız sizi arasın.",
};

export default function SiziArayalimPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <CallbackRequestPageView />
    </div>
  );
}
