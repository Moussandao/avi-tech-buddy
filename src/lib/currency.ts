export type CurrencyCode =
  | "XOF"
  | "XAF"
  | "GHS"
  | "NGN"
  | "MAD"
  | "DZD"
  | "TND"
  | "KES"
  | "USD";

export interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
  decimals: number;
  region: "west" | "maghreb" | "east";
}

export const CURRENCIES: CurrencyInfo[] = [
  { code: "XOF", symbol: "FCFA", decimals: 0, region: "west" },
  { code: "XAF", symbol: "FCFA", decimals: 0, region: "west" },
  { code: "GHS", symbol: "GH₵", decimals: 2, region: "west" },
  { code: "NGN", symbol: "₦", decimals: 0, region: "west" },
  { code: "MAD", symbol: "DH", decimals: 2, region: "maghreb" },
  { code: "DZD", symbol: "DA", decimals: 2, region: "maghreb" },
  { code: "TND", symbol: "DT", decimals: 3, region: "maghreb" },
  { code: "KES", symbol: "KSh", decimals: 2, region: "east" },
  { code: "USD", symbol: "$", decimals: 2, region: "east" },
];

export function getCurrency(code: string): CurrencyInfo {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0]!;
}

const LOCALE_BY_LANG: Record<string, string> = {
  fr: "fr-FR",
  en: "en-US",
  ar: "ar-MA",
};

/** Format a monetary amount for display in any supported African currency. */
export function formatCurrency(
  amount: number,
  currencyCode: string,
  language = "fr",
): string {
  const info = getCurrency(currencyCode);
  const locale = LOCALE_BY_LANG[language] ?? "fr-FR";
  const value = Number.isFinite(amount) ? amount : 0;

  let formatted: string;
  try {
    formatted = new Intl.NumberFormat(locale, {
      minimumFractionDigits: info.decimals,
      maximumFractionDigits: info.decimals,
    }).format(value);
  } catch {
    formatted = value.toFixed(info.decimals);
  }

  return `${formatted} ${info.symbol}`;
}
