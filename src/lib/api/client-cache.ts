type Identifiable = { id: string };

const store = new Map<string, unknown>();

export function getCacheKey(url: string) {
  return url;
}

export const apiCache = {
  get<T>(key: string): T | undefined {
    if (!store.has(key)) return undefined;
    return store.get(key) as T;
  },

  has(key: string) {
    return store.has(key);
  },

  set<T>(key: string, value: T) {
    store.set(key, value);
  },

  delete(key: string) {
    store.delete(key);
  },

  invalidatePrefix(prefix: string) {
    for (const key of store.keys()) {
      if (key.startsWith(prefix)) {
        store.delete(key);
      }
    }
  },

  patchList<T extends Identifiable>(
    key: string,
    item: T,
    operation: "create" | "update" | "delete",
  ) {
    const current = store.get(key);
    if (!Array.isArray(current)) return;

    if (operation === "create") {
      store.set(key, [...current, item]);
      return;
    }

    if (operation === "update") {
      store.set(
        key,
        current.map((row) => (row.id === item.id ? item : row)),
      );
      return;
    }

    store.set(
      key,
      current.filter((row) => row.id !== item.id),
    );
  },
};

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Request failed");
  }
  if (res.status === 204) {
    return undefined as T;
  }
  const text = await res.text();
  if (!text) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
}

export async function fetchMutation(url: string, init?: RequestInit): Promise<void> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Request failed");
  }
}
