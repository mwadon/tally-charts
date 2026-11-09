// @vitest-environment node
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { GET, HEAD } from './route'

const ctx = (...path: string[]) => ({ params: Promise.resolve({ path }) })
const request = (path: string, init?: RequestInit) =>
  new Request(`http://localhost:3100/cdn/${path}`, init)

let fetchMock: ReturnType<typeof vi.fn>
let errors: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  fetchMock = vi.fn(
    async () => new Response('png', { status: 200, headers: { 'content-type': 'image/png' } }),
  )
  vi.stubGlobal('fetch', fetchMock)
  errors = vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  errors.mockRestore()
})

const configure = () => {
  vi.stubEnv('CMS_BASE_URL', 'https://cms.test/')
  vi.stubEnv('CMS_TENANT', 'acme')
  vi.stubEnv('CMS_API_KEY', 'key-1')
}

test('without CMS_BASE_URL it is a quiet 404: nothing fetched, nothing logged', async () => {
  vi.stubEnv('CMS_BASE_URL', '')

  for (const handler of [GET, HEAD]) {
    const response = await handler(request('a.png'), ctx('a.png'))
    expect(response.status).toBe(404)
  }
  expect(fetchMock).not.toHaveBeenCalled()
  expect(errors).not.toHaveBeenCalled()
})

test('with the CMS configured it proxies the asset with the key and the tenant', async () => {
  configure()

  const response = await GET(request('img/a.png'), ctx('img', 'a.png'))

  expect(response.status).toBe(200)
  expect(await response.text()).toBe('png')
  const [url, init] = fetchMock.mock.calls[0] ?? []
  expect(String(url)).toBe('https://cms.test/api/v1/delivery/assets/img/a.png')
  expect((init as RequestInit).headers).toMatchObject({
    Authorization: 'Bearer key-1',
    'X-Tenant-Slug': 'acme',
  })
})

test.each([
  [['..', 'pages']],
  [['img', '..', '..', 'pages']],
  [['.', 'a.png']],
  [['img', '.']],
  // Next hands the segments over decoded once; a second encoding must not get through either.
  [['%2e%2e', 'pages']],
  [['%2E%2e', 'pages']],
  [['%2e', 'a.png']],
  [['.%2E', 'pages']],
  [['%zz']],
])('a dot segment in %j is a 400 and nothing is fetched', async (path) => {
  configure()

  const response = await GET(request(path.join('/')), ctx(...path))

  expect(response.status).toBe(400)
  expect(fetchMock).not.toHaveBeenCalled()
})

test('dots inside a file name are fine', async () => {
  configure()

  expect((await GET(request('a..b/.c.png'), ctx('a..b', '.c.png'))).status).toBe(200)
  expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
    'https://cms.test/api/v1/delivery/assets/a..b/.c.png',
  )
})
