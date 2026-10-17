export async function downloadArchivedStandForms(accessToken: string, competitionKey: string, year: number): Promise<void> {
  const params = new URLSearchParams({ competition_key: competitionKey, year: String(year) });
  const response = await fetch(`/api/admin/export-past-scouting?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'Could not export stand scouting forms.');
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${year}-${competitionKey.replace(/[^a-z0-9_-]/gi, '-')}-stand-scouting.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
