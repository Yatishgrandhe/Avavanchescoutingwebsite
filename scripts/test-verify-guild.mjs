// Execute the real route with isolated Auth, database, and Discord responses.
// No cloud credentials, network calls, or production data are used.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const avalancheOrg = 'avalanche-org';
const otherOrg = 'other-org';
const guild = 'avalanche-guild';
const route = ts.transpileModule(fs.readFileSync('pages/api/verify-guild.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
let checks = 0;

async function call({ profile = null, organizations = [], guilds = [], invite = null,
  profileError = false, organizationError = false, invalidSession = false,
  metadata = {}, email = 'scout@example.test', body = { providerToken: 'discord-token' },
  authenticated = true, method = 'POST' } = {}) {
  const queries = [];
  let discordCalls = 0;
  const client = {
    auth: { getUser: async token => {
      assert.equal(token, 'session-token');
      return { data: { user: invalidSession ? null : { id: 'scout', email, user_metadata: metadata } },
        error: invalidSession ? new Error('Invalid session') : null };
    } },
    from(table) {
      const filters = [];
      const query = {
        select() { return query; },
        eq(key, value) { filters.push([key, value]); return query; },
        async maybeSingle() {
          queries.push({ table, filters });
          const rows = table === 'users' ? (profile ? [{ id: 'scout', ...profile }] : [])
            : table === 'organizations' ? organizations : table === 'organization_invites' ? (invite ? [invite] : []) : [];
          return { data: rows.find(row => filters.every(([key, value]) => row[key] === value)) || null,
            error: table === 'users' && profileError || table === 'organizations' && organizationError ? new Error('Database unavailable') : null };
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
    process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://example.test', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'public-test-key',
      SUPABASE_SERVICE_ROLE_KEY: 'server-test-key', AVALANCHE_GUILD_ID: guild } },
    fetch: async (url, options) => {
      assert.equal(url, 'https://discord.com/api/v10/users/@me/guilds?limit=100');
      assert.equal(options.headers.Authorization, 'Bearer discord-token');
      discordCalls++;
      return { ok: true, json: async () => guilds };
    },
    AbortController, setTimeout, clearTimeout, Date,
    console: { log() {}, error() {} },
  });
  const response = { statusCode: 200, body: null, headers: {},
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
    setHeader(key, value) { this.headers[key] = value; },
  };
  await module.exports.default({ method, headers: authenticated ? { authorization: 'Bearer session-token' } : {}, body }, response);
  checks++;
  return { response, queries, discordCalls };
}

{
  const r = await call({ profile: { organization_id: otherOrg, banned: false }, organizations: [{ id: otherOrg }] });
  assert.equal(r.response.statusCode, 200);
  assert.equal(r.response.body.inGuild, true);
  assert.equal(r.response.body.invited, undefined, 'Established members must not enter new-org setup');
  assert.equal(r.discordCalls, 0, 'Other organizations must not depend on Avalanche Discord');
  assert.deepEqual(r.queries, [
    { table: 'users', filters: [['id', 'scout']] },
    { table: 'organizations', filters: [['id', otherOrg]] },
  ]);
}
for (const options of [
  { profile: { organization_id: avalancheOrg, banned: false } },
  { profile: { organization_id: otherOrg, banned: true }, organizations: [{ id: otherOrg }] },
  { profile: { organization_id: null, banned: false } },
  { profile: { organization_id: otherOrg, banned: false } }, // dangling membership
  { metadata: { organization_id: otherOrg, banned: false, role: 'admin' }, organizations: [{ id: otherOrg }] },
]) {
  const r = await call(options);
  assert.equal(r.response.statusCode, 200);
  assert.equal(r.response.body.inGuild, false, 'Unverified membership must not bypass the guild gate');
  assert.equal(r.discordCalls, 1);
}
{
  const r = await call({ profile: { organization_id: avalancheOrg }, guilds: [{ id: guild }] });
  assert.equal(r.response.body.inGuild, true);
  assert.equal(r.discordCalls, 1, 'Avalanche must still be checked against Discord');
}
for (const options of [
  { profileError: true },
  { profile: { organization_id: otherOrg }, organizationError: true },
]) {
  const r = await call(options);
  assert.equal(r.response.statusCode, 500);
  assert.equal(r.response.body.inGuild, undefined);
  assert.equal(r.discordCalls, 0);
}
{
  // Preserve the existing invite rejoin path for a removed member.
  const r = await call({ profile: { organization_id: otherOrg, banned: true }, organizations: [{ id: otherOrg }],
    body: { providerToken: 'discord-token', inviteToken: 'pending-token' },
    invite: { token: 'pending-token', status: 'pending', expires_at: '2100-01-01T00:00:00Z' } });
  assert.equal(r.response.body.inGuild, true);
  assert.equal(r.response.body.invited, true);
  assert.equal(r.discordCalls, 1);
}
{
  const r = await call({ email: 'yatish.grandhe@gmail.com' });
  assert.equal(r.response.body.inGuild, true, 'Existing owner fallback must remain available');
}
for (const [options, status] of [
  [{ invalidSession: true }, 401],
  [{ authenticated: false }, 401],
  [{ body: {} }, 400],
  [{ method: 'GET' }, 405],
]) {
  const r = await call(options);
  assert.equal(r.response.statusCode, status);
  assert.equal(r.discordCalls, 0);
  assert.equal(r.queries.length, 0);
}
console.log(`Passed ${checks} isolated verify-guild route checks.`);
