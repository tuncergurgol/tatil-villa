/**
 * Messenger konuşmaları ve Facebook gönderi yorumlarını gelen kutusuna alır.
 *   node --env-file=.env ./node_modules/tsx/dist/cli.mjs scripts/sync-meta-inbox.ts
 */
import { syncMetaInbox } from "../lib/meta-inbox";

async function main() {
  const result = await syncMetaInbox(true);
  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }
  console.log("meta inbox sync ok");
}

main();
