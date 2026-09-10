import { defineFunction } from "@aws-amplify/backend";

/**
 * Moderated link creation. RATE_LIMIT_TABLE_NAME is added in backend.ts once
 * the table exists. SAFE_BROWSING_API_KEY is read from the build environment
 * (set GOOGLE_SAFE_BROWSING_API_KEY in the Amplify console / shell to enable
 * Google Safe Browsing checks; heuristics run regardless).
 */
export const createLink = defineFunction({
  name: "create-link",
  entry: "./handler.ts",
  timeoutSeconds: 20,
  runtime: 20,
  environment: {
    SAFE_BROWSING_API_KEY: process.env.GOOGLE_SAFE_BROWSING_API_KEY ?? "",
  },
});
