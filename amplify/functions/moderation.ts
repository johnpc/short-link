export type ModerationVerdict =
  | { allowed: true }
  | { allowed: false; reason: string };

/**
 * Hosts (matched by suffix) that have served phishing kits through this
 * service. Seeded from the September 2026 abuse campaign.
 */
const BLOCKED_HOST_SUFFIXES = [
  "tw1.ru",
  "serv00.net",
  "urpgnpd.com",
  "servicear24verification.info",
  "xulisimo.es",
  "indigita.co.za",
  "belgrindev.com.au",
];

const SUSPICIOUS_URL_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /paiement/i, label: "payment phishing keyword" },
  { pattern: /16shop/i, label: "known phishing kit" },
  { pattern: /secured?[-_]?pay/i, label: "fake payment page keyword" },
  { pattern: /\bnotaire\b/i, label: "notary scam keyword" },
];

/**
 * Brand names that only ever legitimately appear on the brand's own domains.
 * A destination mentioning the brand anywhere else is treated as impersonation.
 */
const PROTECTED_BRANDS: { brand: RegExp; legitHostSuffixes: string[] }[] = [
  { brand: /\bwero\b/i, legitHostSuffixes: ["wero-wallet.eu"] },
  {
    brand: /vinted/i,
    legitHostSuffixes: [
      "vinted.com",
      "vinted.fr",
      "vinted.nl",
      "vinted.be",
      "vinted.de",
      "vinted.es",
      "vinted.it",
      "vinted.co.uk",
      "vinted.lt",
      "vinted.pl",
    ],
  },
  { brand: /leboncoin/i, legitHostSuffixes: ["leboncoin.fr"] },
  { brand: /paypal/i, legitHostSuffixes: ["paypal.com", "paypal.me"] },
];

const hostMatches = (host: string, suffix: string): boolean =>
  host === suffix || host.endsWith(`.${suffix}`);

const IPV4_PATTERN = /^\d{1,3}(\.\d{1,3}){3}$/;

/**
 * Synchronous heuristic checks. Returns the first rule the URL violates.
 */
export const moderateUrl = (rawUrl: string): ModerationVerdict => {
  if (rawUrl.length > 2048) {
    return { allowed: false, reason: "URL is too long" };
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { allowed: false, reason: "Destination is not a valid URL" };
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { allowed: false, reason: "Only http(s) destinations are allowed" };
  }

  const host = url.hostname.toLowerCase();

  if (url.username || url.password) {
    return {
      allowed: false,
      reason: "URLs with embedded credentials are not allowed",
    };
  }
  if (IPV4_PATTERN.test(host) || host.startsWith("[")) {
    return {
      allowed: false,
      reason: "IP address destinations are not allowed",
    };
  }
  if (host === "localhost" || host.endsWith(".local") || !host.includes(".")) {
    return { allowed: false, reason: "Destination host is not allowed" };
  }
  if (host.split(".").some((label) => label.startsWith("xn--"))) {
    return { allowed: false, reason: "Punycode destinations are not allowed" };
  }

  for (const suffix of BLOCKED_HOST_SUFFIXES) {
    if (hostMatches(host, suffix)) {
      return {
        allowed: false,
        reason: "Destination host is blocked for abuse",
      };
    }
  }

  for (const { pattern, label } of SUSPICIOUS_URL_PATTERNS) {
    if (pattern.test(rawUrl)) {
      return { allowed: false, reason: `Destination matches ${label}` };
    }
  }

  for (const { brand, legitHostSuffixes } of PROTECTED_BRANDS) {
    if (
      brand.test(rawUrl) &&
      !legitHostSuffixes.some((s) => hostMatches(host, s))
    ) {
      return {
        allowed: false,
        reason: "Destination impersonates a protected brand",
      };
    }
  }

  return { allowed: true };
};

/**
 * Checks URLs against Google Safe Browsing v4. Returns the subset of `urls`
 * that are flagged. Fails open (returns []) when no API key is configured or
 * the API call fails, since the heuristic checks above still apply.
 */
export const safeBrowsingFlaggedUrls = async (
  urls: string[],
  apiKey: string | undefined,
): Promise<string[]> => {
  if (!apiKey || urls.length === 0) {
    return [];
  }
  const flagged: string[] = [];
  // API limit: 500 threat entries per request
  for (let i = 0; i < urls.length; i += 500) {
    const batch = urls.slice(i, i + 500);
    try {
      const response = await fetch(
        `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client: { clientId: "jpc-short-link", clientVersion: "1.0.0" },
            threatInfo: {
              threatTypes: [
                "MALWARE",
                "SOCIAL_ENGINEERING",
                "UNWANTED_SOFTWARE",
                "POTENTIALLY_HARMFUL_APPLICATION",
              ],
              platformTypes: ["ANY_PLATFORM"],
              threatEntryTypes: ["URL"],
              threatEntries: batch.map((url) => ({ url })),
            },
          }),
        },
      );
      if (!response.ok) {
        console.error(
          "Safe Browsing API error",
          response.status,
          await response.text(),
        );
        continue;
      }
      const body = (await response.json()) as {
        matches?: { threat?: { url?: string } }[];
      };
      for (const match of body.matches ?? []) {
        if (match.threat?.url) {
          flagged.push(match.threat.url);
        }
      }
    } catch (error) {
      console.error("Safe Browsing API call failed", error);
    }
  }
  return flagged;
};
