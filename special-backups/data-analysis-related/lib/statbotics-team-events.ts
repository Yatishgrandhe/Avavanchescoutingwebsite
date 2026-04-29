/**
 * Statbotics REST v3 `team_events` — EPA under `epa.stats` / `epa.breakdown`, not `epa.mean`.
 * @see https://www.statbotics.io/docs/rest
 */

export type StatboticsTeamEventRow = {
  team: string;
  totalEPA: number | null;
  autoEPA: number | null;
  teleopEPA: number | null;
  endgameEPA: number | null;
  startEPA: number | null;
  preElimEPA: number | null;
  rank: number | null;
  record: string | null;
};

export function parseStatboticsFinite(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function parseStatboticsTeamEventRow(raw: unknown): StatboticsTeamEventRow {
  const item = raw as Record<string, unknown>;
  const epa = item.epa as Record<string, unknown> | undefined;
  const breakdown = epa?.breakdown as Record<string, unknown> | undefined;
  const stats = epa?.stats as Record<string, unknown> | undefined;
  const totalPointsBlock = epa?.total_points as Record<string, unknown> | undefined;
  const recordRoot = item.record as Record<string, unknown> | undefined;
  const qual = recordRoot?.qual as Record<string, unknown> | undefined;
  const totalRec = recordRoot?.total as Record<string, unknown> | undefined;

  const totalEPA =
    parseStatboticsFinite(stats?.mean) ??
    parseStatboticsFinite(totalPointsBlock?.mean) ??
    parseStatboticsFinite(breakdown?.total_points) ??
    parseStatboticsFinite(epa?.mean);

  const autoEPA = parseStatboticsFinite(breakdown?.auto_points);
  const endgameEPA = parseStatboticsFinite(breakdown?.endgame_points);
  const breakdownTeleop = parseStatboticsFinite(breakdown?.teleop_points);
  const breakdownTotal = parseStatboticsFinite(breakdown?.total_points);
  const teleopEPA =
    breakdownTeleop ??
    (breakdownTotal != null && autoEPA != null && endgameEPA != null
      ? breakdownTotal - autoEPA - endgameEPA
      : null);

  const startEPA = parseStatboticsFinite(stats?.start);
  const preElimEPA = parseStatboticsFinite(stats?.pre_elim);

  const rank =
    parseStatboticsFinite(qual?.rank) ?? parseStatboticsFinite(item.rank as unknown);

  let record: string | null = null;
  const rec =
    totalRec && parseStatboticsFinite(totalRec.wins) != null ? totalRec : qual;
  if (rec) {
    const w = parseStatboticsFinite(rec.wins);
    const l = parseStatboticsFinite(rec.losses);
    const ties = parseStatboticsFinite(rec.ties);
    if (w != null && l != null) {
      record = `${w}-${l}-${ties ?? 0}`;
    }
  }

  return {
    team: String(item.team ?? ''),
    totalEPA,
    autoEPA,
    teleopEPA,
    endgameEPA,
    startEPA,
    preElimEPA,
    rank,
    record,
  };
}
