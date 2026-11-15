import { useFetch } from './useFetch'

/** Member counts per discord.gg invite code (server/app.js, fetchDiscordInvites). */
export type DiscordInvites = Record<string, { members: number; online: number }>

export function useDiscordInvites() {
  return useFetch<DiscordInvites>('/api/discord/invites')
}

/** The member count for a link, when it is a discord.gg invite we have numbers for. */
export function discordMembers(invites: DiscordInvites | null, url: string): number | null {
  const code = /^https:\/\/discord\.gg\/([\w-]+)$/.exec(url)?.[1]
  return code ? (invites?.[code]?.members ?? null) : null
}
