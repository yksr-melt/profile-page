import { motion } from 'framer-motion'
import { ArrowUpRight, Mail, Target } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { GithubLogo, XLogo, DiscordLogo, type IconComponent } from '../components/BrandIcons'
import { links, type LinkIcon } from '../data/mock'

const linkIcons: Record<LinkIcon, IconComponent> = {
  github: GithubLogo,
  x: XLogo,
  discord: DiscordLogo,
  mail: Mail,
  osu: Target,
}

export function Links() {
  return (
    <div className="mx-auto max-w-2xl px-5 pt-10 pb-6">
      <PageHeader eyebrow="Links" title="リンク集" description="各種SNS・外部サービスへの入口。" />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {links.map((l, i) => {
          const Icon = linkIcons[l.icon]
          return (
            <motion.a
              key={l.name}
              href={l.url}
              target="_blank"
              rel="noreferrer"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="flex items-center gap-4 rounded-3xl border border-ink-200/60 bg-white p-4 shadow-softer transition active:scale-[0.98]"
            >
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${l.color} text-white shadow-softer`}
              >
                <Icon size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-black text-ink-900">{l.name}</p>
                <p className="truncate text-xs text-ink-400">{l.handle}</p>
              </div>
              <ArrowUpRight size={16} className="shrink-0 text-ink-300" />
            </motion.a>
          )
        })}
      </div>
    </div>
  )
}
