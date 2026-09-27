import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { trustedClientIp } from '../request-ip.js'

function req(remoteAddress, headers = {}) {
  return { socket: { remoteAddress }, headers }
}

describe('trustedClientIp', () => {
  test('uses CF-Connecting-IP when the connection is from the local tunnel', () => {
    assert.equal(trustedClientIp(req('127.0.0.1', { 'cf-connecting-ip': '203.0.113.9' })), '203.0.113.9')
    assert.equal(trustedClientIp(req('::1', { 'cf-connecting-ip': '203.0.113.9' })), '203.0.113.9')
    assert.equal(trustedClientIp(req('::ffff:127.0.0.1', { 'cf-connecting-ip': '203.0.113.9' })), '203.0.113.9')
  })

  test('ignores the header from a non-local connection: no one else can claim to be someone else', () => {
    assert.equal(trustedClientIp(req('198.51.100.7', { 'cf-connecting-ip': '203.0.113.9' })), '198.51.100.7')
  })

  test('falls back to the socket address when the header is missing', () => {
    assert.equal(trustedClientIp(req('127.0.0.1')), '127.0.0.1')
  })

  test('null when there is no address at all', () => {
    assert.equal(trustedClientIp(req(undefined)), null)
  })
})
