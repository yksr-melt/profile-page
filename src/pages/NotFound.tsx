import { motion } from 'framer-motion'
import { Home } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { useLang } from '../i18n'
import type { Tab } from '../types'

export function NotFound({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  const { t } = useLang()

  return (
    <div className="mx-auto max-w-2xl px-5 pt-10 pb-6">
      <PageHeader eyebrow="404" title={t('notFound.title')} description={t('notFound.description')} />
      <motion.button
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08 }}
        onClick={() => onNavigate('home')}
        className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-accent-400 to-accent-500 px-5 py-2.5 text-sm font-bold text-white shadow-soft transition active:scale-[0.98]"
      >
        <Home size={16} />
        {t('notFound.home')}
      </motion.button>
    </div>
  )
}
