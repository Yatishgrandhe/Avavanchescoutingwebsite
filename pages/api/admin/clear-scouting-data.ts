import { NextApiRequest, NextApiResponse } from 'next';
import { authorizeOrganization } from '@/lib/server/authorize';

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const auth = await authorizeOrganization(req, res, true);
  if (!auth) return;
  const supabase = auth.db;

  try {
    // Never allow an organization administrator to delete another organization’s forms.
    const { error: deleteError } = await supabase
      .from('scouting_data')
      .delete()
      .eq('organization_id', auth.organizationId);

    if (deleteError) {
      console.error('Clear scouting data error:', deleteError);
      return res.status(500).json({
        error: 'Failed to clear scouting data',
        details: deleteError.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Your organization’s match scouting data has been deleted.',
    });
  } catch (err) {
    console.error('Unexpected error clearing scouting data:', err);
    return res.status(500).json({
      error: 'Internal server error',
      details: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}
