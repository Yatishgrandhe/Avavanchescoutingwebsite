// Explicit integration test: creates isolated organizations/users and cleans up only its own fixtures.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

assert.equal(process.env.ROBOT_NOTES_TEST_ALLOW_DATABASE, 'true', 'Set ROBOT_NOTES_TEST_ALLOW_DATABASE=true to run the isolated database integration test.');
const base = process.env.ROBOT_NOTES_TEST_BASE_URL || 'http://localhost:3210';
assert(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Run the test against a local app server.');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const fixturePath = '/tmp/avalanche-robot-notes-fixtures.json';
let fixture = { marker: 'avalanche-robot-notes-integration', orgIds: [], userIds: [], teamNumbers: [], sessions: {} };
let checks = 0;

async function cleanup() {
  if (!fixture.orgIds.length) return;
  const { data: orgs, error } = await db.from('organizations').select('id,name').in('id', fixture.orgIds);
  if (error) throw error;
  assert(orgs.every((org) => org.name.startsWith('Robot notes test ')), 'Refusing to remove non-test organizations.');
  for (const table of ['robot_notes', 'past_scouting_data', 'past_pit_scouting_data', 'past_matches', 'past_teams', 'past_pick_lists', 'past_competitions', 'scouting_data', 'pit_scouting_data', 'pick_lists', 'matches', 'event_team_roster', 'event_scouting_lock', 'scout_names', 'app_config']) {
    const { error } = await db.from(table).delete().in('organization_id', fixture.orgIds);
    if (error) throw new Error(`Fixture cleanup failed for ${table}: ${error.message}`);
  }
  if (fixture.teamNumbers.length) {
    const { error } = await db.from('teams').delete().in('team_number', fixture.teamNumbers);
    if (error) throw error;
  }
  await db.from('users').update({ organization_id: null }).in('id', fixture.userIds);
  const { error: orgError } = await db.from('organizations').delete().in('id', fixture.orgIds);
  if (orgError) throw orgError;
  for (const id of fixture.userIds) {
    const { error } = await db.auth.admin.deleteUser(id);
    if (error) throw error;
  }
  await unlink(fixturePath).catch(() => {});
  for (const role of ['admin', 'member', 'outsider']) await unlink(`/tmp/avalanche-notes-${role}-storage.json`).catch(() => {});
}

if (process.argv.includes('--cleanup')) {
  fixture = JSON.parse(await readFile(fixturePath, 'utf8'));
  assert.equal(fixture.marker, 'avalanche-robot-notes-integration');
  await cleanup();
  console.log('Isolated robot notes fixtures removed.');
  process.exit(0);
}
assert.equal(await readFile(fixturePath, 'utf8').then(() => true).catch(() => false), false, 'Clean up the existing integration fixture first.');

async function api(path, role, method = 'GET', body, expected = 200) {
  const response = await fetch(base + path, {
    method, headers: { ...(role ? { Authorization: `Bearer ${fixture.sessions[role].access_token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json();
  assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(result)}`);
  checks++;
  return result;
}

try {
  const suffix = randomUUID().slice(0, 8);
  for (let i = 0; i < 2; i++) {
    const id = randomUUID();
    const { error } = await db.from('organizations').insert({ id, name: `Robot notes test ${suffix}-${i}`, setup_complete: true });
    if (error) throw error;
    fixture.orgIds.push(id);
  }
  for (const role of ['admin', 'member', 'outsider']) {
    const email = `robot-notes-${role}-${suffix}@example.com`;
    const password = randomUUID() + 'aA1!';
    const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw error;
    fixture.userIds.push(data.user.id);
    const { error: profileError } = await db.from('users').upsert({ id: data.user.id, name: `Notes test ${role}`, organization_id: fixture.orgIds[role === 'outsider' ? 1 : 0], role: role === 'admin' ? 'admin' : 'user' });
    if (profileError) throw profileError;
    const auth = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    const { data: signedIn, error: signInError } = await auth.auth.signInWithPassword({ email, password });
    if (signInError) throw signInError;
    fixture.sessions[role] = signedIn.session;
  }
  await writeFile(fixturePath, JSON.stringify(fixture), { mode: 0o600 });
  await api('/api/robot-notes', null, 'GET', null, 401);
  const initial = await api('/api/robot-notes', 'member');
  assert.equal(initial.event, null);
  const eventName = `Robot notes test ${suffix}`;
  const year = new Date().getFullYear();
  const baseNote = { manual_event_name: eventName, event_year: year, body: 'Brownout issues were observed, followed by a successful recovery.' };
  await api('/api/robot-notes', 'member', 'POST', baseNote, 400);
  const numbers = [98341, 98342, 98343, 98344, 98345, 98346];
  const { data: existingTeams } = await db.from('teams').select('team_number').in('team_number', numbers);
  assert.equal(existingTeams.length, 0, 'Test team numbers must be unused.');
  fixture.teamNumbers = numbers;
  const id = randomUUID();
  const created = await api('/api/robot-notes', 'member', 'POST', { ...baseNote, id, team_number: numbers[0] }, 201);
  assert.equal(created.note.match_reference, null);
  const retry = await api('/api/robot-notes', 'member', 'POST', { ...baseNote, id, team_number: numbers[0] });
  assert.equal(retry.note.id, id);
  fixture.eventKey = created.note.event_key;
  fixture.year = year;
  const query = `?event_key=${fixture.eventKey}&year=${year}`;
  await api('/api/robot-notes' + query, 'outsider', 'GET', null, 404);
  await api(`/api/robot-notes?id=${id}`, 'admin', 'DELETE');
  const own = await api('/api/robot-notes', 'admin', 'POST', { ...baseNote, team_number: numbers[0] }, 201);
  await api(`/api/robot-notes?id=${own.note.id}`, 'member', 'DELETE', null, 403);
  const csv = 'match,red1,red2,red3,blue1,blue2,blue3\n1,' + numbers.join(',');
  const imported = await api('/api/admin/import-competition-csv', 'admin', 'POST', { eventName, csv });
  assert.equal(imported.eventKey, fixture.eventKey);
  const reimported = await api('/api/admin/import-competition-csv', 'admin', 'POST', { eventName: eventName + ' renamed', eventKey: fixture.eventKey, eventYear: year, csv });
  assert.equal(reimported.eventKey, fixture.eventKey, 'Selecting an existing notes event preserves its identity when renamed.');
  const named = await db.from('event_team_roster').update({ team_name: 'Fixture Robot' }).eq('organization_id', fixture.orgIds[0]).eq('team_number', numbers[0]);
  if (named.error) throw named.error;
  const afterImport = await api('/api/robot-notes' + query, 'member');
  assert.equal(afterImport.notes.length, 1);
  assert.equal(afterImport.teams.find((t) => t.team_number === numbers[0]).team_name, 'Fixture Robot');
  assert.equal(afterImport.matches.length, 1);
  await api('/api/robot-notes', 'member', 'POST', { event_key: fixture.eventKey, event_year: year, team_number: numbers[0], match_reference: 'QM 1', body: 'Driving was smooth and reliable in this match.' }, 201);
  const { count: scoringCount } = await db.from('scouting_data').select('id', { head: true, count: 'exact' }).eq('organization_id', fixture.orgIds[0]);
  assert.equal(scoringCount, 0, 'Observations must not create match scouting rows.');
  const bulkMarker = `Pagination fixture ${suffix}`;
  const { error: bulkError } = await db.from('robot_notes').insert(Array.from({ length: 1001 }, () => ({
    organization_id: fixture.orgIds[0], event_key: fixture.eventKey, event_year: year, event_name: eventName,
    team_number: numbers[0], body: bulkMarker, author_id: fixture.userIds[0], author_name: 'Pagination test',
  })));
  if (bulkError) throw bulkError;
  const paginated = await api('/api/robot-notes' + query, 'member');
  assert.equal(paginated.notes.length, 1003, 'Notes beyond the default database row limit must be returned.');
  const { error: hideBulkError } = await db.from('robot_notes').update({ deleted_at: new Date().toISOString() }).eq('organization_id', fixture.orgIds[0]).eq('body', bulkMarker);
  if (hideBulkError) throw hideBulkError;
  const archived = await api('/api/admin/archive-competition', 'admin', 'POST', {});
  fixture.archivedId = archived.competitionId;
  const past = await api('/api/robot-notes' + query, 'member');
  assert.equal(past.event.archived, true);
  assert.equal(past.notes.length, 2);
  assert.equal(past.teams.find((team) => team.team_number === numbers[0])?.team_name, 'Fixture Robot', 'Imported team names must also survive archiving.');
  assert(past.notes.some((note) => note.match_reference === 'QM 1'));
  const { data: linked } = await db.from('robot_notes').select('competition_id').eq('organization_id', fixture.orgIds[0]).is('deleted_at', null);
  assert(linked.every((note) => note.competition_id === archived.competitionId));
  await api('/api/robot-notes', 'member', 'POST', { event_key: fixture.eventKey, event_year: year, team_number: numbers[0], body: 'Cannot alter an archived event.' }, 409);
  await api(`/api/robot-notes?id=${own.note.id}`, 'admin', 'DELETE', null, 409);
  const anonymous = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const denied = await anonymous.from('robot_notes').select('id');
  assert(denied.error, 'Notes must not be publicly readable.');
  const memberDirect = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${fixture.sessions.member.access_token}` } },
  });
  assert((await memberDirect.from('robot_notes').select('id')).error, 'Members must access notes through the organization-checked API.');
  fixture.uiEventName = `Robot notes UI ${suffix}`;
  const uiNote = await api('/api/robot-notes', 'member', 'POST', { manual_event_name: fixture.uiEventName, event_year: year, team_number: numbers[1], body: 'Reliable defense and smooth driving during practice.' }, 201);
  fixture.uiEventKey = uiNote.note.event_key;
  await writeFile(fixturePath, JSON.stringify(fixture), { mode: 0o600 });
  for (const role of ['admin', 'member', 'outsider']) {
    const authKey = `sb-${new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0]}-auth-token`;
    await writeFile(`/tmp/avalanche-notes-${role}-storage.json`, JSON.stringify({ cookies: [], origins: [{ origin: base, localStorage: [{ name: authKey, value: JSON.stringify(fixture.sessions[role]) }] }] }), { mode: 0o600 });
  }
  console.log(`Passed ${checks} API checks plus database assertions: required teams, optional matches, pre-import notes, CSV sync, permissions, retry deduplication, score separation, archive retention, and private storage.`);
  if (process.argv.includes('--keep')) console.log('Isolated fixtures retained for browser QA. Run this script with --cleanup afterwards.');
  else await cleanup();
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Integration test failed');
  await writeFile(fixturePath, JSON.stringify(fixture), { mode: 0o600 });
  await cleanup();
  process.exitCode = 1;
}
