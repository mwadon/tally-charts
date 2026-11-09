// @vitest-environment node
import { expect, test } from 'vitest'
import config from '../next.config'
import { securityHeaders } from './security-headers'

const asMap = (headers: { key: string; value: string }[]) =>
  Object.fromEntries(headers.map((h) => [h.key, h.value]))

test('without editor origins only the site itself may frame the pages', () => {
  expect(asMap(securityHeaders({}))).toEqual({
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "frame-ancestors 'self'",
  })
})

test('the editor origins of NEXT_PUBLIC_CMS_EDITOR_ORIGIN may frame the pages too', () => {
  const headers = asMap(
    securityHeaders({
      NEXT_PUBLIC_CMS_EDITOR_ORIGIN: 'https://cms.example.com, http://localhost:4000/',
    }),
  )

  expect(headers['Content-Security-Policy']).toBe(
    "frame-ancestors 'self' https://cms.example.com http://localhost:4000",
  )
})

test('the CSP has no other directive: script-src would break the inline theme script', () => {
  const csp = asMap(securityHeaders({}))['Content-Security-Policy'] ?? ''

  expect(csp.split(';')).toHaveLength(1)
  expect(csp).not.toMatch(/script-src|style-src|default-src/)
})

test('a value that is not an origin cannot inject a source or a directive', () => {
  const csp = asMap(securityHeaders({ NEXT_PUBLIC_CMS_EDITOR_ORIGIN: "*; script-src 'none'" }))[
    'Content-Security-Policy'
  ]

  expect(csp).toBe("frame-ancestors 'self'")
})

test('next.config sends the headers on every path', async () => {
  const rules = (await config.headers?.()) ?? []

  expect(rules).toHaveLength(1)
  expect(rules[0]?.source).toBe('/:path*')
  expect(rules[0]?.headers).toEqual(securityHeaders())
})

test('next.config redirects /docs to the first docs page', async () => {
  expect(await config.redirects?.()).toEqual([
    { source: '/docs', destination: '/docs/getting-started', permanent: false },
  ])
})
