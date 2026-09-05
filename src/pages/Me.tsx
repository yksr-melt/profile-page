import { motion } from 'framer-motion'
import { Mail, Sparkles, Gamepad2, Music, Clapperboard, Laptop, Server, Rocket, Award } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { useGithubSummary } from '../hooks/useGithubSummary'
import {
  site,
  skills,
  interests,
  setup,
  wantToTry,
  achievements,
  contactEmails,
  type InterestIcon,
  type SetupIcon,
} from '../data/mock'

const interestIcons: Record<InterestIcon, typeof Gamepad2> = {
  gamepad: Gamepad2,
  music: Music,
  clapperboard: Clapperboard,
  sparkles: Sparkles,
}

const setupIcons: Record<SetupIcon, typeof Laptop> = {
  laptop: Laptop,
  server: Server,
}

export function Me() {
  const { data: github } = useGithubSummary()

  return (
    <div className="mx-auto max-w-2xl px-5 pt-10 pb-6">
      <PageHeader eyebrow="Me" title="自分自身" description="私について。" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex items-center gap-4 rounded-[28px] bg-gradient-to-br from-accent-300 via-accent-400 to-accent-500 p-6 text-white shadow-soft"
      >
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/20 text-3xl font-black backdrop-blur">
          <img src="/avatar.jpg" alt="" className="h-full w-full object-cover" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-lg font-black">{github?.profile.name || site.name}</p>
            <span className="rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-bold">
              {site.pronouns}
            </span>
          </div>
          <p className="text-sm opacity-90">{github?.profile.bio || site.role}</p>
          {github && (
            <p className="mt-0.5 text-xs opacity-75">
              フォロワー {github.profile.followers} · リポジトリ {github.profile.publicRepos}
            </p>
          )}
        </div>
      </motion.div>

      <Card title="About" delay={0.05}>
        <p className="text-sm leading-relaxed text-ink-600">{site.aboutText}</p>
      </Card>

      <Card title="Skills" delay={0.1} icon={<Sparkles size={15} className="text-accent-400" />}>
        <div className="flex flex-wrap gap-2">
          {skills.map((s, i) => (
            <motion.span
              key={s}
              initial={{ opacity: 0, scale: 0.85 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.03 }}
              className="rounded-full bg-accent-50 px-3 py-1.5 text-xs font-bold text-accent-500"
            >
              {s}
            </motion.span>
          ))}
        </div>
      </Card>

      <Card title="好きなもの" delay={0.12} icon={<Sparkles size={15} className="text-accent-400" />}>
        <div className="flex flex-col gap-4">
          {interests.map((group) => {
            const Icon = interestIcons[group.icon]
            return (
              <div key={group.category}>
                <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-ink-400">
                  <Icon size={14} />
                  {group.category}
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.items.map((item) => (
                    <span
                      key={item}
                      className="rounded-full bg-ink-50 px-3 py-1.5 text-xs font-bold text-ink-700"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <Card title="してみたいこと" delay={0.14} icon={<Rocket size={15} className="text-accent-400" />}>
        <div className="flex flex-wrap gap-2">
          {wantToTry.map((item) => (
            <span
              key={item}
              className="rounded-full bg-accent-50 px-3 py-1.5 text-xs font-bold text-accent-500"
            >
              {item}
            </span>
          ))}
        </div>
      </Card>

      <Card title="実績" delay={0.15} icon={<Award size={15} className="text-accent-400" />}>
        <div className="flex flex-col gap-2">
          {achievements.map((a) => {
            const content = (
              <>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-lg shadow-softer">
                  {a.emoji}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-ink-800">{a.title}</p>
                  <p className="text-xs text-ink-400">{a.description}</p>
                </div>
              </>
            )
            const className =
              'flex items-center gap-3 rounded-2xl bg-ink-50 px-4 py-3 transition active:scale-[0.98]'
            return a.url ? (
              <a key={a.title} href={a.url} target="_blank" rel="noreferrer" className={className}>
                {content}
              </a>
            ) : (
              <div key={a.title} className={className}>
                {content}
              </div>
            )
          })}
        </div>
      </Card>

      <Card title="使ってる環境" delay={0.16} icon={<Laptop size={15} className="text-accent-400" />}>
        <div className="flex flex-col gap-4">
          {setup.map((group) => {
            const Icon = setupIcons[group.icon]
            return (
              <div key={group.group} className="rounded-2xl bg-ink-50 p-4">
                <div className="mb-2.5 flex items-center gap-1.5 text-xs font-bold text-ink-500">
                  <Icon size={14} />
                  {group.group}
                </div>
                <div className="space-y-1.5">
                  {group.specs.map((spec) => (
                    <div key={spec.label} className="flex items-center justify-between text-sm">
                      <span className="text-ink-400">{spec.label}</span>
                      <span className="font-bold text-ink-800">{spec.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <Card title="Contact" delay={0.18}>
        <div className="flex flex-col gap-2">
          {contactEmails.map(({ label, email }) => (
            <a
              key={email}
              href={`mailto:${email}`}
              className="flex items-center gap-2.5 rounded-2xl bg-ink-50 px-4 py-3 text-sm font-bold text-ink-700 transition active:scale-[0.98]"
            >
              <Mail size={16} />
              <span>{email}</span>
              {contactEmails.length > 1 && (
                <span className="ml-auto text-xs font-bold text-ink-400">{label}</span>
              )}
            </a>
          ))}
        </div>
      </Card>
    </div>
  )
}

function Card({
  title,
  icon,
  delay = 0,
  children,
}: {
  title: string
  icon?: React.ReactNode
  delay?: number
  children: React.ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.45, delay }}
      className="mb-4 rounded-3xl border border-ink-200/60 bg-white p-5 shadow-softer"
    >
      <div className="mb-3 flex items-center gap-1.5">
        {icon}
        <h3 className="text-sm font-black text-ink-900">{title}</h3>
      </div>
      {children}
    </motion.div>
  )
}
