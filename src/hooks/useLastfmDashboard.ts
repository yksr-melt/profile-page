import { useFetch } from './useFetch'

export type LastfmTrack = { title: string; artist: string; image?: string; plays?: number }

export type LastfmDashboard = {
  nowPlaying: {
    title: string
    artist: string
    album: string
    image: string
    isPlaying: true
  } | null
  recent: LastfmTrack[]
  topArtists: { name: string; plays: number; image: string }[]
  topTracks: LastfmTrack[]
  weeklyPlays: number
  totalScrobbles: number
}

export function useLastfmDashboard() {
  return useFetch<LastfmDashboard>('/api/lastfm/dashboard')
}
