import type { SupabaseClient } from '@supabase/supabase-js';
import type { User as AppUser } from '@/lib/types';

type MatchRow = {
  match_id: string;
  event_key: string;
  match_number: number;
  red_teams: Array<{ team_number: number; team_name: string; team_color: string }>;
  blue_teams: Array<{ team_number: number; team_name: string; team_color: string }>;
};

const PRELOAD_VERSION = 'v1';

function getDayKey(organizationId: string, eventKey: string): string {
  const day = new Date().toISOString().slice(0, 10);
  return `${day}::${organizationId}::${eventKey}`;
}

function setLocalJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // best effort
  }
}

export async function preloadDailyScoutingCaches(
  supabase: SupabaseClient,
  user: AppUser | null
): Promise<void> {
  if (typeof window === 'undefined' || !user?.organization_id) return;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    const compRes = await fetch('/api/my-competition', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const compJson = compRes.ok ? await compRes.json() : {};
    const eventKey = String(compJson.current_event_key || '').trim();
    if (!eventKey) return;

    const dayKey = getDayKey(user.organization_id, eventKey);
    const dayKeyStorage = 'avalanche:preload:dayKey';
    if (window.localStorage.getItem(dayKeyStorage) === dayKey) {
      return;
    }

    const [matchesRes, pitTeamsRes, scoutNamesRes] = await Promise.all([
      fetch('/api/matches', { headers: { Authorization: `Bearer ${session.access_token}` } }),
      fetch('/api/pit-scouting/event-teams', { headers: { Authorization: `Bearer ${session.access_token}` } }),
      fetch('/api/scout-names', { headers: { Authorization: `Bearer ${session.access_token}` } }),
    ]);

    const matchesJson = matchesRes.ok ? await matchesRes.json() : {};
    const pitTeamsJson = pitTeamsRes.ok ? await pitTeamsRes.json() : {};
    const scoutNamesJson = scoutNamesRes.ok ? await scoutNamesRes.json() : {};

    const normalizedMatches: MatchRow[] = Array.isArray(matchesJson.matches) ? matchesJson.matches : [];
    const normalizedPitTeams = Array.isArray(pitTeamsJson.teams)
      ? pitTeamsJson.teams.map((team: { team_number: number; team_name: string }) => ({
          team_number: Number(team.team_number),
          team_name: String(team.team_name || ''),
        }))
      : [];
    const normalizedScoutNames = Array.isArray(scoutNamesJson.names)
      ? scoutNamesJson.names.map((name: unknown) => String(name || '')).filter(Boolean)
      : [];

    setLocalJson(`avalanche:preload:matchSchedule:${user.organization_id}:${eventKey}`, normalizedMatches);
    setLocalJson(`avalanche:preload:pitTeams:${user.organization_id}:${eventKey}`, normalizedPitTeams);
    setLocalJson(`avalanche:preload:scoutNames:${user.organization_id}`, normalizedScoutNames);
    setLocalJson('avalanche:preload:lastRefreshMeta', {
      refreshedAt: new Date().toISOString(),
      eventKey,
      organizationId: user.organization_id,
      version: PRELOAD_VERSION,
      source: ['api/matches', 'api/pit-scouting/event-teams', 'api/scout-names'],
    });
    window.localStorage.setItem(dayKeyStorage, dayKey);
  } catch (error) {
    console.warn('daily preload failed', error);
  }
}
