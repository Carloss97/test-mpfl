import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

const SUPPORTED = ['es', 'en'];
const STORAGE_KEY = 'krumm-lang';

function getInitialLanguage() {
  if (typeof window === 'undefined') return 'es';
  try {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get('lang');
    if (fromQuery && SUPPORTED.includes(fromQuery)) return fromQuery;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED.includes(stored)) return stored;
  } catch {
    /* ignore storage/query access errors */
  }
  return 'es';
}

function format(template, params) {
  if (!params) return template;
  return String(template).replace(/\{(\w+)\}/g, (match, key) => (
    params[key] != null ? String(params[key]) : match
  ));
}

export const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(getInitialLanguage);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, language);
    } catch {
      /* ignore storage write errors */
    }
    if (document?.documentElement) document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((next) => {
    if (SUPPORTED.includes(next)) setLanguageState(next);
  }, []);

  const toggle = useCallback(() => {
    setLanguageState((previous) => (previous === 'es' ? 'en' : 'es'));
  }, []);

  const value = useMemo(() => {
    const t = (es, en, params) => {
      const text = language === 'en' ? (en ?? es) : es;
      return format(text, params);
    };
    return { language, setLanguage, toggle, t };
  }, [language, setLanguage, toggle]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    return {
      language: 'es',
      setLanguage: () => {},
      toggle: () => {},
      t: (es, en, params) => format(es ?? en, params),
    };
  }
  return ctx;
}

export const SUPPORTED_LANGUAGES = SUPPORTED;
