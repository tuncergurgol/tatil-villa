import { getTatilAssistantRuntimeContext } from "@/lib/queries/tatil-assistant";
import TatilAssistantWidget from "@/components/tatil-assistant/TatilAssistantWidget";

export default async function TatilAssistantWidgetLoader() {
  const context = await getTatilAssistantRuntimeContext();
  if (!context) return null;

  return <TatilAssistantWidget welcomeMessage={context.welcomeMessage} />;
}
