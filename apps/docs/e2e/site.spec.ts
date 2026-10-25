import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { collectErrors, type Theme } from './support'

interface Navigation {
  groups: { items: { slug: string }[] }[]
}

const navigation: Navigation = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../content/navigation.json'), 'utf8'),
)

/** The home page and every page in the sidebar; a new page in navigation.json is covered at once. */
const PAGES = ['/', ...navigation.groups.flatMap((g) => g.items.map((i) => `/docs/${i.slug}`))]

const THEMES: Theme[] = ['light', 'dark']

test('the page list is read from navigation.json', () => {
  expect(PAGES.length).toBeGreaterThan(1)
  expect(new Set(PAGES).size).toBe(PAGES.length)
})

for (const theme of THEMES) {
  test.describe(`site, ${theme}`, () => {
    test.use({ colorScheme: theme })

    for (const path of PAGES) {
      test(`${path} (${theme}) answers 200, logs no errors and has no axe violations`, async ({
        page,
      }) => {
        const errors = collectErrors(page)
        const response = await page.goto(`${path}?theme=${theme}`)
        expect(response?.status()).toBe(200)
        await expect(page.locator('html')).toHaveAttribute('data-ch-theme', theme)
        await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
        // Hydration and lazily loaded charts must have settled before axe looks at the DOM.
        await page.waitForLoadState('networkidle')

        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze()
        expect(
          results.violations.map((v) => ({
            id: v.id,
            impact: v.impact,
            targets: v.nodes.map((n) => n.target),
          })),
        ).toEqual([])
        expect(errors).toEqual([])
      })
    }
  })
}

test.describe('internal links', () => {
  test('every internal link answers 200 and every #id points at an element', async ({
    page,
    baseURL,
  }) => {
    test.setTimeout(180_000)
    const origin = new URL(baseURL ?? '').origin
    const paths = new Map<string, Set<string>>()
    const anchors: { target: string; id: string; from: string }[] = []

    for (const path of PAGES) {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
      const hrefs = await page.$$eval('a[href]', (as) =>
        as.map((a) => (a as HTMLAnchorElement).href),
      )
      for (const href of hrefs) {
        const url = new URL(href)
        if (url.origin !== origin) continue
        if (url.hash.length > 1) {
          anchors.push({
            target: url.pathname,
            id: decodeURIComponent(url.hash.slice(1)),
            from: path,
          })
        }
        const sources = paths.get(url.pathname) ?? new Set<string>()
        sources.add(path)
        paths.set(url.pathname, sources)
      }
    }

    const broken: string[] = []
    for (const [path, sources] of paths) {
      const status = (await page.request.get(path)).status()
      if (status !== 200) broken.push(`${path} (${status}) ← ${[...sources].join(', ')}`)
    }

    const brokenAnchors: string[] = []
    const checked = new Set<string>()
    for (const { target, id, from } of anchors) {
      const key = `${target}#${id}`
      if (checked.has(key)) continue
      checked.add(key)
      if (new URL(page.url()).pathname !== target) await page.goto(target)
      const exists = await page.evaluate((i) => document.getElementById(i) !== null, id)
      if (!exists) brokenAnchors.push(`${key} ← ${from}`)
    }

    expect(paths.size).toBeGreaterThan(PAGES.length - 1)
    expect(broken).toEqual([])
    expect(brokenAnchors).toEqual([])
  })
})
