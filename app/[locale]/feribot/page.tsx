import type { Metadata } from "next";
import PublicServicePage from "@/components/PublicServicePage";

export const metadata: Metadata = {
  title: "Feribot",
};

export default function FeribotPage() {
  return (
    <PublicServicePage
      title="Feribot"
      description="Ada ve liman geçişlerinizi feribot seçenekleriyle kolayca planlayın."
    />
  );
}
