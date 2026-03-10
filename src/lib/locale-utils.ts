/**
 * Supported locale codes for the customer-facing QR flow.
 * Admin dashboard uses its own language settings.
 */
export type SupportedLocale = 'en' | 'zh' | 'ko' | 'ja' | 'fr' | 'es';

const SUPPORTED: SupportedLocale[] = ['en', 'zh', 'ko', 'ja', 'fr', 'es'];

/**
 * Detect the best matching supported locale from browser languages.
 * Returns 'en' as fallback.
 */
export function detectBrowserLocale(): SupportedLocale {
  if (typeof navigator === 'undefined') return 'en';

  const langs = navigator.languages || [navigator.language];
  for (const raw of langs) {
    const code = raw.split('-')[0].toLowerCase();
    if (SUPPORTED.includes(code as SupportedLocale)) {
      return code as SupportedLocale;
    }
  }
  return 'en';
}

/**
 * Resolve final locale: explicit param > browser detect > fallback
 */
export function resolveLocale(explicitParam?: string | null): SupportedLocale {
  if (explicitParam && SUPPORTED.includes(explicitParam as SupportedLocale)) {
    return explicitParam as SupportedLocale;
  }
  return detectBrowserLocale();
}
