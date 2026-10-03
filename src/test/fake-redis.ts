/** Minimal in-memory stand-in for the Redis commands the app uses. */
export class FakeRedis {
  private store = new Map<string, string>();
  readonly expirations = new Map<string, number>();

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async set(
    key: string,
    value: string,
    options?: { NX?: boolean },
  ): Promise<"OK" | null> {
    if (options?.NX && this.store.has(key)) return null;
    this.store.set(key, value);
    return "OK";
  }

  async incr(key: string): Promise<number> {
    const next = Number(this.store.get(key) ?? 0) + 1;
    this.store.set(key, String(next));
    return next;
  }

  async expire(key: string, seconds: number): Promise<number> {
    this.expirations.set(key, seconds);
    return 1;
  }

  reset(): void {
    this.store.clear();
    this.expirations.clear();
  }
}

export const fakeRedis = new FakeRedis();
