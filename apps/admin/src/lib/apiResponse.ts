/**
 * Unwrap common backend JSON shapes: { success, dataKey } or raw arrays.
 */
export function unwrapList<T>(res: { data?: unknown }, keys: string[]): T[] {
  const data = res.data as Record<string, unknown> | unknown[] | undefined;
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object') {
    for (const key of keys) {
      const v = (data as Record<string, unknown>)[key];
      if (Array.isArray(v)) return v as T[];
    }
  }
  return [];
}

export function unwrapRecord<T extends Record<string, unknown>>(
  res: { data?: unknown },
  key: string
): T | null {
  const data = res.data as Record<string, unknown> | undefined;
  if (!data || typeof data !== 'object') return null;
  const v = data[key];
  if (v && typeof v === 'object' && !Array.isArray(v)) return v as T;
  return null;
}
