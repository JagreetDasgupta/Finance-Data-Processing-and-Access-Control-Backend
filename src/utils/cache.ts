type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

class TtlCache {
  private store = new Map<string, CacheEntry<unknown>>();

  set<T>(key: string, value: T, ttlSeconds: number): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  invalidatePrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }
}

export const cache = new TtlCache();

export const buildCacheKey = (...parts: (string | number | undefined)[]): string =>
  parts.filter((p) => p !== undefined).join(':');

export const TTL = {
  SUMMARY:   60,
  BREAKDOWN: 60,
  TRENDS:    120,
  RECENT:    30,
} as const;
