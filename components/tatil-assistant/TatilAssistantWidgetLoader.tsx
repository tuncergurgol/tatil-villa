import { getTatilAssistantRuntimeContext } from "@/lib/queries/tatil-assistant";
import DeferredPublicChrome from "@/components/DeferredPublicChrome";

export default async function TatilAssistantWidgetLoader() {
  const context = await getTatilAssistantRuntimeContext();

  return (
    <DeferredPublicChrome
      assistantWelcome={context?.welcomeMessage ?? null}
    />
  );
}
