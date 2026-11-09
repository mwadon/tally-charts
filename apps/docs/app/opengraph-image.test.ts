// @vitest-environment node
import { expect, test } from 'vitest'
import { SITE_NAME, SITE_TAGLINE } from '../lib/metadata'
import OpengraphImage, { alt, contentType, size } from './opengraph-image'

test('the image is 1200×630 PNG and its alt text has the site name and the tagline', () => {
  expect(size).toEqual({ width: 1200, height: 630 })
  expect(contentType).toBe('image/png')
  expect(alt).toContain(SITE_NAME)
  expect(alt).toContain(SITE_TAGLINE)
})

test('it renders to a PNG', async () => {
  const response = OpengraphImage()
  const bytes = new Uint8Array(await response.arrayBuffer())

  expect(response.headers.get('content-type')).toBe('image/png')
  // The PNG signature.
  expect([...bytes.slice(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47])
  expect(bytes.length).toBeGreaterThan(5_000)
}, 30_000)

test('the tagline is the headline of the home page', async () => {
  const { default: home } = await import('../content/home.json')
  const hero = home.componentTree.find((node) => node.type === 'hero')

  expect((hero?.props as { title?: string } | undefined)?.title).toBe(SITE_TAGLINE)
})
