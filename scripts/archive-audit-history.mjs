import { createClient } from '@supabase/supabase-js';
import { createGzip } from 'node:zlib';
import { createReadStream, createWriteStream, promises as fs } from 'node:fs';
import { createHash } from 'node:crypto';
import { finished } from 'node:stream/promises';
import path from 'node:path';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');

const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
const bucket = 'audit-archives';
const archiveTables = ['matches_audit', 'teams_audit'];
const pageSize = 1_000;

async function sha256(filePath) {
  const hash = createHash('sha256');
  const input = createReadStream(filePath);
  input.on('data', (chunk) => hash.update(chunk));
  await finished(input);
  return hash.digest('hex');
}

async function ensurePrivateBucket() {
  const { data: existing, error: listError } = await supabase.storage.listBuckets();
  if (listError) throw listError;
  if (existing?.some((item) => item.id === bucket)) return;
  const { error } = await supabase.storage.createBucket(bucket, { public: false });
  if (error) throw error;
}

async function archiveTable(table) {
  const tempPath = path.join('/tmp', `${table}-${Date.now()}.ndjson.gz`);
  const output = createWriteStream(tempPath);
  const gzip = createGzip({ level: 9 });
  gzip.pipe(output);

  let offset = 0;
  let rowCount = 0;
  let minChangedAt = null;
  let maxChangedAt = null;
  try {
    while (true) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .order('audit_id', { ascending: true })
        .range(offset, offset + pageSize - 1);
      if (error) throw error;
      if (!data?.length) break;

      for (const row of data) {
        gzip.write(`${JSON.stringify(row)}\n`);
        rowCount += 1;
        if (row.changed_at && (!minChangedAt || row.changed_at < minChangedAt)) minChangedAt = row.changed_at;
        if (row.changed_at && (!maxChangedAt || row.changed_at > maxChangedAt)) maxChangedAt = row.changed_at;
      }
      offset += data.length;
      if (data.length < pageSize) break;
    }

    gzip.end();
    await finished(output);
    const compressedBytes = (await fs.stat(tempPath)).size;
    const checksum = await sha256(tempPath);
    const objectPath = `audit-history/${table}-${new Date().toISOString().replace(/[:.]/g, '-')}.ndjson.gz`;
    const body = await fs.readFile(tempPath);
    const { error: uploadError } = await supabase.storage.from(bucket).upload(objectPath, body, {
      contentType: 'application/gzip',
      cacheControl: '31536000',
      upsert: false,
    });
    if (uploadError) throw uploadError;

    const { data: downloaded, error: downloadError } = await supabase.storage.from(bucket).download(objectPath);
    if (downloadError || !downloaded) throw downloadError || new Error('Archive verification download failed');
    const downloadedChecksum = createHash('sha256').update(Buffer.from(await downloaded.arrayBuffer())).digest('hex');
    if (downloadedChecksum !== checksum) throw new Error(`Checksum mismatch for ${table}`);

    return { objectPath, sourceTable: table, rowCount, compressedBytes, checksum, minChangedAt, maxChangedAt };
  } finally {
    gzip.destroy();
    output.destroy();
    await fs.rm(tempPath, { force: true });
  }
}

await ensurePrivateBucket();
const manifests = [];
for (const table of archiveTables) manifests.push(await archiveTable(table));
process.stdout.write(`${JSON.stringify(manifests)}\n`);
