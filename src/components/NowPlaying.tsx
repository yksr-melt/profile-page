import { motion } from 'framer-motion'
import { Music4 } from 'lucide-react'
import { useLastfmDashboard } from '../hooks/useLastfmDashboard'

export function NowPlaying() {
  const { data, loading, error } = useLastfmDashboard()

  const playing = data?.nowPlaying
  const fallback = data?.recent?.[0]
  const track = playing ?? fallback
  const imageUrl = playing?.image || fallback?.image || ''

  return (
    <div className="flex items-center gap-4 rounded-3xl border border-ink-200/60 bg-white p-4 shadow-softer">
      <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-300 to-accent-500 text-white shadow-soft">
        <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-2xl">
          {loading ? (
            <div className="h-full w-full animate-pulse bg-white/20" />
          ) : imageUrl ? (
            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <Music4 size={26} />
          )}
        </div>
        {playing?.isPlaying && (
          <div className="absolute -right-1.5 -bottom-1.5 flex h-6 items-end gap-[2px] rounded-full bg-white px-1.5 py-1 shadow-softer">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="h-3 w-[3px] origin-bottom rounded-full bg-accent-500"
                animate={{ scaleY: [0.35, 1, 0.5, 0.85, 0.35] }}
                transition={{
                  duration: 1 + i * 0.15,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        {loading && (
          <>
            <div className="h-3 w-16 animate-pulse rounded bg-ink-100" />
            <div className="mt-1.5 h-4 w-32 animate-pulse rounded bg-ink-100" />
            <div className="mt-1.5 h-3 w-20 animate-pulse rounded bg-ink-100" />
          </>
        )}
        {!loading && (
          <p className="text-[11px] font-bold tracking-wide text-accent-500">
            {playing ? 'NOW PLAYING' : '最近の再生'}
          </p>
        )}
        {error && <p className="text-sm text-ink-400">Last.fmの取得に失敗しました</p>}
        {!loading && track && (
          <>
            <p className="truncate text-base font-bold text-ink-900">{track.title}</p>
            <p className="truncate text-sm text-ink-500">{track.artist}</p>
          </>
        )}
        {!loading && !error && !track && (
          <p className="text-sm text-ink-400">再生履歴がありません</p>
        )}
      </div>
    </div>
  )
}
