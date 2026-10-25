import type { NextApiRequest, NextApiResponse } from 'next';
import { authorizeOrganization } from '@/lib/server/authorize';
import { ORGANIZATION_BACKUP_TABLES } from '@/lib/server/organization-backup';

export const config = { api: { bodyParser: { sizeLimit: '4mb' } } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed' }); }
  const auth = await authorizeOrganization(req, res, true);
  if (!auth) return;
  const { backup_data: backup, mode = 'merge' } = req.body || {};
  if (mode !== 'merge') return res.status(400).json({ error: 'Only merge restore is supported. Existing records are preserved.' });
  if (!backup?.data || typeof backup.data !== 'object' || Array.isArray(backup.data)) {
    return res.status(400).json({ error: 'Invalid backup data' });
  }
  if (backup.metadata?.organization_id && backup.metadata.organization_id !== auth.organizationId) {
    return res.status(403).json({ error: 'Backup belongs to another organization' });
  }
  const tables = [...ORGANIZATION_BACKUP_TABLES, 'pick_list_items'];
  // Validate all rows before inserting. Legacy identity tables are never restored.
  for (const table of tables) {
    const entry = backup.data[table];
    if (!entry) continue;
    if (entry.error || !Array.isArray(entry.data) || entry.data.length > 50000) {
      return res.status(400).json({ error: `Invalid table data: ${table}` });
    }
    for (const row of entry.data) {
      if (!row || typeof row !== 'object' || Array.isArray(row) ||
        (table !== 'pick_list_items' && row.organization_id !== auth.organizationId)) {
        return res.status(403).json({ error: 'Every restored row must belong to your organization' });
      }
    }
  }
  const results: { table: string; status: string; records_restored: number }[] = [];
  try {
    // Check existing and incoming parent ownership before any write.
    for (const [column, parent] of [['competition_id', 'past_competitions'], ['pick_list_id', 'pick_lists']] as const) {
      const incoming = new Set((backup.data[parent]?.data || []).map((row: any) => row.id));
      const ids = new Set<string>();
      for (const table of tables) for (const row of backup.data[table]?.data || []) {
        if (row[column]) ids.add(row[column]);
        if (table === 'pick_list_items' && !row.pick_list_id) return res.status(400).json({ error: 'Missing pick list parent' });
      }
      for (const id of Array.from(ids)) {
        const { data, error } = await auth.db.from(parent).select('organization_id').eq('id', id).maybeSingle();
        if (error) throw error;
        if ((data && data.organization_id !== auth.organizationId) || (!data && !incoming.has(id))) {
          return res.status(403).json({ error: 'Invalid or other-organization parent reference' });
        }
      }
    }
    for (const table of tables) {
      const rows = backup.data[table]?.data;
      if (!rows?.length) continue;
      let restored = 0;
      for (let index = 0; index < rows.length; index += 100) {
        // RLS stays active; conflicting IDs never overwrite stored data.
        const { data, error } = await auth.userDb.from(table)
          .upsert(rows.slice(index, index + 100), { ignoreDuplicates: true }).select('*');
        if (error) throw error;
        restored += data?.length || 0;
      }
      results.push({ table, status: 'success', records_restored: restored });
    }
    return res.status(200).json({ restore_date: new Date().toISOString(), mode, tables_restored: results,
      summary: { total_tables: results.length, successful_tables: results.length, failed_tables: 0,
        total_records_restored: results.reduce((sum, item) => sum + item.records_restored, 0) } });
  } catch (error) {
    console.error('Organization restore failed', error);
    return res.status(500).json({ error: 'Restore stopped. Existing records were preserved; some new rows may have been added. You can retry merge safely.', tables_restored: results });
  }
}
