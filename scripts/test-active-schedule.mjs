// Real import route and counting helpers, with an isolated in-memory database.
// No network requests or production data access.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = process.cwd();
const org = 'avalanche-fixture';
const eventKey = '2026thor-fixture';
const teams = [1, 2, 3, 4, 5, 6];
const originalMatches = Array.from({ length: 35 }, (_, index) => ({
  organization_id: org, event_key: eventKey, match_id: `${eventKey}_qm${index + 1}`,
  match_number: index + 1, red_teams: teams.slice(0, 3), blue_teams: teams.slice(3),
}));
const scouting = originalMatches.map((match, index) => ({
  id: `scout-${index}`, organization_id: org, match_id: match.match_id,
  team_number: 1, final_score: index, comments: `Preserve original observation ${index}`,
}));
const rows = {
  users: [{ id: 'admin', role: 'admin', organization_id: org }],
  matches: structuredClone(originalMatches),
  scouting_data: structuredClone(scouting),
  teams: teams.map((team_number) => ({ team_number, team_name: `Team ${team_number}` })),
  event_team_roster: [], pit_scouting_data: [], app_config: [],
};
rows.teams[0].team_name = 'Cached official team name';
let mutationCount = 0;
let denyConfigRead = false;
let tbaMatches = [];
let tbaUnavailable = false;
const db = {
  auth: { getUser: async () => ({ data: { user: { id: 'admin' } }, error: null }) },
  from(table) {
    let mode = 'select', batch, single = false, options = {}, conflict = [], filters = [];
    const query = {
      select(_columns, opts) { options = opts || {}; return query; },
      eq(key, value) { filters.push([key, [value]]); return query; },
      in(key, values) { filters.push([key, values]); return query; },
      like(key, pattern) { filters.push([key, { prefix: pattern.slice(0, -1) }]); return query; },
      maybeSingle() { single = true; return query; },
      single() { single = true; return query; },
      upsert(data, opts) { mode = 'upsert'; batch = Array.isArray(data) ? data : [data]; conflict = opts.onConflict.split(','); return query; },
      insert(data) { mode = 'insert'; batch = Array.isArray(data) ? data : [data]; return query; },
      update(data) { mode = 'update'; batch = data; return query; },
      delete() { throw new Error('Schedule imports must never delete stored data'); },
      order() { return query; },
      then(resolve, reject) {
        if (denyConfigRead && table === 'app_config' && mode === 'select') {
          return Promise.resolve({ data: null, error: { message: 'fixture read failure' } }).then(resolve, reject);
        }
        const matches = (row) => filters.every(([key, values]) => {
          if (key === 'matches.event_key') {
            const match = rows.matches.find((m) => m.organization_id === row.organization_id && m.match_id === row.match_id);
            return values.includes(match?.event_key);
          }
          return Array.isArray(values) ? values.includes(row[key]) : String(row[key]).startsWith(values.prefix);
        });
        if (mode !== 'select') mutationCount++;
        if (mode === 'upsert' || mode === 'insert') {
          for (const row of batch) {
            const existing = mode === 'upsert' && rows[table].find((r) => conflict.every((key) => r[key] === row[key]));
            if (existing) Object.assign(existing, structuredClone(row));
            else rows[table].push(structuredClone(row));
          }
        }
        if (mode === 'update') rows[table].filter(matches).forEach((row) => Object.assign(row, batch));
        const data = rows[table].filter(matches);
        return Promise.resolve({ data: options.head ? null : single ? data[0] || null : data,
          count: options.count ? data.length : null, error: null }).then(resolve, reject);
      },
    };
    return query;
  },
};

const cache = new Map();
function load(file) {
  const absolute = path.resolve(root, file);
  if (cache.has(absolute)) return cache.get(absolute).exports;
  const module = { exports: {} }; cache.set(absolute, module);
  const code = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const customRequire = (name) => {
    if (name === '@supabase/supabase-js') return { createClient: () => db };
    if (name === '@/lib/tba') return {
      ...load('lib/tba.ts'),
      resolveTeamNamesFromTba: async () => new Map(),
      tbaFetchJson: async (url) => {
        if (tbaUnavailable) throw new Error('TBA fixture unavailable');
        if (url.endsWith('/matches')) return structuredClone(tbaMatches);
        if (url.endsWith('/teams')) return teams.map((team_number) => ({ team_number, nickname: `Team ${team_number}` }));
        return { key: eventKey, name: 'THOR fixture' };
      },
    };
    if (name.startsWith('@/')) return load(name.slice(2) + '.ts');
    if (name.startsWith('.')) return load(path.resolve(path.dirname(absolute), name + '.ts'));
    return require(name);
  };
  vm.runInNewContext(code, { module, exports: module.exports, require: customRequire, console,
    process: { env: {} }, Buffer, Date, Map, Set }, { filename: absolute });
  return module.exports;
}

