import { createHash } from "node:crypto";
import { redisConnection } from "./redis-connection";
import { generateCode } from "./url-utils";

const LINK_PREFIX = "shortlink:";
const URL_PREFIX = "shorturl:";
const MAX_ATTEMPTS = 5;

function hashUrl(url: string): string {
  return createHash("sha256").update(url).digest("hex");
}

/**
 * Stores a URL and returns its short code. Shortening the same URL twice
 * returns the same code (looked up through a hash of the URL).
 */
export async function createShortLink(url: string): Promise<string> {
  const client = await redisConnection.getClient();
  const urlKey = `${URL_PREFIX}${hashUrl(url)}`;

  const existing = await client.get(urlKey);
  if (existing) return existing;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const code = generateCode();
    // NX: never overwrite a code that is already taken.
    const stored = await client.set(`${LINK_PREFIX}${code}`, url, { NX: true });
    if (stored === "OK") {
      await client.set(urlKey, code);
      return code;
    }
  }

  throw new Error("Could not allocate a unique short code.");
}

export async function resolveShortLink(code: string): Promise<string | null> {
  const client = await redisConnection.getClient();
  return client.get(`${LINK_PREFIX}${code}`);
}
