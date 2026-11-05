export type OrganizationIdentity = { id: string; name: string };
type MemberIdentity = { organization_id?: string | null } | null;

/** A previous account's organization must never label the current account. */
export function getOrganizationDisplayName(
  organization: OrganizationIdentity | null,
  user: MemberIdentity,
): string {
  if (!user) return 'Avalanche';
  if (organization && organization.id === user.organization_id && organization.name.trim()) {
    return organization.name.trim();
  }
  return 'Scouting';
}

export function getScoutingTitle(
  organization: OrganizationIdentity | null,
  user: MemberIdentity,
): string {
  const name = getOrganizationDisplayName(organization, user);
  return /\bscouting$/i.test(name) ? name : `${name} Scouting`;
}
