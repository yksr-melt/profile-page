import config from './config.json'
import type { Text } from '../i18n'

export type Project = {
  id: string
  name: string
  description: Text
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
  category: Text
  icon: InterestIcon
  items: Text[]
}

export type Oshi = {
  name: Text
  // Where they're from (a series, group, game, ...)
  from?: Text
  emoji?: string
  image?: string
  url?: string
}

export type FavoriteArtist = {
  name: Text
  genre?: Text
  image?: string
  url?: string
}

export type SetupIcon = 'laptop' | 'server'

export type SetupGroup = {
  group: Text
  icon: SetupIcon
  specs: { label: Text; value: Text }[]
}

export type Achievement = {
  title: Text
  description: Text
  url?: string
  emoji: string
}

export type CurrentGame = {
  name: Text
  since: string
}

export const site = config.site as {
  name: string
  role: Text
  pronouns: string
  homeIntro: Text
  aboutText: Text
  contactEmails: { label: string; email: string }[]
}
export const skills = config.skills
export const playlists = config.playlists as Playlist[]
export const projects = config.projects as Project[]
export const interests = config.interests as InterestGroup[]
export const oshi = config.oshi as Oshi[]
export const favoriteArtists = config.favoriteArtists as FavoriteArtist[]
export const wantToTry = config.wantToTry as Text[]
export const achievements = config.achievements as Achievement[]
export const currentGames = config.currentGames as CurrentGame[]
export const specialSkills = config.specialSkills as Text[]
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
