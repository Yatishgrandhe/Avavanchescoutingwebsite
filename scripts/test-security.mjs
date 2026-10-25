// Isolated route tests: no network, cloud credentials, or production data.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { Readable } from 'node:stream';
import sharp from 'sharp';
import ts from 'typescript';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const root = process.cwd();
const org = 'organization-a';
let checks = 0;

function fixture({ role = 'user', metadataRole, organizationId = org, invalid = false, profileError = false, rows = {}, writeError = false, allowUpload = false } = {}) {
  const calls = [];
  const storage = structuredClone(rows);
  storage.users = [{ id: 'viewer', role, organization_id: organizationId }];
  function client(userScoped) {
    return {
      auth: { getUser: async () => ({ data: { user: invalid ? null : { id: 'viewer', user_metadata: { role: metadataRole } } }, error: invalid ? new Error('Invalid token') : null }) },
      storage: { from(bucket) {
        return {
          async upload(name, bytes, options) {
            assert(allowUpload, 'Unexpected upload'); assert.equal(bucket, 'robot-images');
            calls.push({ operation: 'storage-upload', name, bytes, options });
            return { data: { path: name }, error: null };
          },
          getPublicUrl(name) { return { data: { publicUrl: `https://example.test/storage/v1/object/public/${bucket}/${name}` } }; },
          remove() { throw new Error('Unexpected physical storage deletion'); },
        };
      } },
      from(table) {
        const filters = [];
        let operation = 'select', single = false, range = null, batch = [], options;
        const query = {
          select() { return query; },
          eq(key, value) { filters.push([key, value]); return query; },
          is(key, value) { return query.eq(key, value); },
          in(key, values) { filters.push([key, values]); return query; },
          order() { return query; },
          range(from, to) { range = [from, to]; return query; },
          maybeSingle() { single = true; return query; },
          upsert(data, opts) { operation = 'upsert'; batch = Array.isArray(data) ? data : [data]; options = opts; return query; },
          delete() { operation = 'delete'; return query; },
          then(resolve, reject) {
            calls.push({ table, operation, filters: structuredClone(filters), userScoped, batch: structuredClone(batch), options });
            const match = row => filters.every(([key, value]) => Array.isArray(value) ? value.includes(row[key]) : row[key] === value);
            let data = (storage[table] || []).filter(match);
            let error = table === 'users' && profileError ? new Error('Profile lookup failed') : null;
            if (operation === 'upsert') {
              assert(userScoped || table === 'app_config', 'Restore must use caller RLS client');
              if (writeError) error = new Error('Write failed');
              else {
                assert.equal(options?.ignoreDuplicates, true);
                storage[table] ||= [];
                data = batch.filter(row => !storage[table].some(existing => row.id ? existing.id === row.id : existing.organization_id === row.organization_id && existing.match_id === row.match_id));
                storage[table].push(...structuredClone(data));
              }
            }
            if (operation === 'delete') storage[table] = (storage[table] || []).filter(row => !match(row));
            if (range) data = data.slice(range[0], range[1] + 1);
            return Promise.resolve({ data: single ? data[0] || null : data, error }).then(resolve, reject);
          },
        };
        return query;
      },
    };
  }
  const cache = new Map();
  function load(file) {
    const absolute = path.resolve(root, file);
    if (cache.has(absolute)) return cache.get(absolute).exports;
    const module = { exports: {} }; cache.set(absolute, module);
    const code = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
    const customRequire = name => {
      if (name === '@supabase/supabase-js') return { createClient: (_url, key) => client(key === 'public-test-key') };
      if (name.startsWith('@/')) return load(name.slice(2) + '.ts');
      if (name === 'googleapis') return { google: { auth: { OAuth2: class { constructor() { throw new Error('Unexpected Google provider operation'); } } } } };
      return require(name);
    };
    const context = { exports: module.exports, module, require: customRequire, console: { ...console, error() {}, log() {} },
      process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://example.test', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'public-test-key', SUPABASE_SERVICE_ROLE_KEY: 'server-test-key' } }, Buffer, URL, Set, Date };
    vm.runInNewContext(code, context, { filename: absolute }); return module.exports;
  }
  async function call(file, { method = 'GET', authenticated = true, body = {}, query = {}, multipart } = {}) {
    const response = { statusCode: 200, headers: {}, body: null,
      status(code) { this.statusCode = code; return this; }, setHeader(key, value) { this.headers[key] = value; },
      json(value) { this.body = value; return this; }, end(value) { this.body = value; return this; } };
    let req = { method, headers: authenticated ? { authorization: 'Bearer test-token' } : {}, body, query };
    if (multipart) {
      const request = new Request('https://example.test', { method: 'POST', body: multipart });
      const bytes = Buffer.from(await request.arrayBuffer());
      const stream = Readable.from([bytes]);
      req = Object.assign(stream, req, { headers: { ...req.headers, 'content-type': request.headers.get('content-type'), 'content-length': String(bytes.length) } });
    }
    await load(file).default(req, response);
    checks++; return response;
  }
  return { call, calls, storage };
}
const protectedRoutes = [
  ['pages/api/backup.ts', 'GET'], ['pages/api/restore.ts', 'POST'],
  ['pages/api/admin/clear-scouting-data.ts', 'DELETE'], ['pages/api/admin/gdrive-health-check.ts', 'POST'],
];
for (const [file, method] of protectedRoutes) {
  for (const config of [{}, { metadataRole: 'admin' }, { role: 'admin', organizationId: null }]) {
    const f = fixture(config); const result = await f.call(file, { method });
    assert.equal(result.statusCode, 403, `${file} must reject non-admin/no-org user`);
    assert(f.calls.every(call => call.table === 'users'), 'Rejected users must not touch business tables');
  }
  const f = fixture({ role: 'admin' });
  assert.equal((await f.call(file, { method, authenticated: false })).statusCode, 401);
  assert.equal(f.calls.length, 0);
}
for (const [file, method] of [['pages/api/delete-robot-image.ts', 'DELETE'], ['pages/api/upload-robot-image.ts', 'POST']]) {
  const f = fixture(); assert.equal((await f.call(file, { method, authenticated: false })).statusCode, 401);
  assert.equal(f.calls.length, 0);
}
for (const config of [{ invalid: true }, { profileError: true }]) {
  const f = fixture({ role: 'admin', ...config });
  assert.equal((await f.call('pages/api/backup.ts')).statusCode, config.invalid ? 401 : 500);
  assert(f.calls.every(call => call.table === 'users'));
}
{
  const notes = Array.from({ length: 1201 }, (_, i) => ({ id: `note-${i}`, organization_id: org, notes: { text: 'Private archived note' } }));
  const f = fixture({ role: 'admin', rows: { robot_notes: [...notes, { id: 'outsider', organization_id: 'organization-b', notes: 'DO NOT EXPORT' }],
    pick_lists: [{ id: 'list-a', organization_id: org }, { id: 'list-b', organization_id: 'organization-b' }],
    pick_list_items: [{ id: 'item-a', pick_list_id: 'list-a' }, { id: 'item-b', pick_list_id: 'list-b' }],
    past_scouting_data: [{ id: 'archived', organization_id: org, notes: { comments: 'Preserve me' } }] } });
  const r = await f.call('pages/api/backup.ts'); assert.equal(r.statusCode, 200);
  assert.equal(r.body.data.robot_notes.count, 1201); assert.equal(r.body.data.pick_list_items.count, 1);
  assert.equal(r.body.data.past_scouting_data.data[0].notes.comments, 'Preserve me');
  assert.equal(r.body.data.users, undefined); assert.equal(r.body.data.sessions, undefined);
  assert(!JSON.stringify(r.body).includes('DO NOT EXPORT'));
  assert.equal(r.headers['Cache-Control'], 'private, no-store');
  for (const call of f.calls.filter(call => call.table !== 'users')) {
    assert(call.filters.some(([key, value]) => key === 'organization_id' && value === org || key === 'pick_list_id' && value === 'list-a'));
  }
}
const entry = data => ({ data });
for (const [body, expected] of [
  [{ mode: 'replace', backup_data: { data: {} } }, 400],
  [{ mode: 'overwrite', backup_data: { data: {} } }, 400],
  [{ backup_data: { metadata: { organization_id: 'organization-b' }, data: {} } }, 403],
  [{ backup_data: { data: { robot_notes: entry([{ id: 'bad', organization_id: 'organization-b' }]) } } }, 403],
  [{ backup_data: { data: { robot_notes: entry([{ id: 'no-org' }]) } } }, 403],
  [{ backup_data: { data: { teams: entry([{ organization_id: org }]), robot_notes: entry([null]) } } }, 403],
  [{ backup_data: { data: { robot_notes: { data: 'bad' } } } }, 400],
]) {
  const f = fixture({ role: 'admin' }); const r = await f.call('pages/api/restore.ts', { method: 'POST', body });
  assert.equal(r.statusCode, expected); assert(!f.calls.some(call => call.operation !== 'select'));
}
{
  const f = fixture({ role: 'admin', rows: { past_competitions: [{ id: 'other-archive', organization_id: 'organization-b' }] } });
  const r = await f.call('pages/api/restore.ts', { method: 'POST', body: { backup_data: { data: {
    past_competitions: entry([{ id: 'other-archive', organization_id: org }]),
    robot_notes: entry([{ id: 'note', organization_id: org, competition_id: 'other-archive' }]),
  } } } });
  assert.equal(r.statusCode, 403); assert(!f.calls.some(call => call.operation !== 'select'));
}
{
  const old = { id: 'existing', organization_id: org, notes: 'Existing original' };
  const f = fixture({ role: 'admin', rows: { robot_notes: [old] } });
  const r = await f.call('pages/api/restore.ts', { method: 'POST', body: { backup_data: { data: {
    users: entry([{ id: 'viewer', role: 'superadmin' }]),
    past_competitions: entry([{ id: 'archive', organization_id: org }]),
    robot_notes: entry([{ ...old, notes: 'Must not overwrite' }, { id: 'new', organization_id: org, competition_id: 'archive', match_number: null, notes: 'Archived note' }]),
  } } } });
  assert.equal(r.statusCode, 200); assert.equal(f.storage.robot_notes[0].notes, 'Existing original');
  assert.equal(f.storage.robot_notes[1].notes, 'Archived note');
  assert.equal(f.storage.users[0].role, 'admin');
  assert(f.calls.filter(call => call.operation === 'upsert').every(call => call.userScoped));
}
{
  const f = fixture({ role: 'admin', writeError: true });
  const r = await f.call('pages/api/restore.ts', { method: 'POST', body: { backup_data: { data: { robot_notes: entry([{ id: 'n', organization_id: org }]) } } } });
  assert.equal(r.statusCode, 500); assert(!f.calls.some(call => call.operation === 'delete'));
}
{
  const f = fixture({ role: 'admin', rows: { scouting_data: [{ id: 'a', organization_id: org }, { id: 'b', organization_id: 'organization-b' }] } });
  assert.equal((await f.call('pages/api/admin/clear-scouting-data.ts', { method: 'DELETE' })).statusCode, 200);
  assert.equal(f.storage.scouting_data.length, 1); assert.equal(f.storage.scouting_data[0].id, 'b');
}
{
  const f = fixture(); assert.equal((await f.call('pages/api/delete-robot-image.ts', { method: 'DELETE', body: { imageUrl: 'https://drive.google.com/thumbnail?id=archive-photo' } })).body.retained, true);
  assert(!f.calls.some(call => call.operation !== 'select'));
  assert.equal((await f.call('pages/api/upload-robot-image.ts', { query: { health: 'check' } })).statusCode, 403);
}
{
  const f = fixture({ role: 'admin' });
  const result = await f.call('pages/api/upload-robot-image.ts', { query: { health: 'check' } });
  assert.equal(result.statusCode, 200); assert(!JSON.stringify(result.body).includes('server-test-key'));
  assert.equal((await f.call('pages/api/admin/gdrive-health-check.ts', { method: 'POST' })).statusCode, 403);
}
{
  const f = fixture({ role: 'superadmin' });
  assert.equal((await f.call('pages/api/admin/gdrive-health-check.ts', { method: 'POST' })).statusCode, 200);
}
{
  const f = fixture({ metadataRole: 'admin' });
  assert.equal((await f.call('pages/api/scouting-locks.ts', { method: 'PATCH', body: { matchScoutingLocked: true } })).statusCode, 403);
  assert(!f.calls.some(call => call.operation !== 'select'));
}
// Real multipart parsing and Sharp conversion; only provider upload is mocked.
for (const [teamNumber, invalidImage, expected] of [['2724', false, 200], ['../other-org', false, 400], ['2724', true, 400]]) {
  const f = fixture({ allowUpload: true });
  const png = invalidImage ? Buffer.from('not an image') : await sharp({ create: { width: 16, height: 16, channels: 3, background: '#123456' } }).png().toBuffer();
  const form = new FormData(); form.set('image', new Blob([png], { type: 'image/png' }), 'phone-photo.png');
  form.set('teamNumber', teamNumber); form.set('teamName', 'Robot / phone photo');
  const r = await f.call('pages/api/upload-robot-image.ts', { method: 'POST', multipart: form });
  assert.equal(r.statusCode, expected, JSON.stringify(r.body));
  const uploads = f.calls.filter(call => call.operation === 'storage-upload');
  assert.equal(uploads.length, expected === 200 ? 1 : 0);
  if (uploads.length) {
    assert(uploads[0].name.startsWith(`${org}/viewer/`));
    assert.equal(uploads[0].options.upsert, false);
    assert.equal((await sharp(uploads[0].bytes).metadata()).format, 'jpeg');
    assert(r.body.directViewUrl.endsWith('.jpg'));
  }
}
console.log(`Passed ${checks} isolated security route checks; no network or production data access.`);
