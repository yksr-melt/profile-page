import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

export function Reveal({
  children,
  direction = 'left',
  delay = 0,
  className = '',
}: {
  children: ReactNode
  direction?: 'left' | 'right' | 'up'
  delay?: number
  className?: string
}) {
  const offset = direction === 'up' ? 0 : direction === 'left' ? -56 : 56
  const yOffset = direction === 'up' ? 32 : 0

  return (
    <motion.div
      initial={{ opacity: 0, x: offset, y: yOffset }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
