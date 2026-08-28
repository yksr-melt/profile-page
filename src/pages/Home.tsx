import { motion } from 'framer-motion'
import { Boxes, Music2, User, Link2, Mail, Target } from 'lucide-react'
import { ContributionGraph } from '../components/ContributionGraph'
import { NowPlaying } from '../components/NowPlaying'
import { Reveal } from '../components/Reveal'
import { SectionHeader } from '../components/SectionHeader'
import { GithubLogo, XLogo, DiscordLogo, type IconComponent } from '../components/BrandIcons'
import { LinkIconButton } from '../components/LinkIconButton'
import { useGithubSummary } from '../hooks/useGithubSummary'
import { useLastfmDashboard } from '../hooks/useLastfmDashboard'
import { useVisitCounter } from '../hooks/useVisitCounter'
import { projects, links, skills, site, type LinkIcon } from '../data/mock'
import type { Tab } from '../types'

const linkIcons: Record<LinkIcon, IconComponent> = {
  github: GithubLogo,
  x: XLogo,
  discord: DiscordLogo,
  mail: Mail,
  osu: Target,
}

export function Home({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  const featured = projects.find((p) => p.featured) ?? projects[0]
  const { data: github, loading: githubLoading } = useGithubSummary()
  const { data: lastfm } = useLastfmDashboard()
  const visits = useVisitCounter()

  return (
    <div className="mx-auto max-w-2xl px-5 pt-10 pb-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mb-8"
      >
        <div className="mb-4 flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[22px] bg-gradient-to-br from-accent-300 via-accent-400 to-accent-500 text-2xl font-black text-white shadow-soft">
            {githubLoading ? (
              <div className="h-full w-full animate-pulse bg-white/20" />
            ) : github?.profile.avatarUrl ? (
              <img src={github.profile.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              'い'
            )}
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-ink-900">
              {github?.profile.name || site.name}
            </h1>
            <p className="text-sm font-medium text-ink-500">
              {github?.profile.bio || site.role}
            </p>
          </div>
        </div>
        {visits !== null && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-ink-500 shadow-softer">
            累計アクセス {visits.toLocaleString()}
          </span>
        )}
      </motion.div>

      <div className="mb-4">
        <ContributionGraph />
      </div>
      <div className="mb-12">
        <NowPlaying />
      </div>

      <div className="mb-14">
        <Reveal direction="left">
          <SectionHeader
            eyebrow="Product"
            title="作ったもの"
            icon={<Boxes size={18} className="text-accent-400" />}
            onMore={() => onNavigate('product')}
          />
        </Reveal>
        <Reveal direction="left" delay={0.08}>
          <button
            onClick={() => onNavigate('product')}
            className="block w-full rounded-3xl border border-ink-200/60 bg-white p-5 text-left shadow-softer transition active:scale-[0.98]"
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="text-2xl">{featured.emoji}</span>
              <span className="font-black text-ink-900">{featured.name}</span>
            </div>
            <p className="mb-3 text-sm text-ink-500">{featured.description}</p>
            <div className="flex flex-wrap gap-1.5">
              {featured.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-accent-50 px-2.5 py-1 text-[11px] font-bold text-accent-500"
                >
                  {t}
                </span>
              ))}
            </div>
          </button>
        </Reveal>
      </div>

      <div className="mb-14">
        <Reveal direction="right">
          <SectionHeader
            eyebrow="Music"
            title="聴いているもの"
            icon={<Music2 size={18} className="text-accent-400" />}
            onMore={() => onNavigate('music')}
          />
        </Reveal>
        <Reveal direction="right" delay={0.08}>
          <button
            onClick={() => onNavigate('music')}
            className="flex w-full items-center justify-between rounded-3xl bg-gradient-to-br from-ink-900 to-ink-700 p-5 text-left shadow-soft transition active:scale-[0.98]"
          >
            <div>
              <p className="text-[11px] font-bold tracking-wide text-accent-300">
                MUSIC DASHBOARD
              </p>
              <p className="mt-1 text-lg font-black text-white">
                今週 {lastfm ? lastfm.weeklyPlays.toLocaleString() : '···'} 回再生
              </p>
            </div>
            <div className="text-3xl">🎧</div>
          </button>
        </Reveal>
      </div>

      <div className="mb-14">
        <Reveal direction="left">
          <SectionHeader
            eyebrow="Me"
            title="自分自身"
            icon={<User size={18} className="text-accent-400" />}
            onMore={() => onNavigate('me')}
          />
        </Reveal>
        <Reveal direction="left" delay={0.08}>
          <button
            onClick={() => onNavigate('me')}
            className="block w-full rounded-3xl border border-ink-200/60 bg-white p-5 text-left shadow-softer transition active:scale-[0.98]"
          >
            <p className="mb-3 text-sm text-ink-500">{site.homeIntro}</p>
            <div className="flex flex-wrap gap-1.5">
              {skills.slice(0, 5).map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-ink-100 px-2.5 py-1 text-[11px] font-bold text-ink-600"
                >
                  {s}
                </span>
              ))}
            </div>
          </button>
        </Reveal>
      </div>

      <div className="mb-6">
        <Reveal direction="right">
          <SectionHeader
            eyebrow="Links"
            title="リンク集"
            icon={<Link2 size={18} className="text-accent-400" />}
            onMore={() => onNavigate('links')}
          />
        </Reveal>
        <Reveal direction="right" delay={0.08}>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {links.map((l) => (
              <LinkIconButton
                key={l.name}
                href={l.url}
                color={l.color}
                name={l.name}
                handle={l.handle}
                Icon={linkIcons[l.icon]}
              />
            ))}
          </div>
        </Reveal>
      </div>
    </div>
  )
}
