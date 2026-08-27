import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const MAX_CSV_BYTES = 1_000_000;
const MAX_MATCHES = 500;

export const config = { api: { bodyParser: { sizeLimit: '1mb' } } };

type ImportedMatch = { row: number; matchNumber: number; red: number[]; blue: number[] };

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

function validateCsv(csv: string): ImportedMatch[] {
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
  for (let index = 1; index < rows.length; index += 1) {
    const row = rows[index];
    // Skip the optional team_name section header (first cell contains "team" and second contains "name")
    const firstCell = normalizeHeader(row[0] || '');
    const secondCell = row.length > 1 ? normalizeHeader(row[1]) : '';
    if ((firstCell.includes('team') && secondCell.includes('name')) || firstCell === 'teamnumber') {
      break;
    }
    const rowNumber = index + 1;
    const matchNumber = parseMatchNumber(row[indices.match] || '');
    if (!matchNumber) {
      // Skip blank-like rows / separators that parseCsv didn't fully clean
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

  return imported;
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

  let imported: ImportedMatch[];
  try {
    imported = validateCsv(csv);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'CSV validation failed.' });
    return;
  }

  const organizationId = profile.organization_id;
  const teamNumbers = Array.from(new Set(imported.flatMap((match) => [...match.red, ...match.blue])));
  const now = new Date().toISOString();

  // ── MERGE (not replace): upsert roster rows for CSV teams only; never delete existing rows ──
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

  // ── Load team names from TBA (best-effort, non-fatal) for teams without a name ──
  let tbaNamesApplied = 0;
  try {
    const { resolveTeamNamesFromTba } = await import('@/lib/tba');
    const nameMap = await resolveTeamNamesFromTba(teamNumbers);

    // Update teams table with real names where currently generic
    const { data: currentTeams } = await supabase
      .from('teams').select('team_number, team_name').in('team_number', teamNumbers);
    for (const team of currentTeams || []) {
      const realName = nameMap.get(team.team_number);
      if (!realName) continue;
      const cur = team.team_name || '';
      if (cur === '' || cur === `Team ${team.team_number}` || cur.startsWith('Team ')) {
        await supabase.from('teams').update({ team_name: realName }).eq('team_number', team.team_number);
        tbaNamesApplied += 1;
      }
    }
    // Update roster names too
    const rosterRows = teamNumbers.map((team_number) => ({
      organization_id: organizationId, event_key: eventKey, team_number,
      team_name: nameMap.get(team_number) || `Team ${team_number}`, updated_at: now,
    }));
    await supabase.from('event_team_roster').upsert(rosterRows, {
      onConflict: 'organization_id,event_key,team_number',
    });
  } catch (e) {
    console.warn('TBA team-name enrichment skipped', e);
  }

  // ── Insert missing teams (name will be enriched from TBA/app later) ──
  const { data: existingTeams, error: teamReadError } = await supabase
    .from('teams').select('team_number').in('team_number', teamNumbers);
  if (teamReadError) {
    console.error('CSV team read', teamReadError);
    res.status(500).json({ error: 'Could not check existing teams.' });
    return;
  }
  const existingNumbers = new Set((existingTeams || []).map((team) => team.team_number));
  const missingTeams = teamNumbers.filter((teamNumber) => !existingNumbers.has(teamNumber))
    .map((team_number) => ({ team_number, team_name: `Team ${team_number}` }));
  if (missingTeams.length > 0) {
    const { error: teamInsertError } = await supabase.from('teams').insert(missingTeams);
    if (teamInsertError) {
      console.error('CSV team insert', teamInsertError);
      res.status(500).json({ error: 'Could not save newly discovered teams.' });
      return;
    }
  }

  // ── MERGE (not replace): upsert match rows; never delete existing matches ──
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

  // ── Compute the full merged set of match IDs (existing + newly imported) ──
  const { data: allEventMatches } = await supabase
    .from('matches')
    .select('match_id')
    .eq('organization_id', organizationId)
    .eq('event_key', eventKey);
  const allMatchIds = Array.from(new Set((allEventMatches || []).map((m: { match_id: string }) => m.match_id)));
  const allTeamNumbers = Array.from(new Set(teamNumbers));

  const configRows = [
    ['current_event_key', eventKey],
    ['current_event_name', eventName],
    ['current_event_source', 'csv'],
    ['current_event_match_ids', JSON.stringify(allMatchIds)],
    ['current_event_team_numbers', JSON.stringify(allTeamNumbers)],
  ].map(([key, value]) => ({ key, value, organization_id: organizationId, updated_at: now }));
  const { error: configError } = await supabase.from('app_config').upsert(configRows, {
    onConflict: 'key,organization_id',
  });
  if (configError) {
    console.error('CSV competition config', configError);
    res.status(500).json({ error: 'Schedule was imported, but the active competition could not be saved.' });
    return;
  }

  res.status(200).json({
    ok: true,
    importedMatches: matchRows.length,
    importedTeams: teamNumbers.length,
    teamNamesApplied: tbaNamesApplied,
    eventKey,
    eventName,
  });
}
