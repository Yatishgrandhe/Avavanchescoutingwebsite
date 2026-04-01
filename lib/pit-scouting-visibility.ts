/**
 * Pit rows from `mapPitRowsToTeams` use `is_fallback: true` when a team has no
 * direct pit row but another team's row was duplicated for display. Those should
 * not enable the Pit Scouting sidebar tab.
 */
export function hasCompetitionPitSidebarRows(rows: ReadonlyArray<unknown>): boolean {
  return rows.some((r) => {
    if (r == null || typeof r !== 'object') return false;
    return (r as { is_fallback?: boolean }).is_fallback !== true;
  });
}
