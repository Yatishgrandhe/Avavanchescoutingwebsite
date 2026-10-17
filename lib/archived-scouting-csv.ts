type CsvValue = string | number | boolean | null;

const preferredColumns = [
  'competition_name',
  'competition_key',
  'competition_year',
  'team_number',
  'match_id',
  'alliance_color',
  'alliance_position',
  'submitted_by_name',
  'submitted_at',
  'created_at',
];

function flatten(value: unknown, prefix: string, target: Record<string, CsvValue>): void {
  if (value === null || value === undefined) {
    target[prefix] = null;
  } else if (Array.isArray(value)) {
    target[prefix] = JSON.stringify(value);
  } else if (typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length === 0) target[prefix] = '{}';
    for (const [key, child] of entries) {
      flatten(child, `${prefix}.${key}`, target);
    }
  } else {
    target[prefix] = typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
      ? value
      : String(value);
  }
}

function csvCell(value: CsvValue | undefined): string {
  if (value === null || value === undefined) return '""';
  const text = String(value);
  // Spreadsheet apps may evaluate user-entered text as a formula.
  const safe = typeof value === 'string' && /^\s*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function archivedScoutingCsv(rows: Record<string, unknown>[]): string {
  const flatRows = rows.map((row) => {
    const flat: Record<string, CsvValue> = Object.create(null);
    for (const [key, value] of Object.entries(row)) flatten(value, key, flat);
    return flat;
  });
  const columns = Array.from(new Set(flatRows.flatMap((row) => Object.keys(row))));
  columns.sort((a, b) => {
    const ai = preferredColumns.indexOf(a);
    const bi = preferredColumns.indexOf(b);
    if (ai !== -1 || bi !== -1) {
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    }
    return a.localeCompare(b);
  });

  return `\uFEFF${[
    columns.map(csvCell).join(','),
    ...flatRows.map((row) => columns.map((column) => csvCell(row[column])).join(',')),
  ].join('\r\n')}\r\n`;
}
