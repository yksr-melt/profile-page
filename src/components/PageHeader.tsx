import { motion } from 'framer-motion'
import { isHydrated } from '../hydration'

export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <motion.div
      initial={isHydrated() ? { opacity: 0, y: 12 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mb-7"
    >
      <p className="text-xs font-bold tracking-widest text-accent-500 uppercase">{eyebrow}</p>
      <h1 className="mt-1 text-3xl font-black tracking-tight text-ink-900">{title}</h1>
      <p className="mt-2 text-sm text-ink-500">{description}</p>
    </motion.div>
  )
}
