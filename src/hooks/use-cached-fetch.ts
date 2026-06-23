"use client";

import { useCallback, useEffect, useState } from "react";
import { apiCache, fetchJson, getCacheKey } from "@/lib/api/client-cache";

type UseCachedFetchOptions = {
  enabled?: boolean;
};

export function useCachedFetch<T>(url: string, options: UseCachedFetchOptions = {}) {
  const { enabled = true } = options;
  const cacheKey = getCacheKey(url);

  const [data, setData] = useState<T | undefined>(() => apiCache.get<T>(cacheKey));
  const [loading, setLoading] = useState(() => enabled && !apiCache.has(cacheKey));
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(
    async (force = false) => {
      if (!enabled) return data;

      if (!force && apiCache.has(cacheKey)) {
        const cached = apiCache.get<T>(cacheKey)!;
        setData(cached);
        setLoading(false);
        return cached;
      }

      setLoading(true);
      setError(null);
      try {
        const next = await fetchJson<T>(url);
        apiCache.set(cacheKey, next);
        setData(next);
        return next;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [cacheKey, data, enabled, url],
  );

  const setCachedData = useCallback(
    (updater: T | ((previous: T | undefined) => T)) => {
      setData((previous) => {
        const next =
          typeof updater === "function"
            ? (updater as (previous: T | undefined) => T)(previous)
            : updater;
        apiCache.set(cacheKey, next);
        return next;
      });
    },
    [cacheKey],
  );

  useEffect(() => {
    if (!enabled) return;
    void reload();
  }, [enabled, reload]);

  return {
    data,
    loading,
    error,
    setError,
    reload,
    setCachedData,
    cacheKey,
  };
}
