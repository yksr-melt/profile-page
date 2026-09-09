import 'dotenv/config'
import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3001

const GITHUB_USERNAME = process.env.GITHUB_USERNAME
const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const LASTFM_USERNAME = process.env.LASTFM_USERNAME
const LASTFM_API_KEY = process.env.LASTFM_API_KEY

function levelForCount(count) {
  if (count === 0) return 0
  if (count <= 2) return 1
  if (count <= 5) return 2
  if (count <= 9) return 3
  return 4
}

// Last.fm no longer stores per-artist/per-track artwork; when it has nothing
// to show it silently returns one of a handful of generic placeholder images
// (e.g. a plain white star) instead of leaving the field empty. Treat those
// as "no image" so the frontend falls back to its own icon.
const LASTFM_PLACEHOLDER_HASHES = [
  '2a96cbd8b46e442fc41c2b86b821562f', // generic star (artists, some tracks)
  'c6f59c1e5e7240a4c0d427abd71f3dbb', // generic grey "no cover" square
]

function cleanLastfmImage(url) {
  if (!url) return ''
  return LASTFM_PLACEHOLDER_HASHES.some((hash) => url.includes(hash)) ? '' : url
}

// ---------- Simple in-memory response cache ----------
// Cuts down on redundant upstream calls when several components on the page
// request the same endpoint at once, and keeps us well under GitHub/Last.fm
// rate limits.
const cache = new Map()

async function cached(key, ttlMs, fn) {
  const hit = cache.get(key)
  if (hit && hit.expires > Date.now()) return hit.value
  if (hit && hit.pending) return hit.pending
  const pending = fn()
    .then((value) => {
      cache.set(key, { value, expires: Date.now() + ttlMs })
      return value
    })
    .catch((err) => {
      cache.delete(key)
      throw err
    })
  cache.set(key, { pending, expires: 0 })
  return pending
}

// ---------- Visit counter ----------

const STATS_FILE = path.join(__dirname, 'data', 'stats.json')

function readStats() {
  try {
    return JSON.parse(fs.readFileSync(STATS_FILE, 'utf-8'))
  } catch {
    return { visits: 0 }
  }
}

function writeStats(stats) {
  fs.mkdirSync(path.dirname(STATS_FILE), { recursive: true })
  fs.writeFileSync(STATS_FILE, JSON.stringify(stats))
}

app.get('/api/stats/visits', (req, res) => {
  res.json(readStats())
})

app.post('/api/stats/visits', (req, res) => {
  const stats = readStats()
  stats.visits = (stats.visits || 0) + 1
  writeStats(stats)
  res.json(stats)
})

// ---------- GitHub ----------

const CONTRIBUTIONS_QUERY = `
  query ($login: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $login) {
      name
      login
      avatarUrl
      bio
      followers { totalCount }
      repositories(privacy: PUBLIC) { totalCount }
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
            }
          }
        }
      }
    }
  }
`

