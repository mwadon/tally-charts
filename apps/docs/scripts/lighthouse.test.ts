import { expect, test } from 'vitest'
// @ts-expect-error plain .mjs script without types
import { evaluate, formatTable, reportName, summarize, THRESHOLDS } from './lighthouse.mjs'

interface Summary {
  url: string
  performance: number | null
  accessibility: number | null
  seo: number | null
  lcpMs: number | null
  tbtMs: number | null
  cls: number | null
  lighthouseVersion: string
  failures: string[]
}

type Scores = { performance?: number | null; accessibility?: number | null; seo?: number | null }

function lhr(scores: Scores = {}, url = 'http://localhost:3100/') {
  const all = { performance: 0.97, accessibility: 1, seo: 1, ...scores }
  const categories: Record<string, { score: number | null }> = {}
  for (const [name, score] of Object.entries(all)) {
    if (score !== undefined) categories[name] = { score }
  }
  return {
    lighthouseVersion: '13.5.0',
    finalDisplayedUrl: url,
    categories,
    audits: {
      'largest-contentful-paint': { numericValue: 1834.6 },
      'total-blocking-time': { numericValue: 120 },
      'cumulative-layout-shift': { numericValue: 0.0123 },
      'is-crawlable': { score: 1 },
    },
  }
}

const check = (scores: Scores) => evaluate([summarize(lhr(scores))], THRESHOLDS)

test('passes when every category is above its threshold', () => {
  expect(check({})).toEqual({ ok: true, failures: [] })
})

test('reads scores as rounded percentages and the page url', () => {
  const summary: Summary = summarize(lhr({ performance: 0.915, seo: 0.96 }))
  expect(summary).toMatchObject({
    url: 'http://localhost:3100/',
    performance: 92,
    accessibility: 100,
    seo: 96,
    lighthouseVersion: '13.5.0',
    failures: [],
  })
})

test('reads LCP, TBT and CLS from numericValue', () => {
  expect(summarize(lhr())).toMatchObject({ lcpMs: 1834.6, tbtMs: 120, cls: 0.0123 })
})

test('fails on Performance 89 with the page and the category', () => {
  const { ok, failures } = check({ performance: 0.89 })
  expect(ok).toBe(false)
  expect(failures).toEqual(['http://localhost:3100/: performance 89 < 90'])
})

test('passes on Performance 90 exactly', () => {
  expect(check({ performance: 0.9 }).ok).toBe(true)
})

test('fails on Accessibility 99', () => {
  const { ok, failures } = check({ accessibility: 0.99 })
  expect(ok).toBe(false)
  expect(failures).toEqual(['http://localhost:3100/: accessibility 99 < 100'])
})

test('fails on SEO 94 and passes on SEO 95', () => {
  const low = check({ seo: 0.94 })
  expect(low.ok).toBe(false)
  expect(low.failures).toEqual(['http://localhost:3100/: seo 94 < 95'])
  expect(check({ seo: 0.95 }).ok).toBe(true)
})

test('fails on a null score and names the category', () => {
  const { ok, failures } = check({ accessibility: null })
  expect(ok).toBe(false)
  expect(failures).toEqual(['http://localhost:3100/: accessibility: no score in the report'])
})

test('fails on a missing category', () => {
  const { ok, failures } = check({ seo: undefined })
  expect(ok).toBe(false)
  expect(failures).toEqual(['http://localhost:3100/: seo: no score in the report'])
})

test('collects failures from every page', () => {
  const summaries = [
    summarize(lhr({ performance: 0.5 }, 'http://localhost:3100/')),
    summarize(lhr({ seo: 0.8 }, 'http://localhost:3100/docs/line-chart')),
  ]
  const { ok, failures } = evaluate(summaries, THRESHOLDS)
  expect(ok).toBe(false)
  expect(failures).toEqual([
    'http://localhost:3100/: performance 50 < 90',
    'http://localhost:3100/docs/line-chart: seo 80 < 95',
  ])
})

test('hints at a build without APP_ENV=production when is-crawlable fails', () => {
  const report = lhr({ seo: 0.69 })
  report.audits['is-crawlable'] = { score: 0 }
  const { failures } = evaluate([summarize(report)], THRESHOLDS)
  expect(failures).toHaveLength(2)
  expect(failures[1]).toContain('APP_ENV=production')
})

test('formatTable has a row per page with the metrics', () => {
  const table = formatTable([
    summarize(lhr({}, 'http://localhost:3100/')),
    summarize(lhr({ performance: 0.91 }, 'http://localhost:3100/docs/line-chart')),
  ])
  const lines = table.split('\n')
  expect(lines).toHaveLength(3)
  expect(lines[0]).toContain('Performance')
  expect(lines[1]).toContain('http://localhost:3100/')
  expect(lines[1]).toContain('1835 ms')
  expect(lines[1]).toContain('0.012')
  expect(lines[2]).toContain('http://localhost:3100/docs/line-chart')
  expect(lines[2]).toContain('91')
})

test('formatTable shows n/a for a missing score', () => {
  expect(formatTable([summarize(lhr({ seo: null }))])).toContain('n/a')
})

test('reportName maps a path to a file name', () => {
  expect(reportName('/')).toBe('home')
  expect(reportName('/docs/line-chart')).toBe('docs-line-chart')
})
