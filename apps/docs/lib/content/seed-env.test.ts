// @vitest-environment node
import { expect, test } from 'vitest'
import { readSeedEnv } from './seed-env'

test('returns the base url and the admin key', () => {
  expect(readSeedEnv({ CMS_BASE_URL: 'https://cms.example', CMS_ADMIN_API_KEY: 'k' })).toEqual({
    baseUrl: 'https://cms.example',
    apiKey: 'k',
  })
})

test('a missing key names CMS_ADMIN_API_KEY and its scopes', () => {
  expect(() => readSeedEnv({ CMS_BASE_URL: 'https://cms.example' })).toThrow(
    /CMS_ADMIN_API_KEY is not set: create an admin key in glökki \(Settings → API Keys, scopes mcp:connect, admin:pages:read, admin:pages:write, admin:pages:publish\)/,
  )
})

test('a missing base url names CMS_BASE_URL, an empty value counts as missing', () => {
  expect(() => readSeedEnv({ CMS_ADMIN_API_KEY: 'k' })).toThrow(/CMS_BASE_URL is not set/)
  expect(() => readSeedEnv({ CMS_BASE_URL: '', CMS_ADMIN_API_KEY: 'k' })).toThrow(/CMS_BASE_URL/)
})

test('when both are missing the error names both', () => {
  const message = (() => {
    try {
      readSeedEnv({})
    } catch (error) {
      return String(error)
    }
  })()

  expect(message).toContain('CMS_BASE_URL is not set')
  expect(message).toContain('CMS_ADMIN_API_KEY is not set')
})
