import config from './config.json'

export type Project = {
  id: string
  name: string
  description: string
  tags: string[]
  status: 'active' | 'archived' | 'wip'
  featured?: boolean
  github?: string
  url?: string
  emoji: string
}

export type LinkIcon = 'github' | 'x' | 'discord' | 'mail' | 'osu'

export type SiteLink = {
  name: string
  handle: string
  url: string
  icon: LinkIcon
  color: string
}

export type Playlist = {
  name: string
  url: string
  embedUrl: string
  height: number
}

export type InterestIcon = 'gamepad' | 'music' | 'clapperboard' | 'sparkles'

export type InterestGroup = {
  category: string
  icon: InterestIcon
  items: string[]
}

export type SetupIcon = 'laptop' | 'server'

export type SetupGroup = {
  group: string
  icon: SetupIcon
  specs: { label: string; value: string }[]
}

export type Achievement = {
  title: string
  description: string
  url?: string
  emoji: string
}

export type CurrentGame = {
  name: string
  since: string
}

export const site = config.site
export const skills = config.skills
export const playlists = config.playlists as Playlist[]
export const projects = config.projects as Project[]
export const interests = config.interests as InterestGroup[]
export const wantToTry = config.wantToTry
export const achievements = config.achievements as Achievement[]
export const currentGames = config.currentGames as CurrentGame[]
export const specialSkills = config.specialSkills
export const setup = config.setup as SetupGroup[]
export const contactEmails = site.contactEmails

// One Email link per address in site.contactEmails, appended after the configured links.
const emailLinks: SiteLink[] = contactEmails.map(({ label, email }) => ({
  name: contactEmails.length > 1 ? `Email (${label})` : 'Email',
  handle: email,
  url: `mailto:${email}`,
  icon: 'mail',
  color: 'from-amber-400 to-yellow-300',
}))

export const links = [...(config.links as SiteLink[]), ...emailLinks]
