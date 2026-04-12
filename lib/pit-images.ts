/**
 * Pit rows store images in `robot_image_url` (main) and `photos` (text[] gallery).
 * Supabase/legacy rows may have empty `photos` while main is set — always merge both.
 */

export function normalizePitPhotoUrls(input: {
  robot_image_url?: unknown;
  photos?: unknown;
}): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  const push = (raw: unknown) => {
    if (raw == null) return;
    const s = String(raw).trim();
    if (!s || seen.has(s)) return;
    seen.add(s);
    out.push(s);
  };

  push(input.robot_image_url);

  const p = input.photos;
  if (Array.isArray(p)) {
    for (const x of p) push(x);
  } else if (typeof p === 'string') {
    const t = p.trim();
    if (!t) {
      /* noop */
    } else if (t.startsWith('[')) {
      try {
        const arr = JSON.parse(t) as unknown;
        if (Array.isArray(arr)) for (const x of arr) push(x);
        else push(t);
      } catch {
        push(t);
      }
    } else {
      push(t);
    }
  } else if (p && typeof p === 'object') {
    for (const v of Object.values(p as Record<string, unknown>)) push(v);
  }

  return out;
}

/** Merge multiple normalized lists (e.g. same team, multiple pit rows) — order preserved, deduped. */
export function mergePitPhotoUrlLists(...lists: string[][]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const list of lists) {
    for (const u of list) {
      const s = (u || '').trim();
      if (!s || seen.has(s)) continue;
      seen.add(s);
      out.push(s);
    }
  }
  return out;
}

export function getPitPrimaryImageUrl(input: {
  robot_image_url?: unknown;
  photos?: unknown;
}): string | null {
  const urls = normalizePitPhotoUrls(input);
  return urls[0] ?? null;
}
