import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import {
  requiredUploadMbpsForForm,
  verifySpeedVerificationToken,
} from '@/lib/speed-verification';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const speedToken = (req.headers['x-speed-verified-token'] as string | undefined) || '';
  const speedPayload = verifySpeedVerificationToken(speedToken);
  const minUploadMbps = requiredUploadMbpsForForm('pit-scouting');
  const validFormType = speedPayload?.formType === 'pit-scouting' || speedPayload?.formType === 'sync';
  if (!speedPayload || !validFormType || speedPayload.uploadMbps < minUploadMbps) {
    return res.status(400).json({ error: 'Pit scouting submit requires completed speed test at 5 Mbps or above.' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

  const { data: profile } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single();
  const userOrgId = profile?.organization_id;
  if (!userOrgId) return res.status(400).json({ error: 'No organization assigned.' });

  const body = (req.body || {}) as {
    submissionData?: Record<string, unknown>;
    editingId?: string | null;
  };
  const submissionData = { ...(body.submissionData || {}) };
  submissionData.organization_id = userOrgId;

  if (body.editingId) {
    const { submitted_by, submitted_by_email, submitted_by_name, submitted_at, ...updateFields } = submissionData;
    const { data, error } = await supabase
      .from('pit_scouting_data')
      .update(updateFields)
      .eq('id', body.editingId)
      .eq('organization_id', userOrgId)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  const { data, error } = await supabase
    .from('pit_scouting_data')
    .insert([submissionData])
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json(data);
}
