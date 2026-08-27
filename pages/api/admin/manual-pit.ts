import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const token = authHeader.split(' ')[1];
  const { data: { user: authUser }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !authUser) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const { data: profile } = await supabase
    .from('users')
    .select('role, organization_id')
    .eq('id', authUser.id)
    .maybeSingle();
  if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  const orgId = profile?.organization_id;
  if (!orgId) {
    res.status(400).json({ error: 'No organization' });
    return;
  }

  if (req.method === 'GET') {
    const teamNumber = parseInt(String(req.query.team_number || ''), 10);
    if (!Number.isFinite(teamNumber)) {
      res.status(400).json({ error: 'Missing team_number' });
      return;
    }
    const { data, error } = await supabase
      .from('pit_scouting_data')
      .select('*')
      .eq('organization_id', orgId)
      .eq('team_number', teamNumber)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error('manual-pit GET', error);
      res.status(500).json({ error: 'Failed to load pit data' });
      return;
    }
    res.status(200).json({ report: data || null });
    return;
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    const body = req.body || {};
    const teamNumber = parseInt(String(body.team_number || ''), 10);
    if (!Number.isFinite(teamNumber)) {
      res.status(400).json({ error: 'Missing team_number' });
      return;
    }

    const now = new Date().toISOString();
    const toArr = (v: unknown): string[] => {
      if (Array.isArray(v)) return v.map((x) => String(x)).filter(Boolean);
      if (typeof v === 'string' && v.trim()) return v.split(',').map((s) => s.trim()).filter(Boolean);
      return [];
    };

    const driveType = String(body.drive_type || '');
    const record = {
      team_number: teamNumber,
      robot_name: String(body.robot_name || '') || null,
      drive_type: driveType || null,
      drive_train_details: {
        type: driveType || null,
        auto_capabilities: toArr(body.autonomous_capabilities).join(', '),
        teleop_capabilities: toArr(body.teleop_capabilities).join(', '),
        can_autoalign: !!body.can_autoalign,
        can_climb: toArr(body.climb_levels).length > 0,
        climb_levels: toArr(body.climb_levels),
        navigation_locations: toArr(body.navigation_locations),
        ball_hold_amount: Number(body.ball_hold_amount || 0),
        downtime_strategy: toArr(body.downtime_strategy),
        shooting_locations: toArr(body.shooting_locations),
      },
      autonomous_capabilities: toArr(body.autonomous_capabilities),
      teleop_capabilities: toArr(body.teleop_capabilities),
      can_autoalign: !!body.can_autoalign,
      climb_location: String(body.climb_location || '') || null,
      robot_dimensions: {
        length: body.length || null,
        width: body.width || null,
        framePerimeter: body.frame_perimeter || (body.length && body.width ? 2 * (Number(body.length) + Number(body.width)) : null),
        height: body.height || null,
      },
      weight: body.weight != null ? Number(body.weight) : null,
      camera_count: body.camera_count != null ? Number(body.camera_count) : 0,
      shooting_locations: toArr(body.shooting_locations),
      programming_language: String(body.programming_language || '') || null,
      robot_image_url: null,
      photos: [],
      auto_paths: [],
      annotated_image_url: null,
      notes: String(body.notes || '') || null,
      auto_fuel_count: body.auto_fuel_count ?? 0,
      strengths: Array.isArray(body.strengths) ? body.strengths : [],
      weaknesses: Array.isArray(body.weaknesses) ? body.weaknesses : [],
      submitted_by: authUser.id,
      submitted_by_email: authUser.email || null,
      submitted_by_name: String(body.submitted_by_name || 'Admin') || 'Admin',
      submitted_at: now,
      organization_id: orgId,
    };

    // If an existing manual/admin report exists for this team, replace it; otherwise insert.
    const { data: existing } = await supabase
      .from('pit_scouting_data')
      .select('id')
      .eq('organization_id', orgId)
      .eq('team_number', teamNumber)
      .eq('submitted_by', authUser.id)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let result;
    if (existing?.id) {
      result = await supabase
        .from('pit_scouting_data')
        .update(record)
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      result = await supabase.from('pit_scouting_data').insert(record).select().single();
    }

    if (result.error) {
      console.error('manual-pit save', result.error);
      res.status(500).json({ error: 'Failed to save pit data' });
      return;
    }
    res.status(200).json({ report: result.data });
    return;
  }

  res.setHeader('Allow', ['GET', 'POST', 'PUT']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
