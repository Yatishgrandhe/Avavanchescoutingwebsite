import type { ScoringNotes } from '@/lib/types';

/** Merge misc shuttle answers into teleop notes for submission (mobile + offline queue). */
export function mergeShuttleFromMiscIntoTeleop(
  teleop: Partial<ScoringNotes>,
  misc: { shuttling: boolean; shuttling_consistency: string }
): Partial<ScoringNotes> {
  const tel = { ...teleop };
  if (misc.shuttling === true || misc.shuttling === false) {
    tel.shuttle = misc.shuttling;
    tel.shuttle_consistency = misc.shuttling
      ? normalizeShuttleConsistency(misc.shuttling_consistency)
      : undefined;
  }
  return tel;
}

/** Normalize UI/API strings to analytics values. */
export function normalizeShuttleConsistency(v: unknown): 'consistent' | 'inconsistent' | undefined {
  if (v == null || v === '' || v === 'N/A') return undefined;
  const s = String(v).trim().toLowerCase();
  if (s === 'consistent') return 'consistent';
  if (s === 'inconsistent') return 'inconsistent';
  return undefined;
}

/** Ensure JSON `notes.teleop` includes shuttle fields from column/misc payload (server-side). */
export function mergeShuttlingIntoStoredNotes(
  notes: Record<string, unknown> | null | undefined,
  opts: { shuttling?: boolean; shuttling_consistency?: string | null }
): Record<string, unknown> {
  const n = notes && typeof notes === 'object' ? { ...notes } : {};
  const tel = { ...((n.teleop as Record<string, unknown>) || {}) };
  if (opts.shuttling === true || opts.shuttling === false) {
    tel.shuttle = opts.shuttling;
    tel.shuttle_consistency = opts.shuttling
      ? normalizeShuttleConsistency(opts.shuttling_consistency)
      : undefined;
  }
  return { ...n, teleop: tel };
}
