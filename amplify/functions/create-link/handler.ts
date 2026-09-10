import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { moderateUrl, safeBrowsingFlaggedUrls } from "../moderation";
import { createLinkRecord, findLinksByHash } from "../data-client";

const CREATES_PER_IP_PER_HOUR = 10;
const HASH_PATTERN = /^[A-Za-z0-9]{4,12}$/;

const dynamo = new DynamoDBClient({});

type CreateShortLinkEvent = {
  arguments: { hash: string; destinationUrl: string };
  identity?: { sourceIp?: string[] | string };
};

const callerIp = (event: CreateShortLinkEvent): string => {
  const sourceIp = event.identity?.sourceIp;
  if (Array.isArray(sourceIp)) {
    return sourceIp[0] ?? "unknown";
  }
  return sourceIp ?? "unknown";
};

const enforceRateLimit = async (ip: string): Promise<void> => {
  const tableName = process.env.RATE_LIMIT_TABLE_NAME;
  if (!tableName) {
    console.error("RATE_LIMIT_TABLE_NAME is not set; skipping rate limit");
    return;
  }
  const hourBucket = Math.floor(Date.now() / 3_600_000);
  const result = await dynamo.send(
    new UpdateItemCommand({
      TableName: tableName,
      Key: { pk: { S: `${ip}#${hourBucket}` } },
      UpdateExpression:
        "ADD #count :one SET expiresAt = if_not_exists(expiresAt, :ttl)",
      ExpressionAttributeNames: { "#count": "count" },
      ExpressionAttributeValues: {
        ":one": { N: "1" },
        ":ttl": { N: String(Math.floor(Date.now() / 1000) + 2 * 3600) },
      },
      ReturnValues: "ALL_NEW",
    }),
  );
  const count = Number(result.Attributes?.count?.N ?? "0");
  if (count > CREATES_PER_IP_PER_HOUR) {
    throw new Error("Too many links created recently. Try again later.");
  }
};

export const handler = async (event: CreateShortLinkEvent) => {
  const { hash, destinationUrl } = event.arguments;
  const ip = callerIp(event);
  console.log({ action: "createShortLink", hash, destinationUrl, ip });

  if (!HASH_PATTERN.test(hash)) {
    throw new Error("Invalid short link hash");
  }

  await enforceRateLimit(ip);

  const verdict = moderateUrl(destinationUrl);
  if (!verdict.allowed) {
    console.warn({ rejected: destinationUrl, reason: verdict.reason, ip });
    throw new Error(`Destination rejected: ${verdict.reason}`);
  }

  const flagged = await safeBrowsingFlaggedUrls(
    [destinationUrl],
    process.env.SAFE_BROWSING_API_KEY,
  );
  if (flagged.length > 0) {
    console.warn({
      rejected: destinationUrl,
      reason: "Safe Browsing match",
      ip,
    });
    throw new Error("Destination rejected: flagged by Google Safe Browsing");
  }

  const existing = await findLinksByHash(hash);
  if (existing.length > 0) {
    throw new Error("Short link already exists. Refresh and try again.");
  }

  return createLinkRecord(hash, destinationUrl);
};
