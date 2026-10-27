// Explicit opt-in integration test. Creates temporary organizations/users and
// cleans up only those fixtures; never deletes an existing team's global row.
// Point EVENT_IMPORT_TEST_EXPECTATIONS at a freshly verified TBA event JSON:
// {event_key,event_name,teams:[{team_number,team_name}],matches:[{match_number,red_teams,blue_teams}]}.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

assert.equal(process.env.EVENT_IMPORT_TEST_ALLOW_DATABASE, 'true', 'Explicit database-test opt-in is required.');
const base = process.env.EVENT_IMPORT_TEST_BASE_URL || 'http://127.0.0.1:3000';
assert(['127.0.0.1', 'localhost', 'avalanchescouting.vercel.app'].includes(new URL(base).hostname));
const official = JSON.parse(await readFile(process.env.EVENT_IMPORT_TEST_EXPECTATIONS, 'utf8'));
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } });
const marker = 'Event import test ' + randomUUID().slice(0, 8);
const fixturePath = '/tmp/avalanche-event-import-fixtures.json';
assert.equal(await readFile(fixturePath).then(() => true).catch(() => false), false, 'Clean up the earlier fixture first.');
const orgIds = [], userIds = [], tokens = [];
let checks = 0, cleaned = false;
const avalanche = '79fb9e7a-a9c8-4c8d-8a5e-a76613de7f86';
const numbers = official.teams.map((team) => team.team_number).sort((a, b) => a - b);
const csvNumbers = Array.from(new Set(official.matches.flatMap((m) => [...m.red_teams, ...m.blue_teams]))).sort((a, b) => a - b);
async function result(query, label) {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}
async function orgRows(table, orgId) {
  return result(db.from(table).select('*').eq('organization_id', orgId), table);
}
async function snapshot(orgId) {
  const output = {};
  for (const table of ['matches', 'scouting_data', 'event_team_roster', 'app_config']) {
    output[table] = (await orgRows(table, orgId)).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  }
  return output;
}
async function api(path, index = 0, method = 'GET', body, status = 200) {
  const response = await fetch(base + path, { method,
    headers: { Authorization: `Bearer ${tokens[index]}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(90000) });
  const output = await response.json();
  assert.equal(response.status, status, `${method} ${path}: ${response.status}, ${output.error || ''}`);
  checks++; return output;
}
function scheduleCsv(count) {
  return 'match_number,red_1,red_2,red_3,blue_1,blue_2,blue_3\n' + Array.from({ length: count }, (_, i) => {
    const match = official.matches[i % official.matches.length];
    return [i + 1, ...match.red_teams, ...match.blue_teams].join(',');
  }).join('\n');
}
function assertMatches(matches, eventKey, count) {
  assert.equal(matches.length, count);
  for (let i = 0; i < count; i++) {
    const match = matches.find((m) => m.match_number === i + 1);
    assert(match);
    assert.equal(match.match_id, `${eventKey}_qm${i + 1}`);
    assert.deepEqual(match.red_teams.map((team) => team.team_number), official.matches[i].red_teams);
    assert.deepEqual(match.blue_teams.map((team) => team.team_number), official.matches[i].blue_teams);
  }
}
async function cleanup() {
  if (!orgIds.length) return;
  const organizations = await result(db.from('organizations').select('id,name').in('id', orgIds), 'fixture ownership');
  assert(organizations.every((org) => org.name.startsWith(marker)), 'Refusing cleanup of another organization.');
  for (const table of ['scouting_data', 'pit_scouting_data', 'robot_notes', 'matches', 'event_team_roster', 'app_config', 'scout_names', 'pick_lists']) {
    await result(db.from(table).delete().in('organization_id', orgIds), `cleanup ${table}`);
  }
  if (userIds.length) await result(db.from('users').update({ organization_id: null }).in('id', userIds), 'cleanup profiles');
  await result(db.from('organizations').delete().in('id', orgIds), 'cleanup organizations');
  for (const id of userIds) {
    const { error } = await db.auth.admin.deleteUser(id);
    if (error) throw error;
  }
  await unlink(fixturePath);
  cleaned = true;
}

const beforeAvalanche = await snapshot(avalanche);
try {
  for (let index = 0; index < 2; index++) {
    const org = randomUUID();
    await result(db.from('organizations').insert({ id: org, name: `${marker} ${index}`, setup_complete: true }), 'create fixture org');
    orgIds.push(org);
    await writeFile(fixturePath, JSON.stringify({ marker, orgIds, userIds }), { mode: 0o600 });
    const email = `event-import-${randomUUID()}@example.com`, password = randomUUID() + 'aA1!';
    const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw error;
    userIds.push(data.user.id);
    await writeFile(fixturePath, JSON.stringify({ marker, orgIds, userIds }), { mode: 0o600 });
    await result(db.from('users').upsert({ id: data.user.id, name: `${marker} admin ${index}`, role: 'admin', organization_id: org }), 'fixture profile');
    const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } });
    const signed = await client.auth.signInWithPassword({ email, password });
    if (signed.error) throw signed.error;
    tokens.push(signed.data.session.access_token);
  }
  const eventB = 'csv-org-b-' + randomUUID().slice(0, 8);
  await api('/api/admin/import-competition-csv', 1, 'POST', { eventName: marker + ' B', eventKey: eventB, eventYear: 2026, csv: scheduleCsv(2) });
  const beforeB = await snapshot(orgIds[1]);
  await result(db.from('app_config').upsert([
    ['current_event_key', official.event_key], ['current_event_name', official.event_name], ['current_event_source', 'tba'],
  ].map(([key, value]) => ({ key, value, organization_id: orgIds[0] })), { onConflict: 'key,organization_id' }), 'fixture TBA settings');
  const sync = await api('/api/admin/sync-from-tba', 0, 'POST', { eventKey: official.event_key });
  assert.equal(sync.matchesUpserted, official.matches.length);
  assert.equal(sync.teamsUpserted, numbers.length);
  assertMatches((await api('/api/matches')).matches, official.event_key, official.matches.length);
  let teams = (await api('/api/pit-scouting/event-teams')).teams;
  assert.deepEqual(teams.map((team) => team.team_number).sort((a, b) => a - b), numbers);
  for (const team of teams) assert.equal(team.team_name, official.teams.find((t) => t.team_number === team.team_number).team_name);
  console.log('Real TBA sync: official team names and all qualification alliance positions verified in a separate org.');
  const legacy = await api('/api/teams');
  assert.deepEqual(legacy.teams.map((team) => team.team_number).sort((a, b) => a - b), numbers,
    'Teams API must use the fixture event roster, not global team ownership');

  const extra = 1417;
  assert(!numbers.includes(extra));
  await result(db.from('event_team_roster').upsert({ organization_id: orgIds[0], event_key: official.event_key,
    team_number: extra, team_name: 'Retained stale fixture team' }, { onConflict: 'organization_id,event_key,team_number' }), 'seed stale roster');
  teams = (await api('/api/pit-scouting/event-teams')).teams;
  assert.equal(teams.length, numbers.length, 'TBA refresh must omit stale rows without deleting them');
  assert((await orgRows('event_team_roster', orgIds[0])).some((r) => r.team_number === extra));
  await api('/api/pit-scouting/register-team', 0, 'POST', { team_number: extra });
  await api('/api/admin/sync-from-tba', 0, 'POST', { eventKey: official.event_key });
  assert((await api('/api/pit-scouting/event-teams')).teams.some((team) => team.team_number === extra), 'Explicit manual team must survive TBA sync');

  const csvEvent = 'csv-org-a-' + randomUUID().slice(0, 8);
  await api('/api/admin/import-competition-csv', 0, 'POST', { eventName: marker + ' A', eventKey: csvEvent, eventYear: 2026, csv: scheduleCsv(35) });
  const id = randomUUID();
  await result(db.from('scouting_data').insert({ id, organization_id: orgIds[0], scout_id: userIds[0],
    match_id: `${csvEvent}_qm35`, team_number: official.matches[14].red_teams[0], alliance_color: 'red',
    autonomous_points: 0, teleop_points: 0, final_score: 0, comments: 'Fixture record must survive schedule replacement.' }), 'seed preserved scouting');
  const scoutingBefore = await orgRows('scouting_data', orgIds[0]);
  await api('/api/admin/import-competition-csv', 0, 'POST', { eventName: marker + ' A', eventKey: csvEvent, eventYear: 2026, csv: scheduleCsv(20) });
  assertMatches((await api('/api/matches')).matches, csvEvent, 20);
  teams = (await api('/api/pit-scouting/event-teams')).teams;
  assert.deepEqual(teams.map((team) => team.team_number).sort((a, b) => a - b), csvNumbers);
  assert.equal((await api('/api/teams')).teams.length, csvNumbers.length);
  await api('/api/teams?team_number=' + extra, 0, 'GET', null, 404);
  assertMatches((await api('/api/matches?organization_id=' + avalanche)).matches, csvEvent, 20);
  assert.equal((await orgRows('matches', orgIds[0])).filter((m) => m.event_key === csvEvent).length, 35);
  assert.deepEqual(await orgRows('scouting_data', orgIds[0]), scoutingBefore);
  assertMatches((await api('/api/matches', 1)).matches, eventB, 2);
  assert.deepEqual(await snapshot(orgIds[1]), beforeB, 'Import/sync in A must not change B');
  assert.deepEqual(await snapshot(avalanche), beforeAvalanche, 'Fixture import/sync must not change Avalanche data');
  console.log('CSV reimport: 35 retained / 20 active matches, preserved scouting record, exact event teams and cross-org isolation verified.');
  if (process.env.EVENT_IMPORT_TEST_REPORT) await writeFile(process.env.EVENT_IMPORT_TEST_REPORT,
    JSON.stringify({ apiChecks: checks, officialTeams: numbers.length, officialQualifications: official.matches.length,
      csvActiveMatches: 20, csvRetainedMatches: 35, originalScoutingPreserved: true,
      separateOrganizationsVerified: true, avalancheUnchanged: true }, null, 2), { mode: 0o600 });
} finally {
  await cleanup();
  console.log('Temporary test organizations and users removed:', cleaned);
}
