import { isInvitePastExpiry } from '@/lib/invite-config';

/** Minimal row shape for new-org invite partitioning */
export type NewOrgInviteRow = {
  invite_type?: string | null;
  status?: string | null;
  expires_at?: string | null;
  redemption_count?: number | null;
  max_redemptions?: number | null;
};

export function isActiveNewOrgInvite(inv: NewOrgInviteRow): boolean {
  if (inv.invite_type !== 'new_org') return false;
  if (inv.status !== 'pending') return false;
  if (isInvitePastExpiry(inv.expires_at)) return false;
  const max = inv.max_redemptions;
  const c = inv.redemption_count ?? 0;
  if (max != null && c >= max) return false;
  return true;
}

export type PastInviteReason = 'used_up' | 'expired' | 'inactive' | 'exhausted';

export function getPastNewOrgInviteReason(inv: NewOrgInviteRow): PastInviteReason {
  if (inv.status === 'expired') return 'expired';
  if (inv.status === 'used') return 'used_up';
  if (isInvitePastExpiry(inv.expires_at)) return 'expired';
  const max = inv.max_redemptions;
  const c = inv.redemption_count ?? 0;
  if (max != null && c >= max) return 'exhausted';
  return 'inactive';
}

export function isPastNewOrgInvite(inv: NewOrgInviteRow): boolean {
  if (inv.invite_type !== 'new_org') return false;
  return !isActiveNewOrgInvite(inv);
}

export function partitionNewOrgInvites<T extends NewOrgInviteRow>(rows: T[]): { active: T[]; past: T[] } {
  const active: T[] = [];
  const past: T[] = [];
  for (const row of rows) {
    if (row.invite_type !== 'new_org') continue;
    if (isActiveNewOrgInvite(row)) active.push(row);
    else past.push(row);
  }
  return { active, past };
}

export function pastInviteReasonLabel(reason: PastInviteReason): string {
  switch (reason) {
    case 'used_up':
      return 'Used up';
    case 'exhausted':
      return 'Fully used';
    case 'expired':
      return 'Expired';
    default:
      return 'Inactive';
  }
}
