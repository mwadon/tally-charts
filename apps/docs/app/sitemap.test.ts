import { afterEach, expect, test, vi } from 'vitest'
import type { ContentSource } from '../lib/content'
import sitemap from './sitemap'

// `undefined` keeps the real source (the fixtures); a test sets its own to stand in for the CMS.
const override = vi.hoisted(() => ({ source: undefined as unknown }))

vi.mock('../lib/content', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/content')>()
  return {
    ...original,
    getContentSource: (...args: Parameters<typeof original.getContentSource>) =>
      (override.source as ContentSource | undefined) ?? original.getContentSource(...args),
  }
})

afterEach(() => {
  vi.unstubAllEnvs()
  override.source = undefined
})

test('lists the home page at the site root and the docs pages under /docs', async () => {
  vi.stubEnv('SITE_URL', 'https://docs.example.com')
  const entries = await sitemap()
  const urls = entries.map((e) => e.url)

  expect(urls).toContain('https://docs.example.com')
  expect(urls).toContain('https://docs.example.com/docs/line-chart')
  expect(urls).not.toContain('https://docs.example.com/docs/home')
  expect(urls).not.toContain('https://docs.example.com/docs/navigation')
})

test('the fixtures have no lastModified: their publishedAt is a constant, not a date of change', async () => {
  const entries = await sitemap()

  expect(entries.length).toBeGreaterThan(1)
  for (const entry of entries) expect(entry, entry.url).not.toHaveProperty('lastModified')
})

test('with the CMS lastModified comes from publishedAt, when the page has one', async () => {
  const item = { pageId: 'p', versionId: 'v', version: 1, title: 'T', locale: 'en' }
  override.source = {
    kind: 'cms',
    getPage: async () => null,
    getNavigation: async () => ({ groups: [] }),
    listPages: async () => [
      { ...item, slug: 'home', publishedAt: '2026-11-01T10:00:00.000Z' },
      { ...item, slug: 'line-chart', publishedAt: '2026-11-02T10:00:00.000Z' },
      { ...item, slug: 'heatmap', publishedAt: null },
    ],
  } satisfies ContentSource
  vi.stubEnv('SITE_URL', 'https://docs.example.com')

  expect(await sitemap()).toEqual([
    { url: 'https://docs.example.com', lastModified: '2026-11-01T10:00:00.000Z' },
    { url: 'https://docs.example.com/docs/line-chart', lastModified: '2026-11-02T10:00:00.000Z' },
    { url: 'https://docs.example.com/docs/heatmap' },
  ])
})

test('without SITE_URL the URLs use the local address', async () => {
  vi.stubEnv('SITE_URL', '')
  const entries = await sitemap()

  expect(entries.map((e) => e.url)).toContain('http://localhost:3100/docs/line-chart')
})
