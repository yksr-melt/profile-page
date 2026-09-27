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

/**
 * `initialLang` is what the very first render (prerendered on the server, or
 * hydrating that markup) uses, unconditionally — always 'ja' by default.
 * detectLang() reads localStorage/navigator, which only exist in the
 * browser, so it can't run during that first render without disagreeing
 * with the server; it runs once, after mount, and switches languages then
 * if it disagrees with the default. A non-Japanese visitor briefly sees
 * Japanese text as a result — accepted as the tradeoff for every visitor
 * getting real content immediately instead of an empty shell.
 */
export function LanguageProvider({
  children,
  initialLang = 'ja',
}: {
  children: ReactNode
  initialLang?: Lang
}) {
  const [lang, setLangState] = useState<Lang>(initialLang)

  useEffect(() => {
    const detected = detectLang()
    if (detected !== initialLang) setLangState(detected)
    // Intentionally once, right after mount — not a response to `lang` changing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
