import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const bucket = 'robot-images';

function driveFileId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.endsWith('google.com') && !parsed.hostname.endsWith('googleusercontent.com')) return null;
    return parsed.searchParams.get('id') || parsed.pathname.match(/\/d\/([\w-]+)/)?.[1] || null;
  } catch {
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const token = authHeader.slice('Bearer '.length);
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const rowId = typeof req.body?.rowId === 'string' ? req.body.rowId : '';
  const photoIndex = Number(req.body?.photoIndex);
  if (!rowId || !Number.isInteger(photoIndex) || photoIndex < 0) {
    return res.status(400).json({ error: 'rowId and a non-negative photoIndex are required' });
  }

  const { data: row, error: rowError } = await supabase
    .from('past_pit_scouting_data')
    .select('id, photos')
    .eq('id', rowId)
    .maybeSingle();
  if (rowError || !row) return res.status(404).json({ error: 'Pit scouting record not found' });

  const photos = Array.isArray(row.photos) ? [...row.photos] : [];
  const sourceUrl = photos[photoIndex];
  const fileId = typeof sourceUrl === 'string' ? driveFileId(sourceUrl) : null;
  if (!fileId) return res.status(400).json({ error: 'Selected photo is not a Google Drive image' });

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) return res.status(500).json({ error: 'Google Drive is not configured' });

  try {
    const oauth = new google.auth.OAuth2(clientId, clientSecret, 'https://developers.google.com/oauthplayground');
    oauth.setCredentials({ refresh_token: refreshToken });
    const drive = google.drive({ version: 'v3', auth: oauth });
    const [metadata, media] = await Promise.all([
      drive.files.get({ fileId, fields: 'mimeType,name', supportsAllDrives: true }),
      drive.files.get({ fileId, alt: 'media', supportsAllDrives: true }, { responseType: 'arraybuffer' }),
    ]);

    const mimeType = metadata.data.mimeType?.startsWith('image/') ? metadata.data.mimeType : 'image/jpeg';
    const extension = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
    const path = `archive/${row.id}/${photoIndex}-${fileId}.${extension}`;
    const body = Buffer.from(media.data as ArrayBuffer);
    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, body, { contentType: mimeType, upsert: true });
    if (uploadError) throw uploadError;

    const { data: publicUrl } = supabase.storage.from(bucket).getPublicUrl(path);
    photos[photoIndex] = publicUrl.publicUrl;
    const { error: updateError } = await supabase.from('past_pit_scouting_data').update({ photos }).eq('id', row.id);
    if (updateError) throw updateError;

    return res.status(200).json({ rowId: row.id, photoIndex, url: publicUrl.publicUrl });
  } catch (error) {
    console.error('migrate-pit-image:', error);
    return res.status(502).json({ error: 'Could not copy the original Google Drive image', details: error instanceof Error ? error.message : 'Unknown error' });
  }
}
