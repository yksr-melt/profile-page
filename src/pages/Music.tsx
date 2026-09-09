import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { Clock, Disc3, Mic2 } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { NowPlaying } from '../components/NowPlaying'
import { useLastfmDashboard } from '../hooks/useLastfmDashboard'
import { playlists } from '../data/mock'

export function Music() {
  const { data, loading, error } = useLastfmDashboard()

  return (
    <div className="mx-auto max-w-2xl px-5 pt-10 pb-6">
      <PageHeader
        eyebrow="Music"
        title="聴いているもの"
        description="普段聴いている曲と、よく聴くアーティスト・トラックのまとめ。"
      />

      <div className="mb-6">
        <NowPlaying />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-3xl bg-gradient-to-br from-accent-400 to-accent-500 p-5 text-white shadow-soft"
        >
          <Clock size={18} className="mb-2 opacity-80" />
          <p className="text-2xl font-black">
            {data ? data.weeklyPlays.toLocaleString() : loading ? '···' : '-'}
          </p>
          <p className="text-xs font-bold opacity-80">回再生 / 今週</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.05 }}
          className="rounded-3xl bg-gradient-to-br from-ink-800 to-ink-900 p-5 text-white shadow-soft"
        >
          <Disc3 size={18} className="mb-2 opacity-80" />
          <p className="text-2xl font-black">
            {data ? data.totalScrobbles.toLocaleString() : loading ? '···' : '-'}
          </p>
          <p className="text-xs font-bold opacity-80">総 Scrobbles</p>
        </motion.div>
      </div>

      {error && <p className="mb-6 text-center text-xs text-ink-400">Last.fmの取得に失敗しました</p>}

      <Section title="Recently Played" icon={<Disc3 size={16} className="text-accent-400" />}>
        <div className="space-y-2">
          {data?.recent.length === 0 && !loading && (
            <p className="text-xs text-ink-400">再生履歴がありません</p>
          )}
          {(data?.recent ?? (loading ? Array.from({ length: 5 }) : [])).map((t, i) => {
            const track = t as { title?: string; artist?: string; image?: string } | undefined
            return (
              <Row
                key={i}
                index={i}
                title={track?.title}
                subtitle={track?.artist}
                image={track?.image}
              />
            )
          })}
        </div>
      </Section>

      <Section title="Top Artists" icon={<Mic2 size={16} className="text-accent-400" />}>
        <div className="space-y-2">
          {(data?.topArtists ?? (loading ? Array.from({ length: 4 }) : [])).map((a, i) => {
            const artist = a as { name?: string; plays?: number; image?: string } | undefined
            return (
              <Row
                key={i}
                index={i}
                title={artist?.name}
                trailing={artist?.plays ? `${artist.plays} plays` : undefined}
                image={artist?.image}
              />
            )
          })}
        </div>
      </Section>

      <Section title="Top Tracks" icon={<Disc3 size={16} className="text-accent-400" />}>
        <div className="space-y-2">
          {(data?.topTracks ?? (loading ? Array.from({ length: 3 }) : [])).map((t, i) => {
            const track = t as { title?: string; artist?: string; plays?: number } | undefined
            return (
              <Row
                key={i}
                index={i}
                title={track?.title}
                subtitle={track?.artist}
                trailing={track?.plays ? `${track.plays}回` : undefined}
              />
            )
          })}
        </div>
      </Section>

      <Section title="Playlists" icon={<Disc3 size={16} className="text-accent-400" />}>
        <div className="flex flex-col gap-4">
          {playlists.map((p) => (
            <div key={p.name} className="overflow-hidden rounded-3xl border border-ink-200/60 shadow-softer">
              <a
                href={p.url}
                target="_blank"
                rel="noreferrer"
                className="block bg-white px-4 py-2.5 text-xs font-bold text-ink-500 transition hover:text-accent-500"
              >
                {p.name} で開く ↗
              </a>
              <iframe
                title={p.name}
                src={p.embedUrl}
                width="100%"
                height={p.height}
                loading="lazy"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                className="block"
              />
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="mb-8">
      <div className="mb-3 flex items-center gap-1.5">
        {icon}
        <h2 className="text-sm font-black text-ink-900">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function Row({
  index,
  title,
  subtitle,
  trailing,
  image,
}: {
  index: number
  title?: string
  subtitle?: string
  trailing?: string
  image?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.04 }}
      className="flex items-center gap-3 rounded-2xl border border-ink-200/60 bg-white px-4 py-3 shadow-softer"
    >
      <span className="w-4 text-xs font-bold text-ink-300">{index + 1}</span>
      {image !== undefined && (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-accent-300 to-accent-500 text-xs font-black text-white">
          {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : title?.[0]}
        </div>
      )}
      <div className="min-w-0 flex-1">
        {title ? (
          <>
            <p className="truncate text-sm font-bold text-ink-900">{title}</p>
            {subtitle && <p className="truncate text-xs text-ink-400">{subtitle}</p>}
          </>
        ) : (
          <>
            <div className="h-4 w-32 animate-pulse rounded bg-ink-100" />
            <div className="mt-1.5 h-3 w-20 animate-pulse rounded bg-ink-100" />
          </>
        )}
      </div>
      {trailing && <span className="text-xs font-bold text-accent-500">{trailing}</span>}
    </motion.div>
  )
}
