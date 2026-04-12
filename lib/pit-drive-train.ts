/** Pit forms store extra fields inside `drive_train_details` JSON (e.g. `ball_hold_amount`). */

export type PitDriveTrainDetails = {
  type?: string;
  auto_capabilities?: string;
  teleop_capabilities?: string;
  drive_camps?: number;
  playoff_driver?: string;
  ball_hold_amount?: number;
  motor_count?: number;
};

function parseDriveTrainObject(raw: unknown): Record<string, unknown> | null {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (!t) return null;
    try {
      const p = JSON.parse(t) as unknown;
      if (p && typeof p === 'object' && !Array.isArray(p)) return p as Record<string, unknown>;
    } catch {
      return null;
    }
    return null;
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>;
  return null;
}

/** Numeric ball capacity from merged / raw drive_train_details (snake_case or camelCase). */
export function getPitBallHoldAmount(dtd: PitDriveTrainDetails | null | undefined): number | null {
  if (!dtd) return null;
  const candidates = [
    dtd.ball_hold_amount,
    (dtd as Record<string, unknown>).ballHoldAmount,
    (dtd as Record<string, unknown>).ball_capacity,
    (dtd as Record<string, unknown>).ballCapacity,
  ];
  for (const c of candidates) {
    if (c == null || c === '') continue;
    const n = Number(c);
    if (!Number.isNaN(n)) return n;
  }
  return null;
}

export function mergePitDriveTrainDetails(
  driveType: string,
  raw: unknown
): PitDriveTrainDetails {
  const base: PitDriveTrainDetails = {
    type: driveType || 'Unknown',
    auto_capabilities: '',
    teleop_capabilities: '',
    drive_camps: 0,
    playoff_driver: 'TBD',
  };
  const obj = parseDriveTrainObject(raw);
  if (!obj) return base;

  const merged: PitDriveTrainDetails = { ...base, ...(obj as PitDriveTrainDetails) };
  const n = getPitBallHoldAmount(merged);
  if (n != null) merged.ball_hold_amount = n;
  return merged;
}

/** Human-readable ball capacity from DB JSON (0 is valid). */
export function formatPitBallCapacity(dtd: PitDriveTrainDetails | null | undefined): string {
  const n = getPitBallHoldAmount(dtd);
  if (n == null) return '—';
  return `${n} ball${n === 1 ? '' : 's'}`;
}
