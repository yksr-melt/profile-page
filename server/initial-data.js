// The Home page needs the GitHub and Last.fm data to draw itself. Fetching it
// costs a full round trip through the tunnel after the JS has loaded, so the
// last known response is embedded in the HTML instead. The frontend shows it
// at once and refreshes it in the background (src/hooks/useFetch.ts), so it
// may be old but never stays that way.
const EMBEDDED = {
  '/api/github/summary': 'github:summary',
  '/api/lastfm/dashboard': 'lastfm:dashboard',
}

export function initialData(lastGood) {
  const data = {}
  for (const [url, key] of Object.entries(EMBEDDED)) {
    const value = lastGood.get(key)
    if (value !== undefined) data[url] = value
  }
  return data
}

// JSON inside a <script> block ends at the first "</script"; escaping "<"
// (and the two line separators that older parsers treat as newlines) keeps
// upstream text from ever closing the block or starting a comment.
const LINE_SEP = String.fromCharCode(0x2028)
const PARA_SEP = String.fromCharCode(0x2029)

function escapeJson(json) {
  return json
    .replace(/</g, '\\u003c')
    .replaceAll(LINE_SEP, '\\u2028')
    .replaceAll(PARA_SEP, '\\u2029')
}

export function withInitialData(html, data) {
  if (Object.keys(data).length === 0) return html
  const at = html.lastIndexOf('</body>')
  if (at === -1) return html
  const script = `<script id="initial-data" type="application/json">${escapeJson(JSON.stringify(data))}</script>`
  // Slice rather than String.replace: "$&" and friends in the data would be
  // read as replacement patterns.
  return html.slice(0, at) + script + html.slice(at)
}