const importSchedule = load('pages/api/admin/import-competition-csv.ts').default;
async function upload(csv) {
  const res = { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }, setHeader() {} };
  await importSchedule({ method: 'POST', headers: { authorization: 'Bearer isolated-fixture' },
    body: { eventKey, eventName: 'THOR fixture', eventYear: 2026, csv } }, res);
  return res;
}
const csv = 'match_number,red_1,red_2,red_3,blue_1,blue_2,blue_3\n' +
  originalMatches.slice(0, 20).map((match) => `${match.match_number},${teams.join(',')}`).join('\n');
const config = (key) => rows.app_config.find((row) => row.organization_id === org && row.key === key);

for (let attempt = 0; attempt < 2; attempt++) {
  const response = await upload(csv);
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.importedMatches, 20);
  assert.deepEqual(JSON.parse(config('current_event_match_ids').value), originalMatches.slice(0, 20).map((m) => m.match_id));
  assert.deepEqual(rows.matches, originalMatches, 'All 35 stored match rows must survive reimport');
  assert.deepEqual(rows.scouting_data, scouting, 'All original scouting records must remain byte-for-byte equivalent');
  assert.equal(rows.event_team_roster.find((team) => team.team_number === 1).team_name, 'Cached official team name',
    'CSV import must retain a known name when TBA enrichment is unavailable');
}

const beforeInvalid = mutationCount;
assert.equal((await upload(csv + '\n1,1,2,3,4,5,6')).statusCode, 400);
assert.equal(mutationCount, beforeInvalid, 'Invalid CSV must not change anything');

const { getDashboardStatsForActiveEvent } = load('lib/dashboard-event-stats.ts');
const stats = await getDashboardStatsForActiveEvent(db, org, eventKey);
assert.equal(stats.totalMatches, 20, 'Dashboard must show the active schedule, not all 35 stored rows');
assert.equal(stats.dataPoints, 20, 'Only active match scouting records count toward current stats');
assert.equal(stats.teamsCount, 6);

const { filterActiveEventMatches } = load('lib/server/active-event-matches.ts');
const otherOrgMatches = originalMatches.map((match) => ({ ...match, organization_id: 'other-org' }));
const filtered = await filterActiveEventMatches(db, eventKey, [...rows.matches, ...otherOrgMatches]);
assert.equal(filtered.filter((m) => m.organization_id === org).length, 20);
assert.equal(filtered.filter((m) => m.organization_id === 'other-org').length, 35, 'Other org schedules stay independent');
assert.equal((await filterActiveEventMatches(db, 'older-event', rows.matches)).length, 35, 'Historical rows stay visible');
config('current_event_source').value = 'tba';
assert.equal((await getDashboardStatsForActiveEvent(db, org, eventKey)).totalMatches, 20, 'Use the active qualification manifest while retaining older stored matches');
assert.equal((await filterActiveEventMatches(db, eventKey, rows.matches)).length, 20);
config('current_event_source').value = 'csv';
config('current_event_match_ids').value = 'malformed legacy value';
assert.equal((await filterActiveEventMatches(db, eventKey, rows.matches)).length, 35, 'Legacy fallback must preserve matches');
denyConfigRead = true;
await assert.rejects(filterActiveEventMatches(db, eventKey, rows.matches), /Could not load active schedules/);
assert.deepEqual(rows.scouting_data, scouting);
console.log('Passed CSV regression: 35 retained matches, 20 active matches, repeat imports, unchanged scouting data, rejected invalid CSV, dashboard counts, organization isolation, legacy fallbacks, and read failures.');

// THOR West's actual failure shape: 20 qualifications + 15 playoffs were
// displayed as 35 consecutively numbered scouting matches.
denyConfigRead = false;
config('current_event_source').value = 'tba';
const ids = Array.from({ length: 20 }, (_, i) => `${eventKey}_qm${i + 1}`)
  .concat(Array.from({ length: 13 }, (_, i) => `${eventKey}_sf${i + 1}m1`), [`${eventKey}_f1m1`, `${eventKey}_f1m2`]);
rows.matches = ids.map((match_id, index) => ({ ...originalMatches[0], match_id, match_number: index + 1 }));
rows.scouting_data = structuredClone(scouting.slice(0, 20));
const playoffsBefore = structuredClone(rows.matches.slice(20));
const scoutingBefore = structuredClone(rows.scouting_data);
tbaMatches = ids.map((key, index) => ({ key, event_key: eventKey,
  comp_level: index < 20 ? 'qm' : index < 33 ? 'sf' : 'f',
  set_number: index < 20 ? 1 : index < 33 ? index - 19 : 1,
  match_number: index < 20 ? index + 1 : index === 34 ? 2 : 1,
  alliances: { red: { team_keys: ['frc1', 'frc2', 'frc3'] }, blue: { team_keys: ['frc4', 'frc5', 'frc6'] } },
}));
const { syncTbaEventToOrganization } = load('lib/syncTbaToOrg.ts');
const synced = await syncTbaEventToOrganization(db, org, eventKey);
assert.equal(synced.matchesUpserted, 20, 'TBA sync must import only qualifications');
assert.equal(rows.matches.length, 35, 'Stored playoff history must remain');
assert.deepEqual(rows.matches.slice(20), playoffsBefore);
assert.deepEqual(rows.scouting_data, scoutingBefore);

