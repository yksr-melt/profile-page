# profile-page

ゆきしろの個人ポータルサイト。React + TypeScript + Tailwind CSS のSPAフロントエンドと、GitHub/Last.fmの実データを取得するExpressバックエンドで構成。

## 構成

- `src/` — フロントエンド(Vite + React + TypeScript + Tailwind CSS v4 + Framer Motion)
- `server/` — バックエンド(Express)。GitHub GraphQL APIとLast.fm APIをプロキシし、レスポンスをキャッシュする
- `src/data/config.json` — サイトの表示内容(プロフィール、スキル、プロジェクト、リンクなど)。ここを編集すれば内容を更新できる

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
