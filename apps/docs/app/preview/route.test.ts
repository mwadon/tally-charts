// @vitest-environment node
import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { GET } from './route'

const enable = vi.fn()

vi.mock('next/headers', () => ({ draftMode: vi.fn() }))
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`)
  }),
}))

const request = (query: string, headers: Record<string, string> = {}) =>
  new Request(`http://localhost/preview?${query}`, { headers })

beforeEach(() => {
  vi.stubEnv('PREVIEW_SECRET', 's3cret')
  vi.mocked(draftMode).mockResolvedValue({ enable } as never)
})

afterEach(() => {
  vi.unstubAllEnvs()
  enable.mockClear()
  vi.mocked(redirect).mockClear()
})

function expectRejected(response: Response, status: number) {
  expect(response.status).toBe(status)
  expect(response.headers.get('location')).toBeNull()
  expect(enable).not.toHaveBeenCalled()
  expect(redirect).not.toHaveBeenCalled()
}

test.each([
  ['unset', undefined],
  ['empty', ''],
])('a %s PREVIEW_SECRET rejects everything, even an empty secret', async (_name, value) => {
  vi.stubEnv('PREVIEW_SECRET', value)

  const attempts = [
    request('slug=line-chart'),
    request('slug=line-chart&secret='),
    request('slug=line-chart', { authorization: 'Bearer ' }),
    request('slug=line-chart', { 'x-preview-secret': '' }),
  ]
  for (const attempt of attempts) expectRejected(await GET(attempt), 401)
})

test.each([
  ['no secret', request('slug=line-chart')],
  ['a wrong ?secret=', request('slug=line-chart&secret=nope')],
  ['a wrong secret of the right length', request('slug=line-chart&secret=s3creX')],
  ['a wrong bearer token', request('slug=line-chart', { authorization: 'Bearer nope' })],
  ['a wrong x-preview-secret', request('slug=line-chart', { 'x-preview-secret': 'nope' })],
  ['a bare secret without Bearer', request('slug=line-chart', { authorization: 's3cret' })],
])('%s is 401', async (_name, req) => {
  expectRejected(await GET(req), 401)
})

test.each(['../x', 'a/b', 'A', 'https://evil.com', '//evil.com', '/docs/x', 'a--b', ''])(
  'the slug %j with the right secret is 400',
  async (slug) => {
    expectRejected(await GET(request(`slug=${encodeURIComponent(slug)}&secret=s3cret`)), 400)
  },
)

test('a missing slug with the right secret is 400', async () => {
  expectRejected(await GET(request('secret=s3cret')), 400)
})

test('a wrong secret is 401 before the slug is looked at', async () => {
  expectRejected(await GET(request('slug=../x&secret=nope')), 401)
})

test.each([
  ['?secret=', request('slug=line-chart&secret=s3cret')],
  ['Authorization: Bearer', request('slug=line-chart', { authorization: 'Bearer s3cret' })],
  ['x-preview-secret', request('slug=line-chart', { 'x-preview-secret': 's3cret' })],
])('the right secret via %s enables draft mode and redirects to the page', async (_name, req) => {
  await expect(GET(req)).rejects.toThrow('NEXT_REDIRECT /docs/line-chart')

  expect(enable).toHaveBeenCalledTimes(1)
  expect(redirect).toHaveBeenCalledWith('/docs/line-chart')
})

test('slug=home redirects to /', async () => {
  await expect(GET(request('slug=home&secret=s3cret'))).rejects.toThrow('NEXT_REDIRECT /')

  expect(enable).toHaveBeenCalledTimes(1)
  expect(redirect).toHaveBeenCalledWith('/')
})

test('a redirect or next parameter is ignored', async () => {
  const query = 'slug=line-chart&secret=s3cret&redirect=https://evil.com&next=//evil.com'
  await expect(GET(request(query))).rejects.toThrow('NEXT_REDIRECT /docs/line-chart')

  expect(vi.mocked(redirect).mock.calls).toEqual([['/docs/line-chart']])
})

test('only GET is exported', async () => {
  const route = await import('./route')
  expect(Object.keys(route)).toEqual(['GET'])
})
