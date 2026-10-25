import type { NextApiRequest, NextApiResponse } from 'next';
import { authorizeOrganization } from '@/lib/server/authorize';
import { ORGANIZATION_BACKUP_TABLES, organizationRows, readAllRows } from '@/lib/server/organization-backup';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'Method not allowed' }); }
  const auth = await authorizeOrganization(req, res, true);
  if (!auth) return;
  try {
    const data: Record<string, { count: number; data: Record<string, any>[] }> = {};
    for (const table of ORGANIZATION_BACKUP_TABLES) {
      const rows = await organizationRows(auth.db, table, auth.organizationId);
      data[table] = { count: rows.length, data: rows };
    }
    // Items inherit tenancy from verified parent lists.
    const items: Record<string, any>[] = [];
    for (const list of data.pick_lists.data) {
      items.push(...await readAllRows((from, to) => auth.db.from('pick_list_items').select('*')
        .eq('pick_list_id', list.id).order('id').range(from, to)));
    }
    data.pick_list_items = { count: items.length, data: items };
    const now = new Date().toISOString();
    res.setHeader('Content-Disposition', `attachment; filename="avalanche-scouting-backup-${now.replace(/[:.]/g, '-')}.json"`);
    return res.status(200).json({
      metadata: { version: '2.0', backup_date: now, organization_id: auth.organizationId,
        tables_backed_up: Object.entries(data).map(([table, value]) => ({ table, record_count: value.count, status: 'success' })),
        summary: { total_tables: Object.keys(data).length, successful_tables: Object.keys(data).length,
          failed_tables: 0, total_records: Object.values(data).reduce((sum, value) => sum + value.count, 0) } },
      data,
    });
  } catch (error) {
    console.error('Organization backup failed', error);
    // Never label an incomplete backup as successful.
    return res.status(500).json({ error: 'Backup could not be completed. No data was changed.' });
  }
}
