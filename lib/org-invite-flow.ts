export type OrganizationInvitePreview = {
  valid: true;
  invite_type: 'new_org' | 'join_org';
  expires_at?: string;
  organization_name?: string | null;
  unlimited_uses?: boolean;
  redemption_count?: number;
};

/** Validate stored tokens on the server; localStorage hints never authorize membership. */
export async function getPendingOrganizationInvite(
  token: string,
): Promise<OrganizationInvitePreview | null> {
  const response = await fetch(`/api/invite-preview?token=${encodeURIComponent(token)}`, { cache: 'no-store' });
  if (response.status === 400 || response.status === 404) return null;
  if (!response.ok) throw new Error('Could not verify your invitation. Please try again.');
  const preview = await response.json();
  if (
    preview.valid !== true ||
    !['new_org', 'join_org'].includes(preview.invite_type)
  ) return null;
  return preview as OrganizationInvitePreview;
}

export function clearOrganizationInvite(): void {
  localStorage.removeItem('org_invite_token');
  localStorage.removeItem('org_invite_type');
  localStorage.removeItem('org_invite_target_org');
}
