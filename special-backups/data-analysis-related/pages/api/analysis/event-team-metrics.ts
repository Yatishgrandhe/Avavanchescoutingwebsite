import type { NextApiRequest, NextApiResponse } from 'next';
import { parseStatboticsFinite, parseStatboticsTeamEventRow } from '@/lib/statbotics-team-events';
import { tbaFetchJson, type TbaEventOprs, type TbaTeam } from '@/lib/tba';

type EventTeamMetricsRow = {
  teamNumber: number;
  opr: number | null;
  autoEpa: number | null;
  teleopEpa: number | null;
  totalEpa: number | null;
};

type EventTeamMetricsResponse = {
  eventKey: string;
  rows: EventTeamMetricsRow[];
};

type StatboticsTeamEpa = {
  totalEpa: number | null;
  autoEpa: number | null;
  teleopEpa: number | null;
};

function parseStatboticsTeamEpa(raw: unknown): StatboticsTeamEpa | null {
  if (!raw || typeof raw !== 'object') return null;

  const parsed = parseStatboticsTeamEventRow(raw);
  if (parsed.totalEPA != null || parsed.autoEPA != null || parsed.teleopEPA != null) {
    return {
      totalEpa: parsed.totalEPA,
      autoEpa: parsed.autoEPA,
      teleopEpa: parsed.teleopEPA,
    };
  }

  const payload = raw as Record<string, unknown>;
  const epa = payload.epa as Record<string, unknown> | undefined;
  const breakdown = epa?.breakdown as Record<string, unknown> | undefined;
  const stats = epa?.stats as Record<string, unknown> | undefined;
  const totalPoints = epa?.total_points as Record<string, unknown> | undefined;

  const totalEpa =
    parseStatboticsFinite(stats?.mean) ??
    parseStatboticsFinite(totalPoints?.mean) ??
    parseStatboticsFinite(breakdown?.total_points) ??
    parseStatboticsFinite(epa?.mean);
  const autoEpa = parseStatboticsFinite(breakdown?.auto_points);
  const teleopEpa = parseStatboticsFinite(breakdown?.teleop_points);

  if (totalEpa == null && autoEpa == null && teleopEpa == null) return null;
  return { totalEpa, autoEpa, teleopEpa };
}

function extractTbaComponentMap(
  eventOprs: TbaEventOprs,
  includePatterns: RegExp[],
  excludePatterns: RegExp[] = []
): Record<string, number> | null {
  const entries = Object.entries(eventOprs || {});
  for (const [key, value] of entries) {
    if (key === 'oprs' || key === 'ccwms' || key === 'dprs') continue;
    if (!includePatterns.every((pattern) => pattern.test(key))) continue;
    if (excludePatterns.some((pattern) => pattern.test(key))) continue;
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    return value as Record<string, number>;
  }
  return null;
}

async function fetchStatboticsByTeams(
  eventKey: string,
  teamNumbers: number[]
): Promise<Map<number, StatboticsTeamEpa>> {
  const byTeam = new Map<number, StatboticsTeamEpa>();

  const responses = await Promise.all(
    teamNumbers.map(async (teamNumber) => {
      try {
        const response = await fetch(
          `https://api.statbotics.io/v3/team_event/${encodeURIComponent(String(teamNumber))}/${encodeURIComponent(eventKey)}`,
          {
            method: 'GET',
            headers: { Accept: 'application/json' },
          }
        );

        if (response.ok) {
          const payload: unknown = await response.json();
          return { teamNumber, payload };
        }

        const fallback = await fetch(
          `https://api.statbotics.io/v3/team/${encodeURIComponent(String(teamNumber))}`,
          {
            method: 'GET',
            headers: { Accept: 'application/json' },
          }
        );

        if (!fallback.ok) {
          console.warn('event-team-metrics: Statbotics request not ok', {
            eventKey,
            teamNumber,
            teamEventStatus: response.status,
            teamStatus: fallback.status,
          });
          return null;
        }

        return { teamNumber, payload: (await fallback.json()) as unknown };
      } catch (error) {
        console.warn('event-team-metrics: Statbotics request failed', {
          eventKey,
          teamNumber,
          error,
        });
        return null;
      }
    })
  );

  for (const response of responses) {
    if (!response) continue;
    const parsed = parseStatboticsTeamEpa(response.payload);
    if (!parsed) continue;
    byTeam.set(response.teamNumber, parsed);
  }

  return byTeam;
}

