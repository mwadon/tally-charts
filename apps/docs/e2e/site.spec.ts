import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { collectErrors, revealCharts, type Theme } from './support'

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
        // Charts below the fold mount on scroll; axe has to see them too.
        await revealCharts(page)
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

test.describe('site, 320 px', () => {
  test.use({ viewport: { width: 320, height: 812 } })

  for (const path of PAGES) {
    test(`${path} at 320 px does not scroll horizontally`, async ({ page }) => {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
      await page.waitForLoadState('networkidle')
      // Lazily mounted charts further down must be in place before the width is measured.
      await revealCharts(page)
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForLoadState('networkidle')

      const measure = () =>
        page.evaluate(() => {
          const width = document.documentElement.clientWidth
          const wide = [...document.querySelectorAll('body *')]
            .filter((el) => el.getBoundingClientRect().right > width + 0.5)
            .map((el) => {
              const cls = typeof el.className === 'string' && el.className ? `.${el.className}` : ''
              return `${el.tagName.toLowerCase()}${cls} right=${Math.round(el.getBoundingClientRect().right)} "${(el.textContent ?? '').trim().slice(0, 40)}"`
            })
          return {
            root: [document.documentElement.scrollWidth, width],
            body: [document.body.scrollWidth, document.body.clientWidth],
            wide: wide.slice(0, 15),
          }
        })
      const sizes = await measure()
      // The list of elements sticking out is the diagnosis when this fails on another platform.
      expect(sizes.wide.length > 0 && sizes.root[0]! > sizes.root[1]! ? sizes.wide : []).toEqual([])
      expect(sizes.root[0]).toBeLessThanOrEqual(sizes.root[1] ?? 0)
      expect(sizes.body[0]).toBeLessThanOrEqual(sizes.body[1] ?? 0)
    })
  }
})

test.describe('skip link', () => {
  test.use({ viewport: { width: 1280, height: 900 } })

  for (const path of ['/', '/docs/line-chart']) {
    test(`${path}: the first Tab reaches the skip link and Enter moves to #main`, async ({
      page,
    }) => {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
      await page.waitForLoadState('networkidle')

      await page.keyboard.press('Tab')
      const skip = page.locator('.skip-link')
      await expect(skip).toBeFocused()
      await expect(skip).toBeInViewport()
      const outline = await skip.evaluate((el) => {
        const cs = getComputedStyle(el)
        return { style: cs.outlineStyle, width: Number.parseFloat(cs.outlineWidth) }
      })
      expect(outline.style).not.toBe('none')
      expect(outline.width).toBeGreaterThanOrEqual(2)

      await page.keyboard.press('Enter')
      await expect
        .poll(() =>
          page.evaluate(
            () => location.hash === '#main' || !!document.activeElement?.closest('#main'),
          ),
        )
        .toBe(true)
    })
  }
})

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
