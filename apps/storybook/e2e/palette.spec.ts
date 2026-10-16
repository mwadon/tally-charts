import { expect, type Page, test } from '@playwright/test'
import { open } from './stories'

// data-ch-palette="vivid" restores three pre-0.6b light colors. The cascade (media query, theme
// blocks re-declaring tokens on descendants) can't be judged in jsdom, so each placement of the
// palette against the theme is computed here, in the browser.

const NORMAL = { light: ['#be802f', '#22a363', '#8e8e95'], dark: ['#ffb24d', '#3ccf86', '#7c7c86'] }
const VIVID = ['#f1a23b', '#23a866', '#a3a3ab']
const TOKENS = ['--ch-warn', '--ch-gain', '--ch-neutral']

/** The three tokens on `#t` of a fragment injected into a story page, optionally with `html` attrs. */
async function tokens(
  page: Page,
  markup: string,
  scheme: 'light' | 'dark' = 'light',
  html: Record<string, string> = {},
) {
  await page.emulateMedia({ colorScheme: scheme })
  await open(page, 'charts-barchart--horizontal')
  return page.evaluate(
    ({ markup, html, tokens }) => {
      for (const [k, v] of Object.entries(html)) document.documentElement.setAttribute(k, v)
      document.body.insertAdjacentHTML('beforeend', markup)
      const el = document.getElementById('t') as HTMLElement
      return tokens.map((t) => getComputedStyle(el).getPropertyValue(t).trim())
    },
    { markup, html, tokens: TOKENS },
  )
}

const V = 'data-ch-palette="vivid"'
const same = (theme: 'light' | 'dark') => (theme === 'light' ? VIVID : NORMAL.dark)

test.describe('data-ch-palette="vivid"', () => {
  test('on <html> with a light system: vivid light', async ({ page }) => {
    expect(
      await tokens(page, '<div id="t"></div>', 'light', { 'data-ch-palette': 'vivid' }),
    ).toEqual(VIVID)
  })

  test('on <html> with a dark system: the normal dark values', async ({ page }) => {
    expect(
      await tokens(page, '<div id="t"></div>', 'dark', { 'data-ch-palette': 'vivid' }),
    ).toEqual(NORMAL.dark)
  })

  test('without the palette: the normal values (control)', async ({ page }) => {
    expect(await tokens(page, '<div data-ch-theme="light"><div id="t"></div></div>')).toEqual(
      NORMAL.light,
    )
    expect(await tokens(page, '<div data-ch-theme="dark"><div id="t"></div></div>')).toEqual(
      NORMAL.dark,
    )
  })

  for (const scheme of ['light', 'dark'] as const) {
    test(`an ancestor with a themed descendant, ${scheme} system`, async ({ page }) => {
      const t = (theme: string) =>
        `<div ${V}><div data-ch-theme="${theme}"><div id="t"></div></div></div>`
      expect(await tokens(page, t('light'), scheme)).toEqual(VIVID)
    })
    test(`an ancestor with a dark descendant, ${scheme} system`, async ({ page }) => {
      const markup = `<div ${V}><div data-ch-theme="dark"><div id="t"></div></div></div>`
      expect(await tokens(page, markup, scheme)).toEqual(NORMAL.dark)
    })
    test(`the palette on a plain descendant of a themed ancestor, ${scheme} system`, async ({
      page,
    }) => {
      for (const theme of ['light', 'dark'] as const) {
        const markup = `<div data-ch-theme="${theme}"><div ${V}><div id="t"></div></div></div>`
        expect(await tokens(page, markup, scheme)).toEqual(same(theme))
      }
    })
    test(`the palette and the theme on one element, ${scheme} system`, async ({ page }) => {
      for (const theme of ['light', 'dark'] as const) {
        const markup = `<div ${V} data-ch-theme="${theme}"><div id="t"></div></div>`
        expect(await tokens(page, markup, scheme)).toEqual(same(theme))
      }
    })
    test(`the palette on a descendant of a themed ancestor that itself has a theme, ${scheme} system`, async ({
      page,
    }) => {
      const markup = `<div data-ch-theme="light"><div ${V} data-ch-theme="dark"><div id="t"></div></div></div>`
      expect(await tokens(page, markup, scheme)).toEqual(NORMAL.dark)
    })
  }

  test('the palette on a plain descendant follows the system theme', async ({ page }) => {
    const markup = `<div><div ${V}><div id="t"></div></div></div>`
    expect(await tokens(page, markup, 'light')).toEqual(VIVID)
    expect(await tokens(page, markup, 'dark')).toEqual(NORMAL.dark)
  })

  test('a user override on a descendant still wins', async ({ page }) => {
    const markup = `<div ${V}><div data-ch-theme="light" style="--ch-warn: red"><div id="t"></div></div></div>`
    expect(await tokens(page, markup)).toEqual(['red', VIVID[1], VIVID[2]])
    const own = `<div ${V} style="--ch-warn: red"><div id="t"></div></div>`
    expect(await tokens(page, own)).toEqual(['red', VIVID[1], VIVID[2]])
  })

  test('leaves every other token alone', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await open(page, 'charts-barchart--horizontal')
    const read = (attr: string) =>
      page.evaluate((attr) => {
        document.body.insertAdjacentHTML('beforeend', `<div id="t" ${attr}></div>`)
        const style = getComputedStyle(document.getElementById('t') as Element)
        const all = [
          '--ch-accent',
          '--ch-accent-soft',
          '--ch-loss',
          '--ch-ink',
          '--ch-ink-muted',
          '--ch-grid',
          '--ch-surface',
          '--ch-tooltip-bg',
        ]
        const out = all.map((t) => style.getPropertyValue(t).trim())
        document.getElementById('t')?.remove()
        return out
      }, attr)
    expect(await read('data-ch-palette="vivid"')).toEqual(await read(''))
  })

  test('forced colors still map the tokens onto system colors', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active', colorScheme: 'light' })
    await open(page, 'charts-barchart--horizontal')
    const warn = await page.evaluate(() => {
      document.body.insertAdjacentHTML(
        'beforeend',
        '<div data-ch-palette="vivid" data-ch-theme="light"><i id="t"></i></div>',
      )
      const el = document.getElementById('t') as Element
      return getComputedStyle(el).getPropertyValue('--ch-warn').trim()
    })
    expect(warn).toBe('CanvasText')
  })

  test('the Vivid story puts the palette on the canvas and renders the vivid tokens', async ({
    page,
  }) => {
    await open(page, 'charts-barchart--vivid', 'light')
    const canvas = page.locator('#storybook-root .sb-canvas')
    await expect(canvas).toHaveAttribute('data-ch-palette', 'vivid')
    const warn = await canvas.evaluate((el) =>
      getComputedStyle(el).getPropertyValue('--ch-warn').trim(),
    )
    expect(warn).toBe(VIVID[0])
    // The other stories carry no palette attribute at all.
    await open(page, 'charts-barchart--light', 'light')
    await expect(page.locator('#storybook-root .sb-canvas')).not.toHaveAttribute('data-ch-palette')
  })
})
