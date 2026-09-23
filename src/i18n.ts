import { createContext, useContext } from 'react'

export type Lang = 'ja' | 'en'

export const LANGS: Lang[] = ['ja', 'en']

// Text in config.json can either be a plain string (same in every language)
// or an object with one entry per language.
export type Text = string | Record<Lang, string>

export function localize(text: Text, lang: Lang): string {
  return typeof text === 'string' ? text : text[lang]
}

export const STORAGE_KEY = 'lang'

// A language picked with the toggle wins; otherwise follow the device/browser
// language (Japanese devices get Japanese, everything else gets English).
export function detectLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'ja' || saved === 'en') return saved
  } catch {
    // Storage can be unavailable (private mode, blocked site data).
  }
  const preferred = navigator.languages?.length ? navigator.languages : [navigator.language]
  for (const l of preferred) {
    const code = l?.toLowerCase() ?? ''
    if (code.startsWith('ja')) return 'ja'
    if (code.startsWith('en')) return 'en'
  }
  return 'en'
}

export const messages = {
  'home.visits': { ja: '累計アクセス', en: 'Total visits' },
  'home.weeklyPlays': { ja: '今週 {n} 回再生', en: '{n} plays this week' },
  'home.languageLabel': { ja: '言語', en: 'Language' },
  'section.more': { ja: 'もっと見る', en: 'See more' },

  'product.title': { ja: '作ったもの', en: 'Things I made' },
  'product.description': { ja: 'いままでに作ってきたもの。', en: 'Things I have built so far.' },
  'product.achievements': { ja: '実績', en: 'Achievements' },
  'product.code': { ja: 'Code', en: 'Code' },
  'product.noDescription': { ja: '説明はありません', en: 'No description' },
  'product.noRepos': { ja: '公開されているリポジトリがありません', en: 'No public repositories' },
  'status.active': { ja: '運用中', en: 'Active' },
  'status.wip': { ja: '開発中', en: 'WIP' },
  'status.archived': { ja: 'アーカイブ', en: 'Archived' },

  'music.title': { ja: '聴いているもの', en: 'What I listen to' },
  'music.description': {
    ja: '普段聴いている曲と、よく聴くアーティスト・トラックのまとめ。',
    en: 'What I have been listening to, plus my most played artists and tracks.',
  },
  'music.weeklyPlays': { ja: '回再生 / 今週', en: 'plays / this week' },
  'music.totalScrobbles': { ja: '総 Scrobbles', en: 'total scrobbles' },
  'music.trackPlays': { ja: '{n}回', en: '{n} plays' },
  'music.openIn': { ja: '{name} で開く ↗', en: 'Open in {name} ↗' },
  'music.noHistory': { ja: '再生履歴がありません', en: 'No listening history' },
  'music.recent': { ja: '最近の再生', en: 'RECENTLY PLAYED' },
  'error.lastfm': { ja: 'Last.fmの取得に失敗しました', en: 'Failed to load Last.fm' },
  'error.github': { ja: 'GitHubの取得に失敗しました', en: 'Failed to load GitHub' },

  'me.title': { ja: '自分自身', en: 'About me' },
  'me.description': { ja: '私について。', en: 'A little about me.' },
  'me.githubStats': { ja: 'フォロワー {followers} · リポジトリ {repos}', en: '{followers} followers · {repos} repos' },
  'me.skills': { ja: 'Skills', en: 'Skills' },
  'me.specialSkills': { ja: '特技', en: 'Special skills' },
  'me.interests': { ja: '好きなもの', en: 'Things I like' },
  'me.oshi': { ja: '推し', en: 'Oshi (favorites)' },
  'me.favoriteArtists': { ja: '好きなアーティスト', en: 'Favorite artists' },
  'me.empty': { ja: 'まだ登録されていません', en: 'Nothing here yet' },
  'me.games': { ja: '今遊んでいるゲーム', en: 'Games I am playing' },
  'me.wantToTry': { ja: 'してみたいこと', en: 'Things I want to try' },
  'me.setup': { ja: '使ってる環境', en: 'My setup' },

  'links.title': { ja: 'リンク集', en: 'Links' },
  'links.description': { ja: '各種SNS・外部サービスへの入口。', en: 'Where to find me on social media and other services.' },

  'graph.less': { ja: '少', en: 'Less' },
  'graph.more': { ja: '多', en: 'More' },
} satisfies Record<string, Record<Lang, string>>

export type MessageKey = keyof typeof messages

export type LanguageContextValue = {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: MessageKey, vars?: Record<string, string | number>) => string
  l: (text: Text) => string
}

export const LanguageContext = createContext<LanguageContextValue | null>(null)

export function useLang() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLang must be used inside <LanguageProvider>')
  return ctx
}
