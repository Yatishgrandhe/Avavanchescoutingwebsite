import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';

/**
 * DELETE /api/delete-robot-image
 * Body: { imageUrl: string }
 *
 * Detects whether the URL is a Google Drive thumbnail URL or a Supabase Storage URL
 * and deletes the file from the appropriate service.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const STORAGE_BUCKET = 'robot-images';

function extractDriveFileId(url: string): string | null {
  // Matches: https://drive.google.com/thumbnail?id=FILE_ID&sz=...
  // or:      https://drive.google.com/file/d/FILE_ID/...
  // or:      https://drive.google.com/open?id=FILE_ID
  const patterns = [
    /[?&]id=([a-zA-Z0-9_-]+)/,
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m && m[1]) return m[1];
  }
  return null;
}

function extractSupabasePath(url: string): string | null {
  // Public URL format: .../storage/v1/object/public/robot-images/FILENAME
  const m = url.match(/\/storage\/v1\/object\/public\/robot-images\/(.+)$/);
  return m ? m[1] : null;
}

async function deleteFromGoogleDrive(fileId: string): Promise<void> {
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    throw new Error('Google OAuth credentials not configured');
  }

  const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
  );
  oauth2Client.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });

  const drive = google.drive({ version: 'v3', auth: oauth2Client });
  await drive.files.delete({ fileId, supportsAllDrives: true });
}

async function deleteFromSupabase(filePath: string): Promise<void> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([filePath]);
  if (error) throw new Error(error.message);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use DELETE or POST.' });
  }

  const { imageUrl } = req.body as { imageUrl?: string };

  if (!imageUrl || typeof imageUrl !== 'string') {
    return res.status(400).json({ error: 'imageUrl is required' });
  }

  try {
    if (imageUrl.includes('drive.google.com')) {
      const fileId = extractDriveFileId(imageUrl);
      if (!fileId) {
        return res.status(400).json({ error: 'Could not extract Google Drive file ID from URL' });
      }
      await deleteFromGoogleDrive(fileId);
      return res.status(200).json({ success: true, deleted: 'google-drive', fileId });
    }

    if (imageUrl.includes('supabase') && imageUrl.includes('robot-images')) {
      const filePath = extractSupabasePath(imageUrl);
      if (!filePath) {
        return res.status(400).json({ error: 'Could not extract Supabase file path from URL' });
      }
      await deleteFromSupabase(filePath);
      return res.status(200).json({ success: true, deleted: 'supabase', filePath });
    }

    // Unknown URL format — not something we manage; treat as a no-op success
    return res.status(200).json({ success: true, deleted: 'none', note: 'URL not recognised as Drive or Supabase; nothing deleted.' });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[delete-robot-image]', msg);
    return res.status(500).json({ error: 'Failed to delete image', details: msg });
  }
}
