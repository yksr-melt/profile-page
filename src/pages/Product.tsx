import { motion } from 'framer-motion'
import { ExternalLink, Star } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { GithubLogo } from '../components/BrandIcons'
import { useGithubRepos } from '../hooks/useGithubRepos'
import { projects } from '../data/mock'

const statusLabel: Record<string, string> = {
  active: '運用中',
  wip: '開発中',
  archived: 'アーカイブ',
}

const statusColor: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-600',
  wip: 'bg-amber-100 text-amber-600',
  archived: 'bg-ink-100 text-ink-500',
}

const languageColor: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Rust: '#dea584',
  Python: '#3572A5',
  Go: '#00ADD8',
  Swift: '#F05138',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Shell: '#89e051',
}

export function Product() {
  const { data: repos, loading, error } = useGithubRepos()

  return (
    <div className="mx-auto max-w-2xl px-5 pt-10 pb-6">
      <PageHeader
        eyebrow="Product"
        title="作ったもの"
        description="いままでに作ってきたもの。"
      />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {projects.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.45, delay: (i % 2) * 0.08 }}
            className="rounded-3xl border border-ink-200/60 bg-white p-5 shadow-softer"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-2xl">{p.emoji}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusColor[p.status]}`}>
                {statusLabel[p.status]}
              </span>
            </div>
            <h3 className="mb-1 font-black text-ink-900">{p.name}</h3>
            <p className="mb-3 text-sm text-ink-500">{p.description}</p>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {p.tags.map((t) => (
                <span key={t} className="rounded-full bg-accent-50 px-2 py-0.5 text-[10px] font-bold text-accent-500">
                  {t}
                </span>
              ))}
            </div>
            {p.github && (
              <a
                href={p.github}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-ink-500"
              >
                <GithubLogo size={13} /> Code
              </a>
            )}
          </motion.div>
        ))}
      </div>

      <div className="mb-4 flex items-center gap-1.5">
        <GithubLogo size={16} className="text-ink-900" />
        <h2 className="text-sm font-black text-ink-900">Repositories</h2>
      </div>

      {error && <p className="py-4 text-center text-xs text-ink-400">GitHubの取得に失敗しました</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {loading &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-3xl border border-ink-200/60 bg-white" />
          ))}

        {repos?.map((r, i) => (
          <motion.a
            key={r.name}
            href={r.url}
            target="_blank"
            rel="noreferrer"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.4, delay: (i % 4) * 0.05 }}
            className="flex flex-col rounded-3xl border border-ink-200/60 bg-white p-5 shadow-softer transition active:scale-[0.98]"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="truncate font-black text-ink-900">{r.name}</p>
              <ExternalLink size={14} className="shrink-0 text-ink-300" />
            </div>
            <p className="mb-3 line-clamp-2 text-sm text-ink-500">{r.description || '説明はありません'}</p>
            <div className="mt-auto flex items-center gap-3 text-xs text-ink-400">
              {r.language && (
                <span className="flex items-center gap-1.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: languageColor[r.language] || '#a1a1aa' }}
                  />
                  {r.language}
                </span>
              )}
              {r.stars > 0 && (
                <span className="flex items-center gap-1">
                  <Star size={12} /> {r.stars}
                </span>
              )}
            </div>
          </motion.a>
        ))}

        {repos && repos.length === 0 && !loading && (
          <p className="col-span-full py-4 text-center text-xs text-ink-400">
            公開されているリポジトリがありません
          </p>
        )}
      </div>
    </div>
  )
}
