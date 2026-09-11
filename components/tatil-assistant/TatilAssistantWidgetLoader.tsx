import { getTatilAssistantWelcomeMessage } from "@/lib/queries/tatil-assistant";
import DeferredPublicChrome from "@/components/DeferredPublicChrome";

export default async function TatilAssistantWidgetLoader() {
  const welcomeMessage = await getTatilAssistantWelcomeMessage();

  return <DeferredPublicChrome assistantWelcome={welcomeMessage} />;
}
