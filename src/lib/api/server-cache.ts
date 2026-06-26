type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const store = new Map<string, CacheEntry<unknown>>();

function isEnabled() {
  return process.env.SERVER_CACHE !== "false";
}

function pruneExpired() {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.expiresAt <= now) {
      store.delete(key);
    }
  }
}

export const SERVER_CACHE_TTL = {
  catalog: Number(process.env.SERVER_CACHE_CATALOG_TTL_MS ?? 5 * 60_000),
  reference: Number(process.env.SERVER_CACHE_REFERENCE_TTL_MS ?? 60_000),
} as const;

export function catalogCacheKey(
  resource: string,
  params: Record<string, string | boolean | number> = {},
) {
  const suffix = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  return `catalog:${resource}${suffix ? `:${suffix}` : ""}`;
}

export function propertyCacheKey(
  userId: bigint,
  resource: string,
  filters: Record<string, bigint | undefined> = {},
) {
  const suffix = Object.entries(filters)
    .filter(([, value]) => value != null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  return `property:${userId}:${resource}${suffix ? `:${suffix}` : ""}`;
}

export async function cachedQuery<T>(
  key: string,
  ttlMs: number,
  query: () => Promise<T>,
): Promise<T> {
  if (!isEnabled()) {
    return query();
  }

  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expiresAt > now) {
    return hit.value as T;
  }

  if (store.size > 100) {
    pruneExpired();
  }

  const value = await query();
  store.set(key, { value, expiresAt: now + ttlMs });
  return value;
}

export function invalidateServerCache(prefix: string) {
  if (!isEnabled()) return;
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
    }
  }
}

export function invalidateCatalogCache() {
  invalidateServerCache("catalog:");
}

export function invalidatePropertyCache(userId: bigint) {
  invalidateServerCache(`property:${userId}:`);
}
