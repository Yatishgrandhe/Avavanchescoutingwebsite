const STORAGE_KEY = 'avalanche_view_data_filters_v1';

export type ViewDataPersistedFilters = {
  seeAllOrgs: boolean;
  pitAllOrgs: boolean;
  minMatchesFilter: number | '';
  minAvgScoreFilter: number | '';
  dataViewMode: 'teams' | 'individual';
  sortField: string;
  sortDirection: 'asc' | 'desc';
  teamStatsSortField: string;
  teamStatsSortDirection: 'asc' | 'desc';
};

const defaults: ViewDataPersistedFilters = {
  seeAllOrgs: false,
  pitAllOrgs: false,
  minMatchesFilter: '',
  minAvgScoreFilter: '',
  dataViewMode: 'teams',
  sortField: 'match_id',
  sortDirection: 'asc',
  teamStatsSortField: 'avg_total_score',
  teamStatsSortDirection: 'desc',
};

export function loadViewDataFilters(): ViewDataPersistedFilters {
  if (typeof window === 'undefined') return { ...defaults };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaults };
    const parsed = JSON.parse(raw) as Partial<ViewDataPersistedFilters>;
    return {
      ...defaults,
      ...parsed,
      seeAllOrgs: typeof parsed.seeAllOrgs === 'boolean' ? parsed.seeAllOrgs : defaults.seeAllOrgs,
      pitAllOrgs: typeof parsed.pitAllOrgs === 'boolean' ? parsed.pitAllOrgs : defaults.pitAllOrgs,
      minMatchesFilter:
        parsed.minMatchesFilter === '' || typeof parsed.minMatchesFilter === 'number'
          ? (parsed.minMatchesFilter ?? defaults.minMatchesFilter)
          : defaults.minMatchesFilter,
      minAvgScoreFilter:
        parsed.minAvgScoreFilter === '' || typeof parsed.minAvgScoreFilter === 'number'
          ? (parsed.minAvgScoreFilter ?? defaults.minAvgScoreFilter)
          : defaults.minAvgScoreFilter,
      dataViewMode: parsed.dataViewMode === 'individual' ? 'individual' : 'teams',
      sortField: typeof parsed.sortField === 'string' ? parsed.sortField : defaults.sortField,
      sortDirection: parsed.sortDirection === 'desc' ? 'desc' : 'asc',
      teamStatsSortField:
        typeof parsed.teamStatsSortField === 'string' ? parsed.teamStatsSortField : defaults.teamStatsSortField,
      teamStatsSortDirection: parsed.teamStatsSortDirection === 'asc' ? 'asc' : 'desc',
    };
  } catch {
    return { ...defaults };
  }
}

export function saveViewDataFilters(partial: Partial<ViewDataPersistedFilters>): void {
  if (typeof window === 'undefined') return;
  try {
    const prev = loadViewDataFilters();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...prev, ...partial }));
  } catch {
    /* ignore quota */
  }
}

export const ANALYSIS_TEAM_DATA_ONLY_KEY = 'avalanche_analysis_team_data_only_v1';

export function loadAnalysisTeamDataOnly(defaultValue = false): boolean {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const raw = window.localStorage.getItem(ANALYSIS_TEAM_DATA_ONLY_KEY);
    if (raw === null) return defaultValue;
    return raw === '1' || raw === 'true';
  } catch {
    return defaultValue;
  }
}

export function saveAnalysisTeamDataOnly(value: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ANALYSIS_TEAM_DATA_ONLY_KEY, value ? '1' : '0');
  } catch {
    /* ignore */
  }
}
