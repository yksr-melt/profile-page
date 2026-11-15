// Makes the link-preview images from src/data/config.json and the avatar:
//   public/og-image.png  ibutya.com
//   public/og-link.png   link.ibutya.com
// Run it again after changing the name, bio, links or avatar:
//   node tools/make-og-images.mjs
// Needs Playwright with Chromium (not a project dependency on purpose: the
// images are committed, so building the site never needs a browser).
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const avatar = `data:image/jpeg;base64,${readFileSync(path.join(root, 'public', 'avatar.jpg')).toString('base64')}`
const config = JSON.parse(readFileSync(path.join(root, 'src', 'data', 'config.json'), 'utf-8'))
const { site } = config
const xHandle = config.links.find((l) => l.name === 'X')?.handle ?? ''
// One pill per service, in config order (the X sub accounts share one).
const services = [...new Set(config.links.map((l) => l.name.replace(/\s*\(.*\)$/, '')))]

const escape = (s) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`)
const text = (t) => escape(typeof t === 'string' ? t : t.ja)

function page(body) {
  return `<!doctype html><html><head>
<link href="https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@700;900&display=block" rel="stylesheet">
<style>
  body { margin: 0; width: 1200px; height: 630px; font-family: 'Zen Maru Gothic', sans-serif; overflow: hidden;
    background: radial-gradient(circle at 15% 0%, #ffd9ea, transparent 45%), radial-gradient(circle at 100% 100%, #ffe4f0, transparent 45%), #fff7fb; }
  .card { position: absolute; inset: 56px; border-radius: 48px; background: #fff; box-shadow: 0 24px 60px -20px #f5a3c8;
    display: flex; align-items: center; gap: 56px; padding: 0 72px; }
  .avatar { position: relative; flex-shrink: 0; }
  .badge { position: absolute; right: 0; bottom: 8px; width: 60px; height: 60px; border-radius: 50%; background: #fff;
    box-shadow: 0 6px 16px -6px #f5a3c8; display: flex; align-items: center; justify-content: center; font-size: 34px; }
  img { width: 220px; height: 220px; border-radius: 50%; border: 8px solid #f9a8cf; object-fit: cover; flex-shrink: 0; }
  .eyebrow { color: #ec4899; font-size: 30px; font-weight: 900; letter-spacing: .12em; }
  h1 { margin: 4px 0 6px; font-size: 76px; font-weight: 900; color: #831843; }
  .sub { color: #db7aa8; font-size: 32px; font-weight: 700; margin-bottom: 28px; }
  .bio { color: #9d174d; font-size: 40px; font-weight: 700; }
  .pills { display: flex; flex-wrap: wrap; gap: 12px; }
  .pill { padding: 10px 24px; border-radius: 999px; background: #fdf0f6; color: #9d174d; font-size: 26px; font-weight: 700; }
</style></head><body><div class="card"><div class="avatar"><img src="${avatar}"><span class="badge">🦈</span></div><div>${body}</div></div></body></html>`
}

const images = {
  'og-image.png': page(`
    <div class="eyebrow">PROFILE</div>
    <h1>${text(site.name)}</h1>
    <div class="sub">${escape(xHandle)}</div>
    <div class="bio">${text(site.role)}</div>`),
  'og-link.png': page(`
    <div class="eyebrow">LINKS</div>
    <h1>${text(site.name)}</h1>
    <div class="sub">link.ibutya.com</div>
    <div class="pills">${services.map((s) => `<span class="pill">${escape(s)}</span>`).join('')}</div>`),
}

const browser = await chromium.launch()
const tab = await browser.newPage({ viewport: { width: 1200, height: 630 } })
for (const [file, html] of Object.entries(images)) {
  await tab.setContent(html, { waitUntil: 'networkidle' })
  await tab.evaluate(() => document.fonts.ready)
  await tab.screenshot({ path: path.join(root, 'public', file) })
  console.log(`wrote public/${file}`)
}
await browser.close()
