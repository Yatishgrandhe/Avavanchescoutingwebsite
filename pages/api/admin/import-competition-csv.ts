import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const MAX_CSV_BYTES = 1_000_000;
const MAX_MATCHES = 500;

export const config = { api: { bodyParser: { sizeLimit: '1mb' } } };

type ImportedMatch = { row: number; matchNumber: number; red: number[]; blue: number[] };
type TeamNameEntry = { team_number: number; team_name: string };
type CsvParseResult = { matches: ImportedMatch[]; teamNames: TeamNameEntry[] };

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field.trim());
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (quoted) throw new Error('The CSV has an unclosed quoted value.');
  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findHeader(headers: string[], aliases: string[]): number {
  return headers.findIndex((header) => aliases.includes(normalizeHeader(header)));
}

function parsePositiveInteger(value: string): number | null {
  const cleaned = value.trim().replace(/^frc/i, '');
  return /^\d+$/.test(cleaned) && Number(cleaned) > 0 ? Number(cleaned) : null;
}

function parseMatchNumber(value: string): number | null {
  const matched = value.trim().match(/(?:qm|match)?\s*#?\s*(\d+)\s*$/i);
  return matched && Number(matched[1]) > 0 ? Number(matched[1]) : null;
}

function eventKeyFromName(eventName: string): string {
  const slug = eventName
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);
  return `csv-${slug || 'schedule'}`;
}

