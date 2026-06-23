"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiCache, fetchJson, fetchMutation, getCacheKey } from "@/lib/api/client-cache";

type Identifiable = { id: string };

type UseCachedListOptions = {
  enabled?: boolean;
};

export function useCachedList<T extends Identifiable>(
  url: string,
  options: UseCachedListOptions = {},
) {
  const { enabled = true } = options;
  const cacheKey = getCacheKey(url);

  const [items, setItems] = useState<T[]>(() => apiCache.get<T[]>(cacheKey) ?? []);
  const [loading, setLoading] = useState(() => enabled && !apiCache.has(cacheKey));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const submittingRef = useRef(false);
  const deletingRef = useRef(false);

  const syncFromCache = useCallback(() => {
    const cached = apiCache.get<T[]>(cacheKey);
    if (cached) setItems(cached);
  }, [cacheKey]);

  const reload = useCallback(
    async (force = false) => {
      if (!enabled) return items;

      if (!force && apiCache.has(cacheKey)) {
        const cached = apiCache.get<T[]>(cacheKey)!;
        setItems(cached);
        setLoading(false);
        return cached;
      }

      setLoading(true);
      setError(null);
      try {
        const next = await fetchJson<T[]>(url);
        apiCache.set(cacheKey, next);
        setItems(next);
        return next;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [cacheKey, enabled, items, url],
  );

  useEffect(() => {
    if (!enabled) return;
    void reload();
  }, [enabled, reload]);

  const save = useCallback(
    async (params: {
      url: string;
      method: "POST" | "PATCH";
      body: unknown;
    }) => {
      if (submittingRef.current) return null;
      submittingRef.current = true;
      setSubmitting(true);
      setError(null);
      try {
        const saved = await fetchJson<T>(params.url, {
          method: params.method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params.body),
        });
        const operation = params.method === "POST" ? "create" : "update";
        apiCache.patchList(cacheKey, saved, operation);
        syncFromCache();
        return saved;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Save failed";
        setError(message);
        throw err;
      } finally {
        submittingRef.current = false;
        setSubmitting(false);
      }
    },
    [cacheKey, syncFromCache],
  );

  const remove = useCallback(
    async (deleteUrl: string, id: string) => {
      if (deletingRef.current) return false;
      deletingRef.current = true;
      setDeletingId(id);
      setError(null);
      try {
        await fetchMutation(deleteUrl, { method: "DELETE" });
        apiCache.patchList(cacheKey, { id } as T, "delete");
        syncFromCache();
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Delete failed";
        setError(message);
        throw err;
      } finally {
        deletingRef.current = false;
        setDeletingId(null);
      }
    },
    [cacheKey, syncFromCache],
  );

  return {
    items,
    loading,
    error,
    submitting,
    deletingId,
    setError,
    reload,
    invalidate: () => reload(true),
    save,
    remove,
    cacheKey,
  };
}