async function fetchGithubSummary() {
  const to = new Date()
  const from = new Date(to)
  from.setDate(from.getDate() - 364)

  const ghRes = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `bearer ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: CONTRIBUTIONS_QUERY,
      variables: {
        login: GITHUB_USERNAME,
        from: from.toISOString(),
        to: to.toISOString(),
      },
    }),
  })

  if (!ghRes.ok) {
    throw new Error(`GitHub API error: ${ghRes.status} ${await ghRes.text()}`)
  }

  const json = await ghRes.json()
  if (json.errors) {
    throw new Error(`GitHub GraphQL error: ${JSON.stringify(json.errors)}`)
  }

  const user = json.data.user
  const calendar = user.contributionsCollection.contributionCalendar

  const weeks = calendar.weeks.map((week) =>
    week.contributionDays.map((day) => ({
      date: day.date,
      count: day.contributionCount,
      level: levelForCount(day.contributionCount),
    })),
  )

  return {
    profile: {
      login: user.login,
      name: user.name,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      followers: user.followers.totalCount,
      publicRepos: user.repositories.totalCount,
    },
    totalContributions: calendar.totalContributions,
    weeks,
  }
}

app.get('/api/github/summary', async (req, res) => {
  if (!GITHUB_TOKEN || !GITHUB_USERNAME) {
    return res.status(500).json({ error: 'GitHub is not configured on the server' })
  }

  try {
    res.json(await cached('github:summary', 15 * 60 * 1000, fetchGithubSummary))
  } catch (err) {
    res.status(500).json({ error: 'Failed to reach GitHub', detail: String(err) })
  }
})

async function fetchGithubRepos() {
  const ghRes = await fetch(
    `https://api.github.com/users/${GITHUB_USERNAME}/repos?type=owner&sort=pushed&direction=desc&per_page=100`,
    {
      headers: {
        Authorization: `bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    },
  )

  if (!ghRes.ok) {
    throw new Error(`GitHub API error: ${ghRes.status} ${await ghRes.text()}`)
  }

  const repos = await ghRes.json()

  return repos
    .filter((r) => !r.private && !r.fork && !r.archived)
    .map((r) => ({
      name: r.name,
      description: r.description,
      url: r.html_url,
      homepage: r.homepage || null,
      language: r.language,
      stars: r.stargazers_count,
      topics: r.topics || [],
      updatedAt: r.pushed_at,
    }))
}

app.get('/api/github/repos', async (req, res) => {
  if (!GITHUB_TOKEN || !GITHUB_USERNAME) {
    return res.status(500).json({ error: 'GitHub is not configured on the server' })
  }

  try {
    res.json(await cached('github:repos', 15 * 60 * 1000, fetchGithubRepos))
  } catch (err) {
    res.status(500).json({ error: 'Failed to reach GitHub', detail: String(err) })
  }
})

// ---------- Deezer (artist images) ----------
// Last.fm stopped returning real artist photos years ago (every artist comes
// back with the same placeholder image), so real artwork for the Top Artists
// list has to come from elsewhere. Deezer's search API is public, needs no
// key, and reliably has artist photos.
const deezerImageCache = new Map()

async function fetchDeezerArtistImage(name) {
  if (deezerImageCache.has(name)) return deezerImageCache.get(name)

  try {
    const url = `https://api.deezer.com/search/artist?q=${encodeURIComponent(name)}&limit=1`
    const res = await fetch(url)
    const json = await res.json()
    const image = res.ok ? json.data?.[0]?.picture_medium ?? '' : ''
    deezerImageCache.set(name, image)
    return image
  } catch {
    deezerImageCache.set(name, '')
    return ''
  }
}

// ---------- Last.fm ----------

const LASTFM_BASE = 'https://ws.audioscrobbler.com/2.0/'

async function lastfm(method, params = {}) {
  const url = new URL(LASTFM_BASE)
  url.searchParams.set('method', method)
  url.searchParams.set('user', LASTFM_USERNAME)
  url.searchParams.set('api_key', LASTFM_API_KEY)
  url.searchParams.set('format', 'json')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)

  const res = await fetch(url)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Last.fm ${method} failed: ${res.status} ${text}`)
  }
  return res.json()
}

async function fetchLastfmDashboard() {
  const sevenDaysAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60

  const [recentData, topArtists7day, topTracks7day, infoData, weeklyScrobbles] = await Promise.all([
    lastfm('user.getrecenttracks', { limit: 6, extended: 1 }),
    lastfm('user.gettopartists', { period: '7day', limit: 6 }),
    lastfm('user.gettoptracks', { period: '7day', limit: 5 }),
    lastfm('user.getinfo'),
    // A precise "plays in the last rolling 7 days" count — Last.fm's own
    // weekly chart uses fixed calendar-week boundaries, not "now minus 7d".
    lastfm('user.getrecenttracks', { from: sevenDaysAgo, limit: 1 }),
  ])

  // Fall back to all-time stats when the user has no plays in the last 7 days.
  const hasWeeklyArtists = (topArtists7day.topartists?.artist ?? []).length > 0
  const hasWeeklyTracks = (topTracks7day.toptracks?.track ?? []).length > 0

  const [topArtistsData, topTracksData] = await Promise.all([
    hasWeeklyArtists ? topArtists7day : lastfm('user.gettopartists', { period: 'overall', limit: 6 }),
    hasWeeklyTracks ? topTracks7day : lastfm('user.gettoptracks', { period: 'overall', limit: 5 }),
  ])

  const recentTracksRaw = recentData.recenttracks?.track ?? []
  const tracksArr = Array.isArray(recentTracksRaw) ? recentTracksRaw : [recentTracksRaw]

  const nowPlayingTrack = tracksArr.find((t) => t['@attr']?.nowplaying === 'true')
  const recent = tracksArr
    .filter((t) => !t['@attr']?.nowplaying)
    .slice(0, 5)
    .map((t) => ({
      title: t.name,
      artist: t.artist?.name ?? t.artist?.['#text'],
      image: cleanLastfmImage(t.image?.[2]?.['#text']),
    }))

  const nowPlaying = nowPlayingTrack
    ? {
        title: nowPlayingTrack.name,
        artist: nowPlayingTrack.artist?.name ?? nowPlayingTrack.artist?.['#text'],
        album: nowPlayingTrack.album?.['#text'] ?? '',
        image: cleanLastfmImage(nowPlayingTrack.image?.[2]?.['#text']),
        isPlaying: true,
      }
    : null

  const topArtists = await Promise.all(
    (topArtistsData.topartists?.artist ?? []).map(async (a) => {
      const image = cleanLastfmImage(a.image?.[2]?.['#text']) || (await fetchDeezerArtistImage(a.name))
      return {
        name: a.name,
        plays: Number(a.playcount),
        image,
      }
    }),
  )

  const topTracks = (topTracksData.toptracks?.track ?? []).map((t) => ({
    title: t.name,
    artist: t.artist?.name,
    plays: Number(t.playcount),
  }))

  const weeklyPlays = Number(weeklyScrobbles.recenttracks?.['@attr']?.total ?? 0)

  return {
    nowPlaying,
    recent,
    topArtists,
    topTracks,
    weeklyPlays,
    totalScrobbles: Number(infoData.user?.playcount ?? 0),
  }
}

app.get('/api/lastfm/dashboard', async (req, res) => {
  if (!LASTFM_API_KEY || !LASTFM_USERNAME) {
    return res.status(500).json({ error: 'Last.fm is not configured on the server' })
  }

  try {
    res.json(await cached('lastfm:dashboard', 2 * 60 * 1000, fetchLastfmDashboard))
  } catch (err) {
    res.status(500).json({ error: 'Failed to reach Last.fm', detail: String(err) })
  }
})

// ---------- Static frontend (production) ----------
// After `npm run build`, dist/ holds the built SPA. Serve it from the same
// port as the API so a single process (and a single tunnel hostname) can
// expose the whole site.
const DIST_DIR = path.join(__dirname, '..', 'dist')

if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR))
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`)
  if (!fs.existsSync(DIST_DIR)) {
    console.log('No dist/ build found — run `npm run build` to serve the frontend from this port too.')
  }
})
