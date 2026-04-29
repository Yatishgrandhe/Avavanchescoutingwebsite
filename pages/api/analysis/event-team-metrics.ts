import type { NextApiRequest, NextApiResponse } from 'next';
import { parseStatboticsTeamEventRow } from '@/lib/statbotics-team-events';
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
    const [tbaTeams, rawEventOprs, statboticsRes] = await Promise.all([
      tbaFetchJson<TbaTeam[]>(`/event/${encodeURIComponent(eventKey)}/teams`),
      tbaFetchJson<TbaEventOprs>(`/event/${encodeURIComponent(eventKey)}/oprs`),
      fetch(`https://api.statbotics.io/v3/team_events?event=${encodeURIComponent(eventKey)}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      }),
    ]);

    const statboticsByTeam = new Map<
      number,
      { totalEpa: number | null; autoEpa: number | null; teleopEpa: number | null }
    >();
    if (statboticsRes.ok) {
      try {
        const statPayload: unknown = await statboticsRes.json();
        if (Array.isArray(statPayload)) {
          for (const raw of statPayload) {
            const parsed = parseStatboticsTeamEventRow(raw);
            const teamNum = Number(parsed.team);
            if (!Number.isFinite(teamNum)) continue;
            statboticsByTeam.set(teamNum, {
              totalEpa: parsed.totalEPA,
              autoEpa: parsed.autoEPA,
              teleopEpa: parsed.teleopEPA,
            });
          }
        }
      } catch (statErr) {
        console.error('event-team-metrics: Statbotics JSON parse failed', { eventKey, statErr });
      }
    } else {
      console.warn('event-team-metrics: Statbotics request not ok', {
        eventKey,
        status: statboticsRes.status,
      });
    }

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

      const sb = statboticsByTeam.get(teamNumber);
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
