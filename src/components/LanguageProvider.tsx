import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  LanguageContext,
  STORAGE_KEY,
  detectLang,
  localize,
  messages,
  type Lang,
  type LanguageContextValue,
} from '../i18n'

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectLang)

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Not persisted; the choice still applies for this visit.
    }
  }, [])

  const value = useMemo<LanguageContextValue>(
    () => ({
      lang,
      setLang,
      t: (key, vars) => {
        let s: string = messages[key][lang]
        if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v))
        return s
      },
      l: (text) => localize(text, lang),
    }),
    [lang, setLang],
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}
