export type PdfTier = 'free' | 'premium';

const VAULT_PAGES = [
  'focus-program',
  'feeding-chart',
  'grooming-checklist',
  'seasonal-calendar',
  'vet-prep',
  'weekly-checklist',
  'emergency-reference',
] as const;

/** Pages that are not part of the free download. */
export function includedPremiumPages(tier: PdfTier = 'free', includeEmergencyCard = false): string[] {
  if (tier !== 'premium') return [];
  const pages: string[] = [...VAULT_PAGES];
  if (includeEmergencyCard) pages.push('emergency-fridge-card');
  return pages;
}