// An event roster must work in an organization that owns none of the shared
// global team rows. Old roster rows stay stored but must not pollute the list.
rows.teams.forEach((team) => { team.organization_id = 'unrelated-owner'; });
rows.event_team_roster.push({ organization_id: org, event_key: eventKey, team_number: 77777, team_name: 'Retained stale row' },
  { organization_id: 'other-org', event_key: eventKey, team_number: 88888, team_name: 'Other organization team' });
rows.app_config.push({ organization_id: 'other-org', key: 'current_event_key', value: eventKey },
  { organization_id: 'other-org', key: 'current_event_source', value: 'csv' },
  { organization_id: 'other-org', key: 'current_event_team_numbers', value: '[88888]' });
const otherBefore = structuredClone(rows.app_config.filter((row) => row.organization_id === 'other-org'));
const response = () => ({ statusCode: 200, body: null, status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; }, setHeader() {} });
const rosterResponse = response();
await load('pages/api/teams.ts').default({ method: 'GET', headers: { authorization: 'Bearer fixture' }, query: {} }, rosterResponse);
assert.equal(rosterResponse.statusCode, 200);
assert.deepEqual(Array.from(rosterResponse.body.teams, (t) => t.team_number).sort((a, b) => a - b), teams);
const pitResponse = response();
await load('pages/api/pit-scouting/event-teams.ts').default({ method: 'GET', headers: { authorization: 'Bearer fixture' }, query: {} }, pitResponse);
assert.equal(pitResponse.body.teams.length, 6);
assert(rows.event_team_roster.some((team) => team.team_number === 77777), 'Stale rows must remain stored');

rows.teams.push({ team_number: 77777, team_name: 'Manual team', organization_id: 'unrelated-owner' });
const { registerTeamInEvent } = load('lib/register-team-in-event.ts');
await registerTeamInEvent(db, org, 77777);
await syncTbaEventToOrganization(db, org, eventKey);
assert(JSON.parse(config('current_event_team_numbers').value).includes(77777), 'Explicit manual additions survive TBA refresh');
assert.deepEqual(rows.app_config.filter((row) => row.organization_id === 'other-org'), otherBefore);
console.log('Passed event-team regression: shared team ownership, stale-row retention, correct roster in both APIs, cached CSV names, manual additions across TBA sync, and other-org settings unchanged.');
assert.equal((await getDashboardStatsForActiveEvent(db, org, eventKey)).totalMatches, 20);
assert.equal((await filterActiveEventMatches(db, eventKey, rows.matches)).length, 20);

const matchResponse = { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; }, setHeader() {} };
await load('pages/api/matches.ts').default({ method: 'GET', headers: { authorization: 'Bearer isolated-fixture' }, query: {} }, matchResponse);
assert.equal(matchResponse.statusCode, 200);
assert.equal(matchResponse.body.matches.length, 20, 'Actual matches API must omit retained playoffs');
assert(matchResponse.body.matches.every((m) => m.match_id.startsWith(`${eventKey}_qm`)));
assert.deepEqual(rows.scouting_data, scoutingBefore);

// TBA supplies the qualification number; do not renumber a partial schedule.
tbaMatches = [{ ...tbaMatches[0], key: `${eventKey}_qm42`, match_number: 42 }];
await syncTbaEventToOrganization(db, org, eventKey);
assert.equal(rows.matches.find((m) => m.match_id === `${eventKey}_qm42`).match_number, 42);
const beforeUnavailable = structuredClone(rows);
tbaMatches[0].alliances.red.team_keys[0] = 'frc1B';
await assert.rejects(syncTbaEventToOrganization(db, org, eventKey), /Invalid numeric TBA team key/);
assert.deepEqual(rows, beforeUnavailable, 'Malformed team keys must fail before any database writes');
tbaMatches[0].alliances.red.team_keys[0] = 'frc1';
tbaUnavailable = true;
await assert.rejects(syncTbaEventToOrganization(db, org, eventKey), /TBA fixture unavailable/);
assert.deepEqual(rows, beforeUnavailable, 'A failed TBA read must not change stored data');
console.log('Passed TBA regression: 20 qualifications / 15 preserved playoffs, actual matches API and dashboard counts, unchanged scouting data, original qualification numbering, and failed-sync preservation.');
