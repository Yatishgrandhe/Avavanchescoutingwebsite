import type { NextApiRequest, NextApiResponse } from 'next';
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
  year: number;
  rows: EventTeamMetricsRow[];
};

const STATBOTICS_BASE_URL = 'https://api.statbotics.io/v3';

function parseEventYear(eventKey: string): number | null {
  const yearPrefix = eventKey.slice(0, 4);
  const parsed = Number.parseInt(yearPrefix, 10);
  if (!Number.isFinite(parsed) || parsed < 2000 || parsed > 2100) return null;
  return parsed;
}

function parseEventCode(eventKey: string): string | null {
  const code = eventKey.slice(4).trim().toLowerCase();
  return code ? code : null;
}

async function fetchTeamStatboticsEpa(
  teamNumber: number,
  year: number,
  eventCode: string
): Promise<Pick<EventTeamMetricsRow, 'autoEpa' | 'teleopEpa' | 'totalEpa'>> {
  const endpoint = `${STATBOTICS_BASE_URL}/team_event/${teamNumber}/${year}/${encodeURIComponent(eventCode)}`;
  const response = await fetch(endpoint, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Statbotics ${response.status} for team ${teamNumber} @ ${year}${eventCode}`);
  }

  const payload = await response.json();
  const autoEpa = payload?.epa?.breakdown?.auto_points;
  const teleopEpa = payload?.epa?.breakdown?.teleop_points;
  const totalEpa = payload?.epa?.mean ?? payload?.epa?.total_points ?? null;

  return {
    autoEpa: Number.isFinite(autoEpa) ? Number(autoEpa) : null,
    teleopEpa: Number.isFinite(teleopEpa) ? Number(teleopEpa) : null,
    totalEpa: Number.isFinite(totalEpa) ? Number(totalEpa) : null,
  };
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
  const providedYear = Number.parseInt(String(body.year || ''), 10);
  const parsedYear = parseEventYear(eventKey);
  const year = Number.isFinite(providedYear) ? providedYear : parsedYear;
  const eventCode = parseEventCode(eventKey);

  if (!eventKey) {
    res.status(400).json({ error: 'Event key is required.' });
    return;
  }
  if (!year || year < 2000 || year > 2100) {
    res.status(400).json({ error: 'Year is invalid. Use a valid event key or provide year.' });
    return;
  }
  if (!eventCode) {
    res.status(400).json({ error: 'Event key format is invalid.' });
    return;
  }

  try {
    const [tbaTeams, tbaOprs] = await Promise.all([
      tbaFetchJson<TbaTeam[]>(`/event/${encodeURIComponent(eventKey)}/teams`),
      tbaFetchJson<TbaEventOprs>(`/event/${encodeURIComponent(eventKey)}/oprs`),
    ]);
    const oprMap = tbaOprs?.oprs || {};

    const rows = await Promise.all(
      (tbaTeams || []).map(async (team) => {
        const teamNumber = team.team_number;
        const teamKey = `frc${teamNumber}`;
        const oprRaw = oprMap[teamKey];
        const opr = Number.isFinite(oprRaw) ? Number(oprRaw) : null;

        try {
          const epaValues = await fetchTeamStatboticsEpa(teamNumber, year, eventCode);
          return {
            teamNumber,
            opr,
            ...epaValues,
          };
        } catch (error) {
          console.error('event-team-metrics: statbotics lookup failed', {
            teamNumber,
            year,
            eventCode,
            error,
          });
          return {
            teamNumber,
            opr,
            autoEpa: null,
            teleopEpa: null,
            totalEpa: null,
          };
        }
      })
    );

    res.status(200).json({
      eventKey,
      year,
      rows,
    });
  } catch (error) {
    console.error('event-team-metrics: upstream API failure', {
      eventKey,
      year,
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