function validateCsv(csv: string): CsvParseResult {
  const rows = parseCsv(csv.replace(/^\uFEFF/, ''));
  if (rows.length < 2) throw new Error('Include a header row and at least one match row.');

  const headers = rows[0];
  const indices = {
    match: findHeader(headers, ['match', 'matchnumber', 'matchnum']),
    red1: findHeader(headers, ['red1']), red2: findHeader(headers, ['red2']), red3: findHeader(headers, ['red3']),
    blue1: findHeader(headers, ['blue1']), blue2: findHeader(headers, ['blue2']), blue3: findHeader(headers, ['blue3']),
  };
  if (Object.values(indices).some((index) => index < 0)) {
    throw new Error('Use these headers: match_number, red_1, red_2, red_3, blue_1, blue_2, blue_3.');
  }

  // Parse match rows — stop when we hit a row that looks like a team_name header
  const imported: ImportedMatch[] = [];
  const seen = new Set<number>();
  let matchEndIndex = rows.length;
  for (let index = 1; index < rows.length; index += 1) {
    const row = rows[index];
    // Detect the team_name section header (first cell contains "team" and second contains "name")
    const firstCell = normalizeHeader(row[0] || '');
    const secondCell = row.length > 1 ? normalizeHeader(row[1]) : '';
    if ((firstCell.includes('team') && secondCell.includes('name')) || firstCell === 'teamnumber') {
      matchEndIndex = index;
      break;
    }
    const rowNumber = index + 1;
    const matchNumber = parseMatchNumber(row[indices.match] || '');
    if (!matchNumber) {
      // If this row doesn't parse as a match and we haven't seen the team header yet, skip it
      // (could be a blank-like row or separator that parseCsv kept)
      continue;
    }
    const teamValues = [indices.red1, indices.red2, indices.red3, indices.blue1, indices.blue2, indices.blue3]
      .map((column) => parsePositiveInteger(row[column] || ''));
    if (teamValues.some((team) => team === null)) {
      throw new Error(`Row ${rowNumber}: every red and blue team slot must be a positive team number.`);
    }
    if (seen.has(matchNumber)) throw new Error(`Row ${rowNumber}: match ${matchNumber} appears more than once.`);
    seen.add(matchNumber);
    imported.push({ row: rowNumber, matchNumber, red: teamValues.slice(0, 3) as number[], blue: teamValues.slice(3, 6) as number[] });
  }
  if (imported.length === 0) throw new Error('No match rows were found.');
  if (imported.length > MAX_MATCHES) throw new Error(`A CSV import is limited to ${MAX_MATCHES} matches.`);

  // Parse optional team names section (after the team_name header row)
  const teamNames: TeamNameEntry[] = [];
  if (matchEndIndex < rows.length - 1) {
    const teamHeaderRow = rows[matchEndIndex];
    const tnIdx = {
      number: findHeader(teamHeaderRow, ['team_number', 'teamnumber', 'team']),
      name: findHeader(teamHeaderRow, ['team_name', 'teamname', 'name']),
    };
    if (tnIdx.number >= 0 && tnIdx.name >= 0) {
      for (let i = matchEndIndex + 1; i < rows.length; i += 1) {
        const row = rows[i];
        if (row.every((cell) => cell === '')) continue;
        const num = parsePositiveInteger(row[tnIdx.number] || '');
        const name = (row[tnIdx.name] || '').trim();
        if (num && name) {
          teamNames.push({ team_number: num, team_name: name });
        }
      }
    }
  }

  return { matches: imported, teamNames };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const token = authHeader.slice('Bearer '.length);
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authUser) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const { data: profile, error: profileError } = await supabase
    .from('users').select('role, organization_id').eq('id', authUser.id).maybeSingle();
  if (profileError || !profile || !['admin', 'superadmin'].includes(profile.role)) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  if (!profile.organization_id) {
    res.status(400).json({ error: 'User is not in an organization' });
    return;
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const eventName = typeof body.eventName === 'string' ? body.eventName.trim() : '';
  const requestedEventKey = typeof body.eventKey === 'string' ? body.eventKey.trim() : '';
  const csv = typeof body.csv === 'string' ? body.csv : '';
  if (!eventName) {
    res.status(400).json({ error: 'Competition name is required.' });
    return;
  }
  const eventKey = requestedEventKey || eventKeyFromName(eventName);
  if (!/^[a-z0-9_-]{3,80}$/i.test(eventKey)) {
    res.status(400).json({ error: 'Event key may only use letters, numbers, hyphens, and underscores.' });
    return;
  }
  if (Buffer.byteLength(csv, 'utf8') > MAX_CSV_BYTES) {
    res.status(413).json({ error: 'CSV must be smaller than 1 MB.' });
    return;
  }

  let parseResult: CsvParseResult;
  try {
    parseResult = validateCsv(csv);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'CSV validation failed.' });
    return;
  }
  const { matches: imported, teamNames: csvTeamNames } = parseResult;

  const organizationId = profile.organization_id;
  const teamNumbers = Array.from(new Set(imported.flatMap((match) => [...match.red, ...match.blue])));
  const now = new Date().toISOString();
  // ── Clean-slate: delete any roster rows for this org+event that are NOT in the CSV ──
  const { error: rosterCleanErr } = await supabase
    .from('event_team_roster')
    .delete()
    .eq('organization_id', organizationId)
    .eq('event_key', eventKey)
    .not('team_number', 'in', `(${teamNumbers.join(',')})`);
  if (rosterCleanErr) {
    console.error('CSV roster cleanup', rosterCleanErr);
    // Non-fatal — continue with import
  }

  // Upsert roster rows for CSV teams
  const rosterRows = teamNumbers.map((team_number) => ({
    organization_id: organizationId, event_key: eventKey, team_number,
    team_name: `Team ${team_number}`, updated_at: now,
  }));
  if (rosterRows.length > 0) {
    const { error: rosterError } = await supabase.from('event_team_roster').upsert(rosterRows, {
      onConflict: 'organization_id,event_key,team_number',
    });
    if (rosterError) {
      console.error('CSV roster import', rosterError);
      res.status(500).json({ error: 'Could not save the event roster.' });
      return;
    }
  }

  const { data: existingTeams, error: teamReadError } = await supabase
    .from('teams').select('team_number, team_name').in('team_number', teamNumbers);
  if (teamReadError) {
    console.error('CSV team read', teamReadError);
    res.status(500).json({ error: 'Could not check existing teams.' });
    return;
  }

  // Build a lookup of team names from the CSV (if Gemini provided them)
  const csvNameLookup = new Map<number, string>();
  for (const entry of csvTeamNames) {
    csvNameLookup.set(entry.team_number, entry.team_name);
  }

  const existingNumbers = new Set((existingTeams || []).map((team) => team.team_number));

  // Insert missing teams — use CSV name if available, else "Team <number>"
  const missingTeams = teamNumbers.filter((teamNumber) => !existingNumbers.has(teamNumber))
    .map((team_number) => ({
      team_number,
      team_name: csvNameLookup.get(team_number) || `Team ${team_number}`,
    }));
  if (missingTeams.length > 0) {
    const { error: teamInsertError } = await supabase.from('teams').insert(missingTeams);
    if (teamInsertError) {
      console.error('CSV team insert', teamInsertError);
      res.status(500).json({ error: 'Could not save newly discovered teams.' });
      return;
    }
  }

  // Update existing teams with better names from CSV (if current name is generic "Team <number>")
  for (const team of existingTeams || []) {
    const csvName = csvNameLookup.get(team.team_number);
    if (csvName && !csvName.startsWith('Team ')) {
      const currentName = team.team_name || '';
      if (currentName.startsWith('Team ') || currentName === '' || currentName === `Team ${team.team_number}`) {
        await supabase
          .from('teams')
          .update({ team_name: csvName })
          .eq('team_number', team.team_number);
      }
    }
  }

  const matchRows = imported.map((match) => ({
    organization_id: organizationId, event_key: eventKey, match_id: `${eventKey}_qm${match.matchNumber}`,
    match_number: match.matchNumber, red_teams: match.red, blue_teams: match.blue,
  }));
  const { error: matchError } = await supabase.from('matches').upsert(matchRows, {
    onConflict: 'organization_id,match_id',
  });
  if (matchError) {
    console.error('CSV match import', matchError);
    res.status(500).json({ error: 'Could not save the match schedule.' });
    return;
  }

  const configRows = [
    ['current_event_key', eventKey],
    ['current_event_name', eventName],
    ['current_event_source', 'csv'],
    ['current_event_match_ids', JSON.stringify(matchRows.map((match) => match.match_id))],
    ['current_event_team_numbers', JSON.stringify(teamNumbers)],
  ].map(([key, value]) => ({ key, value, organization_id: organizationId, updated_at: now }));
  const { error: configError } = await supabase.from('app_config').upsert(configRows, {
    onConflict: 'key,organization_id',
  });
  if (configError) {
    console.error('CSV competition config', configError);
    res.status(500).json({ error: 'Schedule was imported, but the active competition could not be saved.' });
    return;
  }

  // ── Clean-slate: delete matches for this org+event that are NOT in the CSV ──
  const csvMatchIds = matchRows.map((match) => match.match_id);
  const { data: nonCsvMatchRows } = await supabase
    .from('matches')
    .select('match_id')
    .eq('organization_id', organizationId)
    .eq('event_key', eventKey)
    .not('match_id', 'in', `(${csvMatchIds.join(',')})`);
  const nonCsvMatchIds = (nonCsvMatchRows || []).map((m: { match_id: string }) => m.match_id);

  if (nonCsvMatchIds.length > 0) {
    // Delete scouting data referencing the removed matches
    const { error: scoutCleanErr } = await supabase
      .from('scouting_data')
      .delete()
      .eq('organization_id', organizationId)
      .in('match_id', nonCsvMatchIds);
    if (scoutCleanErr) {
      console.error('CSV scouting data cleanup', scoutCleanErr);
    }

    // Delete the stale matches
    const { error: matchCleanErr } = await supabase
      .from('matches')
      .delete()
      .eq('organization_id', organizationId)
      .eq('event_key', eventKey)
      .not('match_id', 'in', `(${csvMatchIds.join(',')})`);
    if (matchCleanErr) {
      console.error('CSV match cleanup', matchCleanErr);
    }
  }

  res.status(200).json({
    ok: true,
    importedMatches: matchRows.length,
    importedTeams: teamNumbers.length,
    teamNamesApplied: csvTeamNames.length,
    eventKey,
    eventName,
  });
}
