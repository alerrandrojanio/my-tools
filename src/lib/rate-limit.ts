import { redisConnection } from "./redis-connection";

/** Fixed-window counter: returns true once `limit` requests are exceeded. */
export async function isRateLimited(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const client = await redisConnection.getClient();
  const redisKey = `ratelimit:${key}`;

  const count = await client.incr(redisKey);
  if (count === 1) await client.expire(redisKey, windowSeconds);

  return count > limit;
}
