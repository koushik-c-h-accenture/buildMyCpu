// Multi-currency support. All component prices in the catalog are canonical in
// USD; everything the user sees is converted on the fly to their chosen currency.
// Rates are baked in (offline-first, zero external dependency) and reflect rough
// 2025-2026 averages. They are display conversions, not financial advice.

export interface Currency {
  code: string;        // ISO 4217
  symbol: string;      // display symbol
  name: string;        // human label
  rate: number;        // units of this currency per 1 USD
  locale: string;      // Intl locale for grouping/format
  decimals: number;    // fraction digits to show
}

export const CURRENCIES: Record<string, Currency> = {
  USD: { code: 'USD', symbol: '$',   name: 'US Dollar',        rate: 1,     locale: 'en-US', decimals: 0 },
  INR: { code: 'INR', symbol: '₹',   name: 'Indian Rupee',     rate: 83.5,  locale: 'en-IN', decimals: 0 },
  EUR: { code: 'EUR', symbol: '€',   name: 'Euro',             rate: 0.92,  locale: 'de-DE', decimals: 0 },
  GBP: { code: 'GBP', symbol: '£',   name: 'British Pound',    rate: 0.79,  locale: 'en-GB', decimals: 0 },
  AUD: { code: 'AUD', symbol: 'A$',  name: 'Australian Dollar', rate: 1.52, locale: 'en-AU', decimals: 0 },
  CAD: { code: 'CAD', symbol: 'C$',  name: 'Canadian Dollar',  rate: 1.37,  locale: 'en-CA', decimals: 0 },
  SGD: { code: 'SGD', symbol: 'S$',  name: 'Singapore Dollar', rate: 1.34,  locale: 'en-SG', decimals: 0 },
  AED: { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham',       rate: 3.67,  locale: 'en-AE', decimals: 0 },
  JPY: { code: 'JPY', symbol: '¥',   name: 'Japanese Yen',     rate: 157,   locale: 'ja-JP', decimals: 0 },
  BRL: { code: 'BRL', symbol: 'R$',  name: 'Brazilian Real',   rate: 5.4,   locale: 'pt-BR', decimals: 0 },
};

export const DEFAULT_CURRENCY = 'USD';

export function getCurrency(code: string): Currency {
  return CURRENCIES[code] ?? CURRENCIES[DEFAULT_CURRENCY];
}

/** Convert a canonical USD amount into the given currency's units. */
export function fromUsd(usd: number, code: string): number {
  return usd * getCurrency(code).rate;
}

/** Convert an amount expressed in the given currency back to canonical USD. */
export function toUsd(amount: number, code: string): number {
  return amount / getCurrency(code).rate;
}

/** Format a canonical USD amount as a localized currency string (e.g. "₹12,499"). */
export function formatPrice(usd: number, code: string): string {
  const c = getCurrency(code);
  const value = fromUsd(usd, code);
  try {
    return new Intl.NumberFormat(c.locale, {
      style: 'currency', currency: c.code,
      minimumFractionDigits: c.decimals, maximumFractionDigits: c.decimals,
    }).format(value);
  } catch {
    // fallback if a locale/currency is unavailable in the runtime
    return `${c.symbol}${value.toLocaleString(undefined, { maximumFractionDigits: c.decimals })}`;
  }
}

/** Compact symbol+number without locale currency styling (for tight UI like part chips). */
export function formatCompact(usd: number, code: string): string {
  const c = getCurrency(code);
  const value = Math.round(fromUsd(usd, code));
  return `${c.symbol}${value.toLocaleString(c.locale)}`;
}
