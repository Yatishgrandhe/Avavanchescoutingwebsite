// Exercise the analysis page's actual roster/statistics helpers with real metrics.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url), cache = new Map();
function load(file) {
  const absolute = path.resolve(file);
  if (cache.has(absolute)) return cache.get(absolute).exports;
  const module = { exports: {} }; cache.set(absolute, module);
  const code = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const customRequire = (name) => name.startsWith('@/') ? load(name.slice(2) + '.ts') : require(name);
  vm.runInNewContext(code, { module, exports: module.exports, require: customRequire, console, Map, Set, Date });
  return module.exports;
}
const { buildAnalysisRoster, calculateAnalysisTeamStats } = load('lib/analysis-team-stats.ts');
const numbers = Array.from({ length: 26 }, (_, i) => i + 1);
const roster = numbers.map((team_number) => ({ team_number, team_name: `Event team ${team_number}` }));
const metadata = numbers.slice(0, 20).map((team_number) => ({ team_number, team_name: `Shared team ${team_number}` }));
metadata.push({ team_number: 99999, team_name: 'Unrelated historical team' });
const teams = buildAnalysisRoster([...numbers, 1], roster, metadata);
assert.equal(teams.length, 26, 'Missing shared metadata must not hide an event team');
assert.equal(teams[25].team_name, 'Event team 26');
assert(!teams.some((team) => team.team_number === 99999));
const rows = numbers.slice(0, 20).map((team_number) => ({
  team_number, match_id: 'fixture_qm1', autonomous_points: 4, teleop_points: 8,
  final_score: 12, defense_rating: 0, notes: {},
}));
rows.push({ ...rows[0] });
const stats = calculateAnalysisTeamStats(rows, teams);
assert.equal(stats.length, 26, '20 scouted teams must not hide six unscouted roster teams');
assert.equal(stats[0].total_matches, 1, 'Duplicate forms are one distinct match');
assert.equal(stats[0].avg_total_score, 12);
for (const stat of stats.slice(20)) {
  assert.equal(stat.total_matches, 0);
  assert.equal(stat.avg_total_score, 0);
  assert.equal(stat.avg_autonomous_points, 0);
  assert.equal(stat.avg_teleop_points, 0);
  assert.equal(stat.avg_uptime_pct, null);
}
assert.equal(calculateAnalysisTeamStats([], teams).length, 26, 'An unscouted event still lists its complete roster');
assert.equal(calculateAnalysisTeamStats(rows, []).length, 0, 'Records cannot add teams outside the selected roster');
assert.equal(buildAnalysisRoster([77], [], [])[0].team_name, 'Team 77');
console.log('Passed analysis regression: all 26 roster teams with only 20 scouted, six zero-match teams, an entirely unscouted event, missing metadata, event names, distinct match counts and exclusion of unrelated teams.');
