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

  private sets = new Map<string, Set<string>>();
  private hashes = new Map<string, Map<string, string>>();

  async del(keys: string | string[]): Promise<number> {
    let removed = 0;
    for (const key of [keys].flat()) {
      if (this.store.delete(key)) removed++;
      if (this.hashes.delete(key)) removed++;
      if (this.sets.delete(key)) removed++;
    }
    return removed;
  }

  async sAdd(key: string, member: string): Promise<number> {
    const set = this.sets.get(key) ?? new Set<string>();
    this.sets.set(key, set);
    const had = set.has(member);
    set.add(member);
    return had ? 0 : 1;
  }

  async sRem(key: string, member: string): Promise<number> {
    return this.sets.get(key)?.delete(member) ? 1 : 0;
  }

  async sMembers(key: string): Promise<string[]> {
    return [...(this.sets.get(key) ?? [])];
  }

  async hSet(key: string, field: string, value: string): Promise<number> {
    const hash = this.hashes.get(key) ?? new Map<string, string>();
    this.hashes.set(key, hash);
    const isNew = !hash.has(field);
    hash.set(field, value);
    return isNew ? 1 : 0;
  }

  async hGetAll(key: string): Promise<Record<string, string>> {
    return Object.fromEntries(this.hashes.get(key) ?? []);
  }

  async hLen(key: string): Promise<number> {
    return this.hashes.get(key)?.size ?? 0;
  }

  async hDel(key: string, field: string): Promise<number> {
    return this.hashes.get(key)?.delete(field) ? 1 : 0;
  }

  reset(): void {
    this.sets.clear();
    this.hashes.clear();
    this.store.clear();
    this.expirations.clear();
  }
}

export const fakeRedis = new FakeRedis();
