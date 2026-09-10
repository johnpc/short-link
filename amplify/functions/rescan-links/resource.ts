import { defineFunction } from "@aws-amplify/backend";

/**
 * Scheduled sweep (wired to EventBridge in backend.ts) that re-moderates every
 * stored link and deletes any that fail — catches destinations that turn
 * malicious after creation or that newer blocklist rules cover.
 */
export const rescanLinks = defineFunction({
  name: "rescan-links",
  entry: "./handler.ts",
  timeoutSeconds: 300,
  memoryMB: 256,
  runtime: 20,
  environment: {
    SAFE_BROWSING_API_KEY: process.env.GOOGLE_SAFE_BROWSING_API_KEY ?? "",
  },
});
