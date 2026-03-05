// lib/fetch-cache.ts
// Lightweight in-memory GET cache for client-side API calls.
// Returns a CachedResponse that mirrors the fetch Response interface
// (ok, status, text(), json()) so call sites need no structural changes.

interface CacheEntry {
  body: string;
  status: number;
  timestamp: number;
}

class CachedResponse {
  ok: boolean;
  status: number;
  private _body: string;

  constructor(body: string, status: number) {
    this._body = body;
    this.status = status;
    this.ok = status >= 200 && status < 300;
  }

  async text(): Promise<string> {
    return this._body;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async json(): Promise<any> {
    return JSON.parse(this._body);
  }
}

const cache = new Map<string, CacheEntry>();
const DEFAULT_TTL = 60_000; // 60 seconds

export async function cachedFetch(url: string, ttl = DEFAULT_TTL): Promise<CachedResponse> {
  const now = Date.now();
  const entry = cache.get(url);

  if (entry && now - entry.timestamp < ttl) {
    return new CachedResponse(entry.body, entry.status);
  }

  const res = await fetch(url);
  const body = await res.text();

  if (res.ok) {
    cache.set(url, { body, status: res.status, timestamp: now });
  }

  return new CachedResponse(body, res.status);
}

/** Remove all cache entries whose key starts with the given prefix. */
export function invalidateCachePrefix(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}
