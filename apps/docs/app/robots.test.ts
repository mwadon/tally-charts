import { afterEach, expect, test, vi } from 'vitest'
import robots from './robots'

afterEach(() => vi.unstubAllEnvs())

test.each([undefined, '', 'preview'])(
  'APP_ENV=%s disallows everything and has no sitemap',
  (env) => {
    vi.stubEnv('APP_ENV', env as string)
    const result = robots()

    expect(result.rules).toEqual({ userAgent: '*', disallow: '/' })
    expect(result.sitemap).toBeUndefined()
  },
)

test('production allows crawling and points at the sitemap', () => {
  vi.stubEnv('APP_ENV', 'production')
  vi.stubEnv('SITE_URL', 'https://docs.example.com/')
  const result = robots()

  expect(result.rules).toEqual({ userAgent: '*', allow: '/' })
  expect(result.sitemap).toBe('https://docs.example.com/sitemap.xml')
})
