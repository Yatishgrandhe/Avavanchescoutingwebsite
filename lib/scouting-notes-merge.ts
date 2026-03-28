import type { ScoringNotes } from '@/lib/types';

/** Normalize UI/API strings to analytics values. */
export function normalizeShuttleConsistency(v: unknown): 'consistent' | 'inconsistent' | undefined {
  if (v == null || v === '' || v === 'N/A') return undefined;
  const s = String(v).trim().toLowerCase();
  if (s === 'consistent') return 'consistent';
  if (s === 'inconsistent') return 'inconsistent';
  return undefined;
}

/** Step 4 (misc) is canonical for shuttle; merge into teleop notes for storage & analytics. */
export function mergeShuttleFromMiscIntoTeleop(
  teleop: Partial<ScoringNotes> | undefined,
  misc: { shuttling?: boolean; shuttling_consistency?: string }
): Partial<ScoringNotes> {
  const base = { ...(teleop || {}) };
  const shuttle = misc.shuttling === true;
  return {
    ...base,
    shuttle,
    shuttle_consistency: shuttle ? normalizeShuttleConsistency(misc.shuttling_consistency) : undefined,
  };
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
