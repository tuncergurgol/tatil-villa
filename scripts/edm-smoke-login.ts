/**
 * EDM SOAP Login smoke test.
 * Usage:
 *   EDM_ENABLED=true EDM_ENV=test EDM_USERNAME=... EDM_PASSWORD=... npx tsx scripts/edm-smoke-login.ts
 */
import { getEdmConfig } from "../lib/edm/config";
import { EdmSoapClient } from "../lib/edm/client";

async function main() {
  process.env.EDM_ENABLED = process.env.EDM_ENABLED || "true";
  const config = getEdmConfig();
  if (!config.username || !config.password) {
    throw new Error("EDM_USERNAME / EDM_PASSWORD gerekli");
  }
  const client = new EdmSoapClient(config);
  const sessionId = await client.login();
  let counter: number | null = null;
  try {
    counter = await client.checkCounter();
  } catch (e) {
    console.warn("CheckCounter:", e instanceof Error ? e.message : e);
  }
  await client.logout();
  console.log(
    JSON.stringify(
      {
        ok: true,
        environment: config.environment,
        endpoint: config.endpoint,
        sessionId,
        counterLeft: counter,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
