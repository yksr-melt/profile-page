import { ArrowUpRight, Mail, Target, Heart } from 'lucide-react'
import { GithubLogo, XLogo, DiscordLogo, type IconComponent } from '../components/BrandIcons'
import { LanguageToggle } from '../components/LanguageToggle'
import { links, site, websites, type LinkIcon } from '../data/mock'
import { useLang } from '../i18n'
import { discordMembers, useDiscordInvites } from '../hooks/useDiscordInvites'

const linkIcons: Record<LinkIcon, IconComponent> = {
  github: GithubLogo,
  x: XLogo,
  discord: DiscordLogo,
  mail: Mail,
  osu: Target,
  heart: Heart,
}

/**
 * The lit.link-style page served at link.ibutya.com (server/app.js picks it by
 * hostname). A single static card with no tabs, so it shows the same links as
 * the /links tab without the rest of the site around it.
 */
export function LinkCard() {
  const { l, t } = useLang()
  const { data: invites } = useDiscordInvites()
  const membersLabel = (url: string) => {
    const n = discordMembers(invites, url)
    return n === null ? '' : ` · ${n.toLocaleString()} ${t('links.members')}`
  }

  return (
    <div className="relative min-h-dvh bg-ink-50">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_0%,var(--color-accent-100),transparent_45%),radial-gradient(circle_at_100%_20%,var(--color-accent-50),transparent_40%)]" />
      <main className="mx-auto flex max-w-md flex-col items-center px-4 pt-8 pb-12">
        <div className="mb-4 flex w-full justify-end">
          <LanguageToggle />
        </div>
        <div className="mb-4 h-24 w-24 overflow-hidden rounded-full bg-gradient-to-br from-accent-300 to-accent-500 shadow-soft ring-4 ring-white">
          <img src="/avatar.jpg" alt="" className="h-full w-full object-cover" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-ink-900">{site.name}</h1>
        <p className="mb-3 text-sm font-bold text-ink-500">{l(site.role)}</p>
        <p className="mb-8 text-center text-sm leading-relaxed text-ink-600">{l(site.homeIntro)}</p>

        <ul className="mb-6 grid w-full grid-cols-2 gap-3">
          {websites.map((w) => (
            <li key={w.url}>
              <a
                href={w.url}
                target="_blank"
                rel="noreferrer"
                className="flex h-full flex-col rounded-[28px] border border-ink-200/60 bg-white p-4 shadow-softer transition hover:-translate-y-0.5 active:scale-[0.98]"
              >
                <span className="mb-1 text-2xl">{w.emoji}</span>
                <span className="font-black text-ink-900">{w.name}</span>
                {w.note && <span className="mt-0.5 text-xs leading-snug text-ink-500">{l(w.note)}</span>}
              </a>
            </li>
          ))}
        </ul>

        <ul className="flex w-full flex-col gap-3">
          {links.map((link) => {
            const Icon = linkIcons[link.icon]
            return (
              <li key={link.url}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-[28px] border border-ink-200/60 bg-white p-2 pr-5 shadow-softer transition hover:-translate-y-0.5 active:scale-[0.98]"
                >
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${link.color} text-white`}
                  >
                    <Icon size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-black text-ink-900">{link.name}</span>
                    <span className="block truncate text-xs text-ink-400">{link.handle}{membersLabel(link.url)}</span>
                    {link.note && <span className="mt-0.5 block text-xs leading-snug text-ink-500">{l(link.note)}</span>}
                  </span>
                  <ArrowUpRight size={16} className="shrink-0 text-ink-300" />
                </a>
              </li>
            )
          })}
        </ul>

        <a href="https://ibutya.com" className="mt-10 text-xs font-bold text-ink-400 hover:text-ink-600">
          ibutya.com
        </a>
      </main>
    </div>
  )
}
