import { timingSafeEqual } from 'node:crypto'

/** Constant-time comparison; strings of different length never match. */
export function secretMatches(given: string, expected: string) {
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** The secret of a request: `Authorization: Bearer <secret>`, else the `headerName` header, else `''`. */
export function secretFromHeaders(headers: Headers, headerName: string) {
  const bearer = headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1]
  return bearer ?? headers.get(headerName) ?? ''
}
