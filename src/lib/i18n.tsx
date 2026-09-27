import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { TRANSLATIONS, LANGUAGES, type Language, type TranslationKey } from "./translations";
import { formatCurrency } from "./currency";

interface SettingsValue {
  language: Language;
  currency: string;
  dir: "ltr" | "rtl";
  setLanguage: (lang: Language) => void;
  setCurrency: (code: string) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
  money: (amount: number, currencyCode?: string) => string;
}

// Reuse one context across hot reloads so the provider and consumers never diverge.
const globalStore = globalThis as { __avitechSettingsCtx?: React.Context<SettingsValue | null> };
const SettingsContext =
  globalStore.__avitechSettingsCtx ?? (globalStore.__avitechSettingsCtx = createContext<SettingsValue | null>(null));

const LANG_KEY = "avitech.language";
const CUR_KEY = "avitech.currency";

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("fr");
  const [currency, setCurrencyState] = useState<string>("XOF");

  useEffect(() => {
    const storedLang = localStorage.getItem(LANG_KEY) as Language | null;
    const storedCur = localStorage.getItem(CUR_KEY);
    if (storedLang && LANGUAGES.some((l) => l.code === storedLang)) setLanguageState(storedLang);
    if (storedCur) setCurrencyState(storedCur);
  }, []);

  const dir = LANGUAGES.find((l) => l.code === language)?.dir ?? "ltr";

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = dir;
  }, [language, dir]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(LANG_KEY, lang);
  }, []);

  const setCurrency = useCallback((code: string) => {
    setCurrencyState(code);
    localStorage.setItem(CUR_KEY, code);
  }, []);

  const value = useMemo<SettingsValue>(() => {
    const t = (key: TranslationKey, vars?: Record<string, string | number>) => {
      let text = TRANSLATIONS[language][key] ?? TRANSLATIONS.fr[key] ?? String(key);
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          text = text.replace(`{${k}}`, String(v));
        }
      }
      return text;
    };
    return {
      language,
      currency,
      dir,
      setLanguage,
      setCurrency,
      t,
      money: (amount: number, currencyCode?: string) =>
        formatCurrency(amount, currencyCode ?? currency, language),
    };
  }, [language, currency, dir, setLanguage, setCurrency]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
  return ctx;
}
