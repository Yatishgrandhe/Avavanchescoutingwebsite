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
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return { ...base, ...(raw as PitDriveTrainDetails) };
  }
  return base;
}

/** Human-readable ball capacity from DB JSON (0 is valid). */
export function formatPitBallCapacity(dtd: PitDriveTrainDetails | null | undefined): string {
  const v = dtd?.ball_hold_amount;
  if (v == null) return '—';
  const n = Number(v);
  if (Number.isNaN(n)) return '—';
  return `${n} ball${n === 1 ? '' : 's'}`;
}