async function fetchStatboticsByEventKeys(
  eventKeys: string[]
): Promise<Map<number, StatboticsTeamEpa>> {
  const byTeam = new Map<number, StatboticsTeamEpa>();

  const responses = await Promise.all(
    eventKeys.map(async (key) => {
      try {
        const response = await fetch(
          `https://api.statbotics.io/v3/team_events?event=${encodeURIComponent(key)}`,
          {
            method: 'GET',
            headers: { Accept: 'application/json' },
          }
        );
        if (!response.ok) {
          console.warn('event-team-metrics: Statbotics request not ok', {
            eventKey: key,
            status: response.status,
          });
          return null;
        }
        const payload: unknown = await response.json();
        return Array.isArray(payload) ? payload : null;
      } catch (error) {
        console.warn('event-team-metrics: Statbotics request failed', { eventKey: key, error });
        return null;
      }
    })
  );

  for (const payload of responses) {
    if (!payload) continue;
    for (const raw of payload) {
      const parsed = parseStatboticsTeamEventRow(raw);
      const teamNum = Number(parsed.team);
      if (!Number.isFinite(teamNum)) continue;
      byTeam.set(teamNum, {
        totalEpa: parsed.totalEPA,
        autoEpa: parsed.autoEPA,
        teleopEpa: parsed.teleopEPA,
      });
    }
  }

  return byTeam;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<EventTeamMetricsResponse | { error: string }>
): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    return;
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const eventKey = String(body.eventKey || '').trim().toLowerCase();

  if (!eventKey) {
    res.status(400).json({ error: 'Event key is required.' });
    return;
  }

  try {
    const [tbaTeams, rawEventOprs, divisionKeys] = await Promise.all([
      tbaFetchJson<TbaTeam[]>(`/event/${encodeURIComponent(eventKey)}/teams`),
      tbaFetchJson<TbaEventOprs>(`/event/${encodeURIComponent(eventKey)}/oprs`),
      tbaFetchJson<string[]>(`/event/${encodeURIComponent(eventKey)}/divisions`).catch(() => []),
    ]);

    const teamNumbers = (tbaTeams || [])
      .map((team) => Number(team.team_number))
      .filter((teamNumber) => Number.isFinite(teamNumber));

    const [statboticsByTeams, statboticsByEvent] = await Promise.all([
      fetchStatboticsByTeams(eventKey, teamNumbers),
      fetchStatboticsByEventKeys(
        Array.from(new Set([eventKey, ...(Array.isArray(divisionKeys) ? divisionKeys : [])]))
      ),
    ]);

    const eventOprs = rawEventOprs || {};
    const oprMap = eventOprs.oprs || {};
    const totalEpaMap = eventOprs.ccwms || {};
    const autoComponentMap =
      extractTbaComponentMap(eventOprs, [/auto/i], [/teleop/i]) ||
      extractTbaComponentMap(eventOprs, [/auto/i, /opr/i], []);
    const teleopComponentMap =
      extractTbaComponentMap(eventOprs, [/teleop/i], []) ||
      extractTbaComponentMap(eventOprs, [/tele/i, /opr/i], []);

    const rows = (tbaTeams || []).map((team) => {
      const teamNumber = team.team_number;
      const teamKey = `frc${teamNumber}`;
      const oprRaw = oprMap[teamKey];
      const opr = Number.isFinite(oprRaw) ? Number(oprRaw) : null;
      const autoRaw = autoComponentMap?.[teamKey];
      const teleopRaw = teleopComponentMap?.[teamKey];
      const totalEpaRaw = totalEpaMap[teamKey];

      const sb = statboticsByTeams.get(teamNumber) ?? statboticsByEvent.get(teamNumber);
      return {
        teamNumber,
        opr,
        autoEpa:
          sb?.autoEpa ??
          (Number.isFinite(autoRaw) ? Number(autoRaw) : null),
        teleopEpa:
          sb?.teleopEpa ??
          (Number.isFinite(teleopRaw) ? Number(teleopRaw) : null),
        totalEpa:
          sb?.totalEpa ??
          (Number.isFinite(totalEpaRaw) ? Number(totalEpaRaw) : null),
      };
    });

    res.status(200).json({
      eventKey,
      rows,
    });
  } catch (error) {
    console.error('event-team-metrics: upstream API failure', {
      eventKey,
      error,
    });

    const message = error instanceof Error ? error.message : 'Failed to fetch event team metrics';
    if (message.includes('TBA 404')) {
      res.status(404).json({ error: 'Event not found. Check your event key.' });
      return;
    }

    res.status(502).json({ error: 'Failed to fetch event team metrics.' });
  }
}
