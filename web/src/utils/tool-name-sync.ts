export function formatToolDisplayName(slug: string): string {
  if (!slug) return '';
  const lower = slug.toLowerCase();
  if (lower.includes('sortir')) return 'Sortir Banned';
  if (lower.includes('extractor')) return 'Data Extractor';
  return slug.replace('.py', '').split(/_|-/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}
