import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { db } from '@/lib/supabase';
import { calculateScore } from '@/lib/utils';
import { mergeShuttlingIntoStoredNotes, normalizeShuttleConsistency } from '@/lib/scouting-notes-merge';
import {
  requiredUploadMbpsForForm,
  verifySpeedVerificationToken,
} from '@/lib/speed-verification';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  try {
    // Check if environment variables are set
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables');
      res.status(500).json({ error: 'Server configuration error' });
      return;
    }

    // Create Supabase client with service role key for server-side operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or invalid authorization header');
      res.status(401).json({ error: 'Unauthorized - Missing token' });
      return;
    }

    const token = authHeader.split(' ')[1];

    // Verify the JWT token
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error) {
      console.error('Token verification error:', error);
      res.status(401).json({ error: 'Unauthorized - Invalid token' });
      return;
    }

    if (!user) {
      console.error('No user found in token');
      res.status(401).json({ error: 'Unauthorized - No user' });
      return;
    }

    // Fetch profile from public.users for organization and role
    const { data: profile } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();
    
    const userOrgId = profile?.organization_id;
    const userRole = profile?.role;

    if (req.method === 'POST') {
      try {
        const speedToken = (req.headers['x-speed-verified-token'] as string | undefined) || '';
        const speedPayload = verifySpeedVerificationToken(speedToken);
        const minUploadMbps = requiredUploadMbpsForForm('match-scouting');
        const validFormType = speedPayload?.formType === 'match-scouting' || speedPayload?.formType === 'sync';
        if (!speedPayload || !validFormType || speedPayload.uploadMbps < minUploadMbps) {
          res.status(400).json({
            error: 'Match scouting submit requires completed speed test above 2 Mbps.',
          });
          return;
        }

        // Reject if match scouting is locked for this organization (admin-only setting)
        let matchLocked = false;
        if (userOrgId) {
          const { data: lockRow } = await supabase
            .from('app_config')
            .select('value')
            .eq('key', 'match_scouting_locked')
            .eq('organization_id', userOrgId)
            .maybeSingle();
          matchLocked = lockRow?.value === 'true';
        } else {
          const { data: configRows } = await supabase
            .from('app_config')
            .select('value')
            .eq('key', 'match_scouting_locked')
            .is('organization_id', null)
            .limit(1);
          matchLocked = configRows?.[0]?.value === 'true';
        }
        if (matchLocked) {
          res.status(403).json({
            error: 'Match scouting form is currently locked by an administrator. Submissions are disabled.',
          });
          return;
        }

        if (!userOrgId) {
          res.status(400).json({
            error: 'Your account must belong to an organization before submitting match scouting. Ask an admin to assign you or complete organization setup.',
          });
          return;
        }

        console.log('Received scouting data request:', req.body);

        const {
          match_id,
          matchNumber,
          team_number,
          teamNumber,
          alliance_color,
          allianceColor,
          alliance_position,
          alliancePosition,
          autonomous_points,
          teleop_points,
          endgame_points,
          final_score,
          defense_rating,
          comments,
          average_downtime,
          broke,
          scout_id,
          submitted_by_name: requestSubmittedByName,
          submitted_by_email: requestSubmittedByEmail,
          notes,
          autonomous,
          teleop,
          endgame,
          miscellaneous,
        } = req.body;

        // Handle both old and new data formats
        const finalMatchId = match_id || `match_${matchNumber}`;
        const finalTeamNumber = team_number || teamNumber;
        const finalAllianceColor = alliance_color || allianceColor;

        // Validate required fields
        if (!finalMatchId || !finalTeamNumber || !finalAllianceColor) {
          console.error('Missing required fields:', {
            match_id: finalMatchId,
            team_number: finalTeamNumber,
            alliance_color: finalAllianceColor,
            received_data: req.body
          });
          res.status(400).json({
            error: 'Missing required fields',
            expected: ['match_id or matchNumber', 'team_number or teamNumber', 'alliance_color or allianceColor'],
            received: Object.keys(req.body)
          });
          return;
        }

        // Handle scoring data - frontend might send pre-calculated scores or raw data. Cleansing removed; store 0.
        let finalAutonomousPoints, finalTeleopPoints, finalScore, finalNotes;

        if (autonomous_points !== undefined && teleop_points !== undefined) {
          // Frontend sent pre-calculated scores
          finalAutonomousPoints = autonomous_points;
          finalTeleopPoints = teleop_points;
          finalScore = final_score || (autonomous_points + teleop_points);
          finalNotes = notes || {};
        } else {
          // Frontend sent raw scoring data, calculate scores (no cleansing)
          const scoringNotes = {
            ...autonomous,
            ...teleop,
          };

          console.log('Scoring notes:', scoringNotes);

          const autonomousScore = calculateScore(autonomous || {});
          const teleopScore = calculateScore(teleop || {});

          finalAutonomousPoints = autonomousScore.final_score;
          finalTeleopPoints = teleopScore.final_score;
          finalScore = finalAutonomousPoints + finalTeleopPoints;
          finalNotes = scoringNotes;
        }

        // Resolved shuttle flag (never send invalid shuttling_consistency like "N/A" to the DB)
        const resolvedShuttle =
          miscellaneous?.shuttling === true || miscellaneous?.shuttling === false
            ? Boolean(miscellaneous.shuttling)
            : typeof req.body.shuttling === 'boolean'
              ? req.body.shuttling
              : false;

        const rawShuttleConsistency =
          miscellaneous?.shuttling_consistency ?? req.body.shuttling_consistency ?? null;

        const shuttleConsistencyForDb = resolvedShuttle
          ? normalizeShuttleConsistency(rawShuttleConsistency) ?? null
          : null;

        if (finalNotes && typeof finalNotes === 'object' && !Array.isArray(finalNotes)) {
          const base = { ...(finalNotes as Record<string, unknown>) };
          if (!base.teleop || typeof base.teleop !== 'object' || Array.isArray(base.teleop)) {
            base.teleop = {};
          }
          finalNotes = mergeShuttlingIntoStoredNotes(base, {
            shuttling: resolvedShuttle,
            shuttling_consistency: shuttleConsistencyForDb,
          });
        }

        // Drop non-JSON-safe values (NaN, undefined) so PostgREST never rejects the payload
        try {
          finalNotes = JSON.parse(
            JSON.stringify(finalNotes, (_k, v) =>
              typeof v === 'number' && Number.isNaN(v) ? null : v
            )
          );
        } catch (sanitizeErr) {
          console.error('scouting_data: failed to sanitize notes JSON', sanitizeErr);
          res.status(400).json({ error: 'Invalid notes payload (cannot serialize to JSON)' });
          return;
        }

        // alliance_position from match scouting form (1, 2, or 3)
        const finalAlliancePosition = alliance_position ?? alliancePosition;
        const validAlliancePosition = (finalAlliancePosition === 1 || finalAlliancePosition === 2 || finalAlliancePosition === 3)
          ? finalAlliancePosition
          : null;

        const submittedByName = (requestSubmittedByName?.trim()
          || user.user_metadata?.full_name
          || user.user_metadata?.username
          || user.user_metadata?.name
          || user.email
          || 'Unknown').trim() || 'Unknown';

        // One submission per person per match: block by scout name, not account
        const { data: existing } = await supabase
          .from('scouting_data')
          .select('id')
          .eq('organization_id', userOrgId)
          .eq('match_id', finalMatchId)
          .eq('submitted_by_name', submittedByName)
          .limit(1);
        if (existing && existing.length > 0) {
          return res.status(400).json({
            error: 'Someone with your name has already submitted a match scouting form for this match. Only one submission per person (by name) per match is allowed.',
          });
        }

        // Composite FK: matches(organization_id, match_id) — must exist before insert (avoids opaque 500)
        const { data: matchScheduleRow } = await supabase
          .from('matches')
          .select('match_id')
          .eq('organization_id', userOrgId)
          .eq('match_id', finalMatchId)
          .maybeSingle();
        if (!matchScheduleRow) {
          res.status(400).json({
            error:
              'This match is not in your event schedule yet. In Team Management, set the current competition and use Sync from TBA (or sync the schedule), then try again.',
            details: `missing match_id=${finalMatchId} for your organization`,
          });
          return;
        }

        // Create scouting data
        const scoutingData = {
          scout_id: user.id,
          organization_id: userOrgId, // Enforce current user's org
          match_id: finalMatchId,
          team_number: finalTeamNumber,
          alliance_color: finalAllianceColor,
          alliance_position: validAlliancePosition,
          autonomous_points: finalAutonomousPoints,
          teleop_points: finalTeleopPoints,
          final_score: finalScore,
          scouted_score_rounded: Number.isFinite(Number(finalScore)) ? Math.round(Number(finalScore)) : null,
          autonomous_cleansing: 0,
          teleop_cleansing: 0,
          notes: finalNotes,
          defense_rating: defense_rating || miscellaneous?.defense_rating || 0,
          comments: comments || miscellaneous?.comments || '',
          average_downtime: average_downtime ?? miscellaneous?.average_downtime ?? null,
          broke: broke !== undefined ? broke : (miscellaneous?.broke ?? null),
          shuttling: resolvedShuttle,
          shuttling_consistency: shuttleConsistencyForDb,
          submitted_by_name: submittedByName,
          submitted_by_email: requestSubmittedByEmail?.trim() || user.email || '',
          submitted_at: new Date().toISOString(),
        };

        console.log('Scouting data to insert:', scoutingData);

        // Preferred path uses upsert. Some environments may miss the ON CONFLICT backing unique constraint;
        // fallback to plain insert in that case so sync/submission does not 500.
        let result: unknown = null;
        let insertError: { code?: string; message?: string } | null = null;
        const upsertAttempt = await supabase
          .from('scouting_data')
          .upsert(scoutingData, {
            onConflict: 'scout_id,match_id,team_number,alliance_color',
            ignoreDuplicates: false
          })
          .select()
          .single();
        result = upsertAttempt.data;
        insertError = upsertAttempt.error as { code?: string; message?: string } | null;

        const missingConflictConstraint =
          insertError &&
          (insertError.code === '42P10' ||
            /no unique or exclusion constraint matching the on conflict specification/i.test(String(insertError.message)));

        if (missingConflictConstraint) {
          const insertAttempt = await supabase
            .from('scouting_data')
            .insert([scoutingData])
            .select()
            .single();
          result = insertAttempt.data;
          insertError = insertAttempt.error as { code?: string; message?: string } | null;
        }

        if (insertError) {
          console.error('Database upsert error:', insertError);
          const code = (insertError as { code?: string }).code;
          if (code === '23503') {
            res.status(400).json({
              error:
                'This match is not in your team’s event schedule (or the schedule was not synced). Ask an admin to set the competition and sync from TBA in Team Management, then try again.',
              details: insertError.message,
            });
            return;
          }
          if (code === '42703' || /shuttling|column .* does not exist/i.test(String(insertError.message))) {
            res.status(500).json({
              error:
                'Database is missing shuttle columns on scouting_data. Run the latest Supabase migration (shuttle columns) or apply SQL from supabase/migrations/20260329120000_scouting_data_shuttle_columns.sql.',
              details: insertError.message,
            });
            return;
          }
          res.status(500).json({
            error: 'Failed to save scouting data',
            details: insertError.message,
          });
          return;
        }

        console.log('Scouting data created successfully:', result);

        res.status(201).json(result);
        return;
      } catch (error) {
        console.error('Error creating scouting data:', error);
        res.status(500).json({
          error: 'Failed to create scouting data',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
        return;
      }
    } else if (req.method === 'GET') {
      try {
        const { 
          match_id, 
          team_number, 
          alliance_color, 
          my_submitted_match_ids: myMatchIdsParam, 
          scout_name: scoutNameParam,
          organization_id: filterOrgId 
        } = req.query;

        if (myMatchIdsParam === '1' || myMatchIdsParam === 'true') {
          const scoutName = typeof scoutNameParam === 'string' ? scoutNameParam.trim() : '';
          if (scoutName && profile?.organization_id) {
            const { data: rows, error: fetchErr } = await supabase
              .from('scouting_data')
              .select('match_id')
              .eq('organization_id', profile.organization_id)
              .eq('submitted_by_name', scoutName);
            if (fetchErr) {
              return res.status(200).json({ match_ids: [] });
            }
            const matchIds = Array.from(new Set((rows || []).map((r: { match_id: string }) => r.match_id).filter(Boolean)));
            return res.status(200).json({ match_ids: matchIds });
          }
          return res.status(200).json({ match_ids: [] });
        }

        let query = supabase.from('scouting_data').select('*').order('created_at', { ascending: false });

        if (match_id) query = query.eq('match_id', match_id as string);
        if (team_number) query = query.eq('team_number', parseInt(team_number as string, 10));
        if (alliance_color) query = query.eq('alliance_color', alliance_color as string);
        if (filterOrgId) query = query.eq('organization_id', filterOrgId as string);

        const { data, error: fetchError } = await query;

        if (fetchError) {
          console.error('Database fetch error:', fetchError);
          res.status(500).json({
            error: 'Failed to fetch scouting data',
            details: fetchError.message
          });
          return;
        }

        res.status(200).json(data);
        return;
      } catch (error) {
        console.error('Error fetching scouting data:', error);
        res.status(500).json({ error: 'Failed to fetch scouting data' });
        return;
      }
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Unexpected error in scouting_data API:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
