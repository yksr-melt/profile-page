# profile-page

ゆきしろの個人ポータルサイト。React + TypeScript + Tailwind CSS のSPAフロントエンドと、GitHub/Last.fmの実データを取得するExpressバックエンドで構成。

## 構成

- `src/` — フロントエンド(Vite + React + TypeScript + Tailwind CSS v4 + Framer Motion)
- `server/` — バックエンド(Express)。GitHub GraphQL APIとLast.fm APIをプロキシし、レスポンスをキャッシュする
- `src/data/config.json` — サイトの表示内容(プロフィール、スキル、プロジェクト、リンクなど)。ここを編集すれば内容を更新できる
- `src/i18n.ts` — 日本語/英語の切り替え。UIの文言はここの `messages` に定義する

## 多言語対応(日本語 / English)

初回アクセス時はブラウザ・端末の言語設定で自動的に表示言語が決まる(日本語なら日本語、それ以外は英語)。ホーム画面右上の JA / EN トグルで切り替えると、その選択が保存され次回以降も使われる。

`config.json` のテキストは、全言語共通なら文字列、言語ごとに変えるなら `{ "ja": "...", "en": "..." }` の形で書く。

```json
"oshi": [
  { "name": { "ja": "後藤ひとり", "en": "Hitori Gotoh" }, "from": { "ja": "ぼっち・ざ・ろっく！", "en": "Bocchi the Rock!" }, "emoji": "🎸" }
],
"favoriteArtists": [
  { "name": "Porter Robinson", "genre": "future bass", "url": "https://open.spotify.com/..." }
]
```

`oshi` は `name` / `from` / `emoji` / `image` / `url`、`favoriteArtists` は `name` / `genre` / `image` / `url` が使える(`name` 以外は省略可)。

## セットアップ

Node.js 20以上が必要(`.nvmrc`参照)。

```bash
npm install
cp .env.example .env
# .env に GitHub Personal Access Token と Last.fm API key を設定
npm start
```

`npm start` でフロントエンド(Vite dev server, :5173)とAPIサーバー(:3001)が同時に起動する。

## 本番ビルド

```bash
npm run build
node server/index.js
```

ビルド後は単一のExpressプロセス(:3001)がフロントエンドとAPIの両方を配信する。
