// Exercise the real ensure-profile route with an isolated Auth and users table.
// No cloud credentials, network calls, or production data are used.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const avalancheOrg = 'avalanche-org';
const route = ts.transpileModule(fs.readFileSync('pages/api/auth/ensure-profile.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
let checks = 0;

async function call({ initial = null, competing = null, readErrorAt = 0, insertError = null } = {}) {
  let profile = initial;
  let reads = 0;
  let insertOptions = null;
  const client = {
    auth: { getUser: async token => {
      assert.equal(token, 'session-token');
      return { data: { user: { id: 'scout', email: 'scout@example.test', user_metadata: { full_name: 'Scout', avatar_url: 'avatar' } } }, error: null };
    } },
    from(table) {
      assert.equal(table, 'users');
      const query = {
        select() { return query; },
        eq(key, value) { assert.equal(key, 'id'); assert.equal(value, 'scout'); return query; },
        upsert(row, options) {
          insertOptions = options;
          return {
            select() { return this; },
            async maybeSingle() {
              if (insertError) return { data: null, error: insertError };
              if (!profile && competing) profile = { ...competing };
              if (profile) return { data: null, error: null };
              profile = { ...row };
              return { data: profile, error: null };
            },
          };
        },
        async maybeSingle() {
          reads++;
          if (readErrorAt === reads) return { data: null, error: new Error('Read failed') };
          return { data: profile, error: null };
        },
      };
      return query;
    },
  };
  const module = { exports: {} };
  vm.runInNewContext(route, {
    module, exports: module.exports,
    require(name) {
      if (name === '@supabase/supabase-js') return { createClient: () => client };
      if (name === '@/lib/constants') return { AVALANCHE_ORG_ID: avalancheOrg };
      throw new Error(`Unexpected import: ${name}`);
    },
    process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://example.test', SUPABASE_SERVICE_ROLE_KEY: 'server-test-key' } },
    console: { error() {} }, Date,
  });
  const response = { statusCode: 200, body: null, headers: {},
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
    setHeader(key, value) { this.headers[key] = value; },
  };
  await module.exports.default({ method: 'POST', headers: { authorization: 'Bearer session-token' } }, response);
  checks++;
  return { response, profile, reads, insertOptions };
}

{
  const r = await call();
  assert.equal(r.response.statusCode, 200);
  assert.equal(r.response.body.updated, true);
  assert.equal(r.profile.organization_id, avalancheOrg);
  assert.equal(r.profile.role, 'user');
  assert.equal(JSON.stringify(r.insertOptions), JSON.stringify({ onConflict: 'id', ignoreDuplicates: true }));
}
for (const competing of [
  { id: 'scout', organization_id: 'new-org', role: 'admin', banned: false },
  { id: 'scout', organization_id: 'other-org', role: 'user', banned: true },
]) {
  const r = await call({ competing });
  assert.equal(r.response.statusCode, 200);
  assert.equal(r.response.body.updated, false);
  assert.equal(JSON.stringify(r.response.body.profile), JSON.stringify(competing), 'A competing profile must be returned without overwriting membership or ban state');
  assert.equal(r.profile.organization_id, competing.organization_id);
}
for (const initial of [
  { id: 'scout', organization_id: null, role: 'user', banned: false },
  { id: 'scout', organization_id: 'existing-org', role: 'admin', banned: true },
]) {
  const r = await call({ initial });
  assert.equal(r.response.statusCode, 200);
  assert.equal(r.response.body.updated, false);
  assert.equal(JSON.stringify(r.response.body.profile), JSON.stringify(initial));
  assert.equal(r.reads, 1, 'Existing profiles should not attempt a default insert');
}
{
  const r = await call({ readErrorAt: 1 });
  assert.equal(r.response.statusCode, 500);
  assert.equal(r.profile, null, 'Read failure must not trigger a default insert');
}
{
  const r = await call({ insertError: new Error('Insert failed') });
  assert.equal(r.response.statusCode, 500);
}
{
  const r = await call({ competing: { id: 'scout', organization_id: 'new-org', role: 'admin' }, readErrorAt: 2 });
  assert.equal(r.response.statusCode, 500, 'A conflict must be reread successfully before returning success');
}
console.log(`Passed ${checks} isolated ensure-profile route checks.`);
