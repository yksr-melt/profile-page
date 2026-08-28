import { useFetch } from './useFetch'

export type GithubRepo = {
  name: string
  description: string | null
  url: string
  homepage: string | null
  language: string | null
  stars: number
  topics: string[]
  updatedAt: string
}

export function useGithubRepos() {
  return useFetch<GithubRepo[]>('/api/github/repos')
}
