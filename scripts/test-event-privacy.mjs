// Run after test-robot-notes.mjs --keep; uses only that script's isolated fixtures.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

assert.equal(process.env.ROBOT_NOTES_TEST_ALLOW_DATABASE, 'true');
const base = 'http://localhost:3210';
const fixturePath = '/tmp/avalanche-robot-notes-fixtures.json';
const f = JSON.parse(await readFile(fixturePath, 'utf8'));
assert.equal(f.marker, 'avalanche-robot-notes-integration');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const org = f.orgIds[0];
const { data: organization } = await db.from('organizations').select('name').eq('id', org).single();
assert(organization.name.startsWith('Robot notes test '));
let checks = 0;
async function api(path, role = 'admin', method = 'GET', body) {
  const r = await fetch(base + path, { method, headers: { ...(role ? { Authorization: `Bearer ${f.sessions[role].access_token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const result = await r.json();
  assert(r.ok, `${method} ${path}: ${JSON.stringify(result)}`); checks++; return result;
}
const sentinel = `PRIVATE-${randomUUID()}`;
const newTeam = 98347;
const { data: existing } = await db.from('teams').select('team_number').eq('team_number', newTeam);
assert.equal(existing.length, 0);
f.teamNumbers.push(newTeam);
await writeFile(fixturePath, JSON.stringify(f), { mode: 0o600 });
const csv = (numbers) => 'match,red1,red2,red3,blue1,blue2,blue3\n1,' + numbers.join(',');
const old = await api('/api/admin/import-competition-csv', 'admin', 'POST', { eventName: `SCRIW regression ${org.slice(0, 8)}`, csv: csv([98341, 98342, 98343, 98344, 98345, 98346]) });
const oldList = await api('/api/pick-lists', 'admin', 'POST', { name: 'Saved SCRIW list', teams: [{ team_number: 98341, team_name: 'Old robot', notes: sentinel, pick_order: 1 }] });
const oldScore = { id: randomUUID(), organization_id: org, scout_id: f.userIds[0], match_id: `${old.eventKey}_qm1`, team_number: 98342, alliance_color: 'red', final_score: 100, autonomous_points: 40, teleop_points: 60, comments: sentinel, notes: { autonomous: { auto_fuel_active_hub: 8 }, miscellaneous: { comments: sentinel } } };
const inserted = await db.from('scouting_data').insert(oldScore);
if (inserted.error) throw inserted.error;
const active = await api('/api/admin/import-competition-csv', 'admin', 'POST', { eventName: `THOR regression ${org.slice(0, 8)}`, csv: csv([98342, 98343, 98344, 98345, 98346, newTeam]) });
const newScore = { ...oldScore, id: randomUUID(), match_id: `${active.eventKey}_qm1`, final_score: 10, autonomous_points: 4, teleop_points: 6, shuttling: true, score_delta: 3 };
const newInsert = await db.from('scouting_data').insert(newScore);
if (newInsert.error) throw newInsert.error;
const pitId = randomUUID();
const pitInsert = await db.from('pit_scouting_data').insert({ id: pitId, organization_id: org, team_number: 98342, robot_name: 'Fixture robot', drive_type: 'swerve', notes: sentinel, submitted_by: f.userIds[0] });
if (pitInsert.error) throw pitInsert.error;
const list = await api('/api/pick-lists');
assert.equal(list.currentEvent.eventKey, active.eventKey);
assert.equal(list.pickLists.length, 0, 'Old lists must not appear under the new event.');
const oldLists = await api(`/api/pick-lists?event_key=${old.eventKey}`);
assert.equal(oldLists.pickLists[0].id, oldList.id);
assert.equal(oldLists.pickLists[0].teams[0].notes, sentinel, 'Switching events must preserve saved notes.');
const stats = await api(`/api/team-stats?organization_id=${org}&event_key=${active.eventKey}`);
assert(!stats.stats.some((r) => r.team_number === 98341), 'Old-only robot must not leak into the new event.');
assert(stats.stats.some((r) => r.team_number === newTeam && r.total_matches === 0), 'Unscouted event teams must be available.');
assert.equal(stats.stats.find((r) => r.team_number === 98342).avg_total_score, 10, 'Scores from the old event must not be averaged in.');
const newList = await api('/api/pick-lists', 'admin', 'POST', { name: 'THOR list', teams: [{ team_number: 98342, team_name: 'Current robot', notes: sentinel }] });
assert.equal(newList.teams[0].stats.avg_total_score, 10);
const liveQuery = `/api/past-competitions?event_key=${active.eventKey}&see_all_orgs=1`;
const guestLive = await api(liveQuery, null);
assert(!JSON.stringify(guestLive).includes(sentinel), 'Public API must remove nested and top-level notes.');
assert.equal(guestLive.scoutingData[0].notes.autonomous.auto_fuel_active_hub, 8, 'Public numeric scoring must be retained.');
const memberLive = await api(liveQuery, 'member');
assert(memberLive.scoutingData.some((r) => r.comments === sentinel), 'Organization members retain their own original notes.');
const otherLive = await api(liveQuery, 'outsider');
assert(!JSON.stringify(otherLive).includes(sentinel), 'Other organizations must not see notes.');
const guestTeam = await api('/api/team/98342', null);
assert(!JSON.stringify(guestTeam).includes(sentinel));
for (const role of [null, 'outsider', 'member']) {
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false }, ...(role ? { global: { headers: { Authorization: `Bearer ${f.sessions[role].access_token}` } } } : {}) });
  for (const table of ['scouting_data', 'past_scouting_data', 'pit_scouting_data', 'past_pit_scouting_data', 'past_pick_lists']) {
    const result = await client.from(table).select('*').eq('organization_id', org);
    if (role !== 'member') assert(!JSON.stringify(result.data || []).includes(sentinel), `${table} leaked private notes through direct reads.`);
  }
}
const archived = await api('/api/admin/archive-competition', 'admin', 'POST', {});
const afterArchive = await api(`/api/past-competitions?id=${archived.competitionId}`, 'admin');
assert(afterArchive.scoutingData.some((r) => r.comments === sentinel));
assert(afterArchive.pickLists.some((r) => r.id && r.teams[0].notes === sentinel));
assert(afterArchive.pitScoutingData.some((r) => r.notes === sentinel));
// Guest archive access is limited to the reference organization; fixture orgs remain hidden.
const guestArchive = await fetch(`${base}/api/past-competitions?id=${archived.competitionId}`);
assert.equal(guestArchive.status, 404);
assert(!(await guestArchive.text()).includes(sentinel));
const outsiderArchive = await api(`/api/past-competitions?id=${archived.competitionId}`, 'outsider');
assert(!JSON.stringify(outsiderArchive).includes(sentinel));
const oldStillSaved = await api(`/api/pick-lists?id=${oldList.id}`);
assert.equal(oldStillSaved.teams[0].notes, sentinel);
const { data: retained } = await db.from('scouting_data').select('id,comments').eq('id', oldScore.id);
assert.equal(retained[0].comments, sentinel, 'Archiving one event must not delete another event’s data.');
const { data: preserved } = await db.from('past_scouting_data').select('notes,shuttling,score_delta').eq('competition_id', archived.competitionId);
assert.equal(preserved[0].notes.autonomous.auto_fuel_active_hub, 8);
assert.equal(preserved[0].shuttling, true);
assert.equal(preserved[0].score_delta, 3);
assert((await db.from('pit_scouting_data').select('id').eq('id', pitId)).data.length === 1, 'Shared pit forms must not be discarded.');
const upcomingKey = `2026future-${org.slice(0, 8)}`;
await api('/api/admin/competition-settings', 'admin', 'POST', { current_event_key: upcomingKey, current_event_name: 'Upcoming event with no matches' });
const upcomingArchive = await api('/api/admin/archive-competition', 'admin', 'POST', {});
const { data: upcoming } = await db.from('past_competitions').select('competition_key').eq('id', upcomingArchive.competitionId).single();
assert.equal(upcoming.competition_key, upcomingKey, 'Do not silently archive a different event when the configured event has no matches.');
assert((await db.from('scouting_data').select('id').eq('id', oldScore.id)).data.length === 1);
// Leave a new active event with no scouting forms for browser QA.
await api('/api/admin/import-competition-csv', 'admin', 'POST', { eventName: `THOR phone test ${org.slice(0, 8)}`, csv: csv([98342, 98343, 98344, 98345, 98346, newTeam]) });
console.log(`Passed ${checks} event/privacy API checks plus database assertions: event switching, zero-form teams, event-only scores, preserved old lists, public redaction, member access, direct-read privacy, and safe archive scope.`);
