// The site runs behind a local `cloudflared` tunnel: every real connection
// arrives at Express as if it came from localhost, with the visitor's actual
// address in the `CF-Connecting-IP` header. That header is only trusted when
// the connection itself is local — anyone who could spoof the header would
// first need to already be on the machine — so a direct (non-tunneled)
// connection can't claim to be someone else.
const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1'])

export function trustedClientIp(req) {
  const remote = req.socket.remoteAddress
  if (LOOPBACK.has(remote)) {
    const header = req.headers['cf-connecting-ip']
    if (typeof header === 'string' && header) return header
  }
  return remote ?? null
}
