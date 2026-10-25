import type { NextApiRequest, NextApiResponse } from 'next';
import { authorizeOrganization } from '@/lib/server/authorize';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!['DELETE', 'POST'].includes(req.method || '')) {
    res.setHeader('Allow', 'DELETE, POST'); return res.status(405).json({ error: 'Method not allowed' });
  }
  const auth = await authorizeOrganization(req, res);
  if (!auth) return;
  if (typeof req.body?.imageUrl !== 'string' || req.body.imageUrl.length > 4096) {
    return res.status(400).json({ error: 'imageUrl is required' });
  }
  // Form edits only unlink photos. Physical deletion can destroy images shared
  // with archived forms, so cleanup requires a separate verified retention job.
  return res.status(200).json({ success: true, deleted: 'none', retained: true });
}
