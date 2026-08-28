import { useFetch } from './useFetch'

export type ContributionDay = { date: string; count: number; level: 0 | 1 | 2 | 3 | 4 }

export type GithubSummary = {
  profile: {
    login: string
    name: string | null
    avatarUrl: string
    bio: string | null
    followers: number
    publicRepos: number
  }
  totalContributions: number
  weeks: ContributionDay[][]
}

export function useGithubSummary() {
  return useFetch<GithubSummary>('/api/github/summary')
}
