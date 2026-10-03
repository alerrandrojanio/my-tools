import { createClient } from "redis";

function buildClient(url: string) {
  return createClient({ url, socket: { connectTimeout: 5000 } });
}

type RedisClient = ReturnType<typeof buildClient>;

/**
 * Lazily connects to Redis and reuses a single client. Server-side only:
 * the connection string comes from the REDIS_URL environment variable.
 */
export class RedisConnection {
  private client: RedisClient | null = null;
  private connecting: Promise<RedisClient> | null = null;

  constructor(private readonly url: string | undefined) {}

  async getClient(): Promise<RedisClient> {
    if (this.client?.isReady) return this.client;
    this.connecting ??= this.connect().finally(() => {
      this.connecting = null;
    });
    return this.connecting;
  }

  async disconnect(): Promise<void> {
    const client = this.client;
    this.client = null;
    if (client?.isOpen) await client.quit();
  }

  private async connect(): Promise<RedisClient> {
    if (!this.url) throw new Error("REDIS_URL is not configured.");

    const client = buildClient(this.url);
    client.on("error", (error) => console.error("[redis]", error.message));

    await client.connect();
    this.client = client;
    return client;
  }
}

// Keep one instance across hot reloads in development.
const globalForRedis = globalThis as unknown as {
  redisConnection?: RedisConnection;
};

globalForRedis.redisConnection ??= new RedisConnection(process.env.REDIS_URL);

export const redisConnection: RedisConnection = globalForRedis.redisConnection;
