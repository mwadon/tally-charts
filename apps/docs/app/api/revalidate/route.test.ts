// @vitest-environment node
import { revalidateTag } from 'next/cache'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { POST } from './route'

vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }))

const request = (headers: Record<string, string> = {}) =>
  new Request('http://localhost/api/revalidate', { method: 'POST', headers })

beforeEach(() => {
  vi.stubEnv('REVALIDATE_SECRET', 's3cret')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.mocked(revalidateTag).mockClear()
})

test('no secret is 401 and does not revalidate', async () => {
  const response = await POST(request())

  expect(response.status).toBe(401)
  expect(revalidateTag).not.toHaveBeenCalled()
})

test.each([
  ['a wrong bearer token', { authorization: 'Bearer nope' }],
  ['a wrong bearer token of the right length', { authorization: 'Bearer s3creX' }],
  ['a wrong x-revalidate-secret', { 'x-revalidate-secret': 'nope' }],
  ['a bare secret without Bearer', { authorization: 's3cret' }],
])('%s is 401', async (_name, headers) => {
  expect((await POST(request(headers))).status).toBe(401)
  expect(revalidateTag).not.toHaveBeenCalled()
})

test.each([
  ['unset', undefined],
  ['empty', ''],
])('a %s REVALIDATE_SECRET rejects everything, even an empty header', async (_name, value) => {
  vi.stubEnv('REVALIDATE_SECRET', value)

  const attempts: Record<string, string>[] = [
    {},
    { authorization: 'Bearer ' },
    { 'x-revalidate-secret': '' },
  ]
  for (const headers of attempts) {
    expect((await POST(request(headers))).status).toBe(401)
  }
  expect(revalidateTag).not.toHaveBeenCalled()
})

test('the right bearer token is 200 and revalidates the cms tag', async () => {
  const response = await POST(request({ authorization: 'Bearer s3cret' }))

  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({ revalidated: true })
  expect(revalidateTag).toHaveBeenCalledTimes(1)
  expect(vi.mocked(revalidateTag).mock.calls[0]?.[0]).toBe('cms')
})

test('the x-revalidate-secret header works too', async () => {
  const response = await POST(request({ 'x-revalidate-secret': 's3cret' }))

  expect(response.status).toBe(200)
  expect(vi.mocked(revalidateTag).mock.calls[0]?.[0]).toBe('cms')
})

test('only POST is exported', async () => {
  const route = await import('./route')
  expect(Object.keys(route)).toEqual(['POST'])
})
