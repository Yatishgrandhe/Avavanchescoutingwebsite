/** Days until invite link stops accepting sign-ups (unless otherwise noted). */
export const INVITE_EXPIRY_DAY_OPTIONS = [7, 14, 30, 60, 90] as const;

export type InviteExpiryDays = (typeof INVITE_EXPIRY_DAY_OPTIONS)[number];

export const DEFAULT_STUDENT_JOIN_EXPIRY_DAYS = 30;
export const DEFAULT_NEW_ORG_INVITE_EXPIRY_DAYS = 14;

export function expiryIsoFromDays(days: number): string {
  const ms = days * 24 * 60 * 60 * 1000;
  return new Date(Date.now() + ms).toISOString();
}

/** Human-readable line for admins (and optional student-facing copy). */
export function formatInviteExpiryLabel(expiresAt: string | null | undefined): string {
  if (!expiresAt) return 'No expiry set';
  const d = new Date(expiresAt);
  if (Number.isNaN(d.getTime())) return 'Invalid date';
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function isInvitePastExpiry(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false;
  const d = new Date(expiresAt);
  return !Number.isNaN(d.getTime()) && d < new Date();
}

/** How many people have joined via this link (join_org multi-use). */
export function formatRedemptionSummary(
  redemptionCount: number | null | undefined,
  maxRedemptions: number | null | undefined,
  inviteType: string | undefined
): string {
  const count = redemptionCount ?? 0;
  if (inviteType === 'new_org') {
    return count >= 1 ? 'Used once (new organization created)' : 'Not used yet';
  }
  if (maxRedemptions == null) {
    return `${count} joined (unlimited until expiry)`;
  }
  return `${count} / ${maxRedemptions} uses`;
}
