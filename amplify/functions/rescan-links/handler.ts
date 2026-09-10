import { moderateUrl, safeBrowsingFlaggedUrls } from "../moderation";
import { deleteLinkRecord, listAllLinks } from "../data-client";

export const handler = async () => {
  const links = await listAllLinks();
  console.log(`Rescanning ${links.length} links`);

  const toDelete = new Map<
    string,
    { destinationUrl: string; reason: string }
  >();

  const heuristicallyClean = links.filter((link) => {
    const verdict = moderateUrl(link.destinationUrl);
    if (!verdict.allowed) {
      toDelete.set(link.id, {
        destinationUrl: link.destinationUrl,
        reason: verdict.reason,
      });
      return false;
    }
    return true;
  });

  const flagged = new Set(
    await safeBrowsingFlaggedUrls(
      heuristicallyClean.map((link) => link.destinationUrl),
      process.env.SAFE_BROWSING_API_KEY,
    ),
  );
  for (const link of heuristicallyClean) {
    if (flagged.has(link.destinationUrl)) {
      toDelete.set(link.id, {
        destinationUrl: link.destinationUrl,
        reason: "flagged by Google Safe Browsing",
      });
    }
  }

  for (const [id, details] of Array.from(toDelete.entries())) {
    console.warn({ deleting: id, ...details });
    await deleteLinkRecord(id);
  }

  const summary = { scanned: links.length, deleted: toDelete.size };
  console.log(summary);
  return summary;
};
