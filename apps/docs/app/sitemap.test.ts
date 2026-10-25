import { afterEach, expect, test, vi } from 'vitest'
import sitemap from './sitemap'

afterEach(() => vi.unstubAllEnvs())

test('lists the home page at the site root and the docs pages under /docs', async () => {
  vi.stubEnv('SITE_URL', 'https://docs.example.com')
  const entries = await sitemap()
  const urls = entries.map((e) => e.url)

  expect(urls).toContain('https://docs.example.com')
  expect(urls).toContain('https://docs.example.com/docs/line-chart')
  expect(urls).not.toContain('https://docs.example.com/docs/home')
  expect(urls).not.toContain('https://docs.example.com/docs/navigation')
})

test('lastModified comes from publishedAt', async () => {
  const entries = await sitemap()

  expect(entries.find((e) => e.url.endsWith('/docs/line-chart'))?.lastModified).toBe(
    '2026-10-25T00:00:00.000Z',
  )
})

test('without SITE_URL the URLs use the local address', async () => {
  vi.stubEnv('SITE_URL', '')
  const entries = await sitemap()

  expect(entries.map((e) => e.url)).toContain('http://localhost:3100/docs/line-chart')
})
