// Symbol lookup mirroring backend/data/currencies.js's SYMBOL_BY_CODE —
// duplicated (not fetched) because this is a pure display-formatting
// concern used on hot-path, read-only pages (job detail, job cards) where
// an extra network round trip just to resolve "$" for "USD" isn't
// worthwhile. The full, authoritative list (used by the Post a Job form's
// searchable selector) is fetched live from GET /api/jobs/meta/currencies
// — see CurrencySelect.tsx. An unmapped code here just falls back to
// showing the code itself, so this list falling behind never breaks
// anything, only loses the symbol.
export const CURRENCY_SYMBOLS: Record<string, string> = {
  NPR: 'रु', INR: '₹', USD: '$', EUR: '€', GBP: '£', AUD: 'A$', CAD: 'C$',
  AED: 'د.إ', JPY: '¥', SGD: 'S$', NZD: 'NZ$', CHF: 'CHF', CNY: '¥',
  HKD: 'HK$', SAR: 'ر.س', QAR: 'ر.ق', KWD: 'د.ك', BHD: '.د.ب', OMR: 'ر.ع.',
  MYR: 'RM', THB: '฿', PHP: '₱', IDR: 'Rp', VND: '₫', KRW: '₩', PKR: '₨',
  BDT: '৳', LKR: 'Rs', ZAR: 'R', EGP: 'E£', NGN: '₦', KES: 'KSh',
  MXN: 'MX$', BRL: 'R$', RUB: '₽', SEK: 'kr', NOK: 'kr', DKK: 'kr',
  PLN: 'zł', TRY: '₺',
};

export function currencySymbol(code?: string | null): string {
  if (!code) return '';
  return CURRENCY_SYMBOLS[code] ?? '';
}

/** Symbol first (what a reader scans for), code alongside since a bare "$" is ambiguous across USD/AUD/CAD/SGD/etc. */
export function formatSalaryRange(
  min: number | undefined,
  max: number | undefined,
  currency: string | undefined,
  period: string | undefined
): string {
  const cur = currency || 'NPR';
  const symbol = currencySymbol(cur);
  const range = min !== undefined && max !== undefined && min !== max
    ? `${min.toLocaleString()} - ${max.toLocaleString()}`
    : (min ?? max ?? 0).toLocaleString();
  return `${cur} ${symbol}${range} / ${period || 'Yearly'}`;
}
