/** Shared by pre-import notes and CSV imports so the same event resolves to the same key. */
export function eventKeyFromName(eventName: string): string {
  const slug = eventName.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70);
  return `csv-${slug || 'schedule'}`;
}
