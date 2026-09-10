/**
 * E2E test for the moderated createShortLink flow, run against the sandbox
 * backend as an anonymous guest (exactly like the public site would).
 *
 * Usage: node scripts/e2e-moderation-test.mjs
 */
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/api";
import { readFileSync } from "node:fs";

const config = JSON.parse(
  readFileSync(new URL("../amplifyconfiguration.json", import.meta.url)),
);
Amplify.configure(config);
const client = generateClient();

const randomHash = () =>
  Array.from({ length: 5 }, () =>
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".charAt(
      Math.floor(Math.random() * 62),
    ),
  ).join("");

const createShortLink = async (hash, destinationUrl) =>
  client.graphql({
    query: `mutation CreateShortLink($hash: String!, $destinationUrl: String!) {
      createShortLink(hash: $hash, destinationUrl: $destinationUrl) { id hash destinationUrl }
    }`,
    variables: { hash, destinationUrl },
  });

const directModelCreate = async (hash, destinationUrl) =>
  client.graphql({
    query: `mutation CreateLink($input: CreateLinkInput!) {
      createLink(input: $input) { id hash destinationUrl }
    }`,
    variables: { input: { hash, destinationUrl } },
  });

const readByHash = async (hash) =>
  client.graphql({
    query: `query ListLinks($hash: String!) {
      listLinks(filter: { hash: { eq: $hash } }) { items { id hash destinationUrl } }
    }`,
    variables: { hash },
  });

let pass = 0;
let fail = 0;
const check = (name, ok, detail = "") => {
  console.log(
    `${ok ? "✅ PASS" : "❌ FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`,
  );
  ok ? pass++ : fail++;
};

const expectRejected = async (name, promise, reasonSubstring) => {
  try {
    await promise;
    check(name, false, "expected rejection but call succeeded");
  } catch (error) {
    const message = error?.errors?.[0]?.message ?? String(error);
    check(
      name,
      message.toLowerCase().includes(reasonSubstring.toLowerCase()),
      message,
    );
  }
};

// 1. Benign link is created
const goodHash = randomHash();
try {
  const result = await createShortLink(
    goodHash,
    "https://example.com/some/page",
  );
  check("benign link created", result.data?.createShortLink?.hash === goodHash);
} catch (error) {
  check(
    "benign link created",
    false,
    JSON.stringify(error?.errors ?? String(error)),
  );
}

// 2. Created link is readable by guests (redirect path)
try {
  const result = await readByHash(goodHash);
  check("guest can read link", result.data?.listLinks?.items?.length === 1);
} catch (error) {
  check(
    "guest can read link",
    false,
    JSON.stringify(error?.errors ?? String(error)),
  );
}

// 3-7. Malicious destinations are rejected with the right reasons
await expectRejected(
  "blocked host (tw1.ru)",
  createShortLink(randomHash(), "https://cz999999.tw1.ru/innocuous/"),
  "blocked",
);
await expectRejected(
  "phishing keyword (paiement)",
  createShortLink(randomHash(), "https://random-host.com/Paiement/index.html"),
  "payment phishing",
);
await expectRejected(
  "brand impersonation (wero)",
  createShortLink(randomHash(), "https://evil-site.io/wero/login"),
  "impersonates",
);
await expectRejected(
  "brand impersonation (vinted)",
  createShortLink(randomHash(), "https://not-vinted.example.net/vinted-cc/"),
  "impersonates",
);
await expectRejected(
  "IP-literal destination",
  createShortLink(randomHash(), "http://45.83.122.10/pay"),
  "IP address",
);
await expectRejected(
  "invalid hash",
  createShortLink("../../etc", "https://example.com"),
  "hash",
);

// 8. Brand keyword on the real brand domain is allowed
try {
  const result = await createShortLink(
    randomHash(),
    "https://www.vinted.fr/items/12345",
  );
  check("real brand domain allowed", Boolean(result.data?.createShortLink?.id));
} catch (error) {
  check(
    "real brand domain allowed",
    false,
    JSON.stringify(error?.errors ?? String(error)),
  );
}

// 9. Direct model create as guest is denied (the old abuse vector)
await expectRejected(
  "direct createLink denied for guests",
  directModelCreate(randomHash(), "https://attacker-chosen.example.com/"),
  "",
);

// 10. Rate limit kicks in (10/hr/IP; we already used a few above)
let limited = false;
for (let i = 0; i < 12 && !limited; i++) {
  try {
    await createShortLink(randomHash(), `https://example.com/bulk/${i}`);
  } catch (error) {
    const message = error?.errors?.[0]?.message ?? "";
    if (message.includes("Too many links")) limited = true;
  }
}
check("rate limit enforced", limited);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
