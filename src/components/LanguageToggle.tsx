import { motion } from 'framer-motion'
import { Languages } from 'lucide-react'
import { LANGS, useLang } from '../i18n'

const labels = { ja: 'JA', en: 'EN' } as const

export function LanguageToggle() {
  const { lang, setLang, t } = useLang()

  return (
    <div
      role="radiogroup"
      aria-label={t('home.languageLabel')}
      className="flex items-center gap-0.5 rounded-full bg-white p-1 shadow-softer"
    >
      <Languages size={14} className="mx-1.5 text-ink-400" aria-hidden />
      {LANGS.map((l) => {
        const active = l === lang
        return (
          <button
            key={l}
            role="radio"
            aria-checked={active}
            onClick={() => setLang(l)}
            className={`relative rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors ${
              active ? 'text-white' : 'text-ink-500'
            }`}
          >
            {active && (
              <motion.span
                layoutId="lang-pill"
                className="absolute inset-0 rounded-full bg-gradient-to-br from-accent-400 to-accent-500"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <span className="relative">{labels[l]}</span>
          </button>
        )
      })}
    </div>
  )
}
