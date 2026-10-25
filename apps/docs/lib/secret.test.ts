// @vitest-environment node
import { expect, test } from 'vitest'
import { secretFromHeaders, secretMatches } from './secret'

test('secretMatches accepts only the same string', () => {
  expect(secretMatches('s3cret', 's3cret')).toBe(true)
  expect(secretMatches('s3creX', 's3cret')).toBe(false)
  expect(secretMatches('s3cre', 's3cret')).toBe(false)
  expect(secretMatches('', 's3cret')).toBe(false)
})

test('secretFromHeaders prefers Bearer, then the named header, then an empty string', () => {
  const headers = (init: Record<string, string>) => new Headers(init)

  expect(secretFromHeaders(headers({ authorization: 'Bearer a', 'x-s': 'b' }), 'x-s')).toBe('a')
  expect(secretFromHeaders(headers({ authorization: 'bearer a' }), 'x-s')).toBe('a')
  expect(secretFromHeaders(headers({ 'x-s': 'b' }), 'x-s')).toBe('b')
  expect(secretFromHeaders(headers({ authorization: 'a' }), 'x-s')).toBe('')
  expect(secretFromHeaders(headers({}), 'x-s')).toBe('')
})
