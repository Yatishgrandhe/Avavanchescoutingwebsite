import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { teamNumber } = req.query;
      const teamNum = parseInt(teamNumber as string);

      if (!teamNum) {
        return res.status(400).json({ error: 'Invalid team number' });
      }

      // Get team information (allow missing for past-only teams)
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('team_number', teamNum)
        .maybeSingle();

      if (teamError) {
        console.error('Error fetching team:', teamError);
        return res.status(500).json({ error: 'Failed to fetch team' });
      }

      // Get all scouting data for this team
      const { data: scoutingData, error: scoutingError } = await supabase
        .from('scouting_data')
        .select('*')
        .eq('team_number', teamNum)
        .order('created_at', { ascending: false });

      if (scoutingError) {
        console.error('Error fetching scouting data:', scoutingError);
        return res.status(500).json({ error: 'Failed to fetch scouting data' });
      }

      // Get pit scouting data for this team (one record per team)
      const { data: pitData, error: pitError } = await supabase
        .from('pit_scouting_data')
        .select('*')
        .eq('team_number', teamNum)
        .maybeSingle();

      if (pitError) {
        console.error('Error fetching pit scouting data:', pitError);
      }

      // Pull event EPA/OPR using the same analysis endpoint path when possible.
      let currentEventKey: string | null = null;
      try {
        let configQuery = supabase
          .from('app_config')
          .select('value')
          .eq('key', 'current_event_key')
          .limit(1);
        if (team?.organization_id) {
          configQuery = configQuery.eq('organization_id', team.organization_id);
        } else {
          configQuery = configQuery.not('organization_id', 'is', null);
        }
        const { data: eventCfg } = await configQuery.maybeSingle();
        currentEventKey = eventCfg?.value ? String(eventCfg.value).trim() : null;
      } catch (eventCfgError) {
        console.warn('team api: current_event_key lookup failed', eventCfgError);
      }

      let eventMetricsRow: { teamNumber: number; opr: number | null; autoEpa: number | null; teleopEpa: number | null; totalEpa: number | null } | null = null;
      if (currentEventKey && req.headers.host) {
        try {
          const protocolHeader = Array.isArray(req.headers['x-forwarded-proto'])
            ? req.headers['x-forwarded-proto'][0]
            : req.headers['x-forwarded-proto'];
          const protocol = protocolHeader || (process.env.NODE_ENV === 'development' ? 'http' : 'https');
          const origin = `${protocol}://${req.headers.host}`;
          const metricsRes = await fetch(`${origin}/api/analysis/event-team-metrics`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eventKey: currentEventKey }),
          });
          if (metricsRes.ok) {
            const metricsJson = await metricsRes.json().catch(() => ({}));
            const rows = Array.isArray(metricsJson?.rows) ? metricsJson.rows : [];
            const row = rows.find((r: any) => Number(r.teamNumber) === teamNum);
            if (row) {
              const toNullable = (v: unknown): number | null => {
                const n = Number(v);
                return Number.isFinite(n) ? n : null;
              };
              eventMetricsRow = {
                teamNumber: teamNum,
                opr: toNullable(row.opr),
                autoEpa: toNullable(row.autoEpa),
                teleopEpa: toNullable(row.teleopEpa),
                totalEpa: toNullable(row.totalEpa),
              };
            }
          }
        } catch (eventMetricsError) {
          console.warn('team api: event metrics fetch failed', eventMetricsError);
        }
      }

      const teamPayload = {
        ...(team || { team_number: teamNum, team_name: `Team ${teamNum}` }),
        tba_epa: eventMetricsRow?.totalEpa ?? team?.tba_epa ?? null,
        tba_opr: eventMetricsRow?.opr ?? team?.tba_opr ?? null,
        normalized_opr: team?.normalized_opr ?? eventMetricsRow?.opr ?? null,
        tba_auto_epa: eventMetricsRow?.autoEpa ?? null,
        tba_teleop_epa: eventMetricsRow?.teleopEpa ?? null,
      };

      const totalMatches = scoutingData?.length || 0;
      if (totalMatches === 0) {
        return res.status(200).json({
          team: teamPayload,
          scoutingData: [],
          pitData: pitData || null,
          stats: null
        });
      }

      const avgAutonomous = scoutingData!.reduce((sum: number, data: any) => sum + (data.autonomous_points || 0), 0) / totalMatches;
      const avgTeleop = scoutingData!.reduce((sum: number, data: any) => sum + (data.teleop_points || 0), 0) / totalMatches;
      const avgEndgame = 0; // endgame_points not in database schema
      const avgTotal = scoutingData!.reduce((sum: number, data: any) => sum + (data.final_score || 0), 0) / totalMatches;
      const avgDefense = scoutingData!.reduce((sum: number, data: any) => sum + (data.defense_rating || 0), 0) / totalMatches;
      
      const bestScore = Math.max(...scoutingData!.map((data: any) => data.final_score || 0));
      const worstScore = Math.min(...scoutingData!.map((data: any) => data.final_score || 0));
      
      // Calculate consistency (lower coefficient of variation = higher consistency)
      const scores = scoutingData!.map((data: any) => data.final_score || 0);
      const variance = totalMatches > 1
        ? scores.reduce((sum: number, score: number) => sum + Math.pow(score - avgTotal, 2), 0) / totalMatches
        : 0;
      const standardDeviation = Math.sqrt(variance);
      const consistencyScore = (avgTotal > 0 && totalMatches > 0)
        ? Math.max(0, Math.min(100, 100 - (standardDeviation / avgTotal) * 100))
        : 0;

      const stats = {
        totalMatches,
        avgAutonomous: Math.round(avgAutonomous * 10) / 10,
        avgTeleop: Math.round(avgTeleop * 10) / 10,
        avgEndgame: Math.round(avgEndgame * 10) / 10,
        avgTotal: Math.round(avgTotal * 10) / 10,
        avgDefense: Math.round(avgDefense * 10) / 10,
        bestScore,
        worstScore,
        consistencyScore: Math.round(consistencyScore * 10) / 10
      };

      res.status(200).json({
        team: teamPayload,
        scoutingData: scoutingData || [],
        pitData: pitData || null,
        stats
      });
    } catch (error) {
      console.error('Error in team API:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
