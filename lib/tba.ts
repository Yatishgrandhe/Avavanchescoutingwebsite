/**
 * The Blue Alliance API v3 (server-side only — use TBA_API_KEY in env).
 * @see https://www.thebluealliance.com/apidocs/v3
 */

const TBA_BASE = 'https://www.thebluealliance.com/api/v3';

export function getTbaApiKey(): string {
  const key = process.env.TBA_API_KEY?.trim();
  if (!key) {
    throw new Error('TBA_API_KEY is not configured');
  }
  return key;
}

export async function tbaFetchJson<T>(path: string): Promise<T> {
  const key = getTbaApiKey();
  const url = path.startsWith('http') ? path : `${TBA_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
  const res = await fetch(url, {
    headers: {
      'X-TBA-Auth-Key': key,
      Accept: 'application/json',
    },
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`TBA ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

export type TbaEventSimple = {
  key: string;
  name: string;
  short_name?: string;
  event_code?: string;
  year?: number;
  city?: string;
  state_prov?: string;
  country?: string;
  start_date?: string;
  end_date?: string;
  event_type_string?: string;
};

export type TbaMatch = {
  key: string;
  comp_level: string;
  set_number: number;
  match_number: number;
  alliances: {
    red: { team_keys: string[]; score?: number };
    blue: { team_keys: string[]; score?: number };
  };
  event_key: string;
  time?: number;
  predicted_time?: number;
  actual_time?: number;
};

export type TbaTeam = {
  key: string;
  team_number: number;
  nickname: string;
  name: string;
};

const COMP_ORDER: Record<string, number> = {
  qm: 0,
  ef: 1,
  qf: 2,
  sf: 3,
  f: 4,
};

export function sortTbaMatches(matches: TbaMatch[]): TbaMatch[] {
  return [...matches].sort((a, b) => {
    const la = COMP_ORDER[a.comp_level] ?? 99;
    const lb = COMP_ORDER[b.comp_level] ?? 99;
    if (la !== lb) return la - lb;
    if (a.set_number !== b.set_number) return a.set_number - b.set_number;
    return a.match_number - b.match_number;
  });
}

export function teamKeysToNumbers(keys: string[]): number[] {
  return keys.map((k) => parseInt(String(k).replace(/^frc/i, ''), 10)).filter((n) => Number.isFinite(n));
}
