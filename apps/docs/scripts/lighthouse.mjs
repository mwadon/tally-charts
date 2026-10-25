// Lighthouse (mobile preset) for the docs home page and /docs/line-chart, see CLAUDE.md,
// `pnpm --filter docs lighthouse`. Exit 1 when a page is under a threshold, a category has no
// score, the server does not answer or Lighthouse fails; exit 0 when every threshold is met.
//
// Measurement conditions (the script does not start the server itself):
//   1. Build with the production env, because pages, robots.txt and the canonical link are
//      prerendered at build time:
//        pnpm build && APP_ENV=production SITE_URL=http://localhost:3100 pnpm --filter docs build
//      APP_ENV=production turns indexing on. Without it every page is noindex and robots.txt says
//      `Disallow: /`, which fails the `is-crawlable` and `robots-txt` audits and lowers SEO for a
//      reason unrelated to the page. SITE_URL makes the canonical link point at the measured host
//      (Lighthouse compares the canonical with the host). No audit is skipped and no threshold
//      lowered. Production hides block errors, but fixtures have none (`check:content`).
//   2. Nothing else on port 3100 (`lsof -i :3100`), then in another terminal, on fixtures
//      (no CMS_BASE_URL), with the same env:
//        APP_ENV=production SITE_URL=http://localhost:3100 pnpm --filter docs start
//   3. `pnpm --filter docs lighthouse`. Chrome: $CHROME_PATH, otherwise the Chromium from
//      Playwright (`chromium.executablePath()`), started with `--headless=new` by chrome-launcher.
//      $LIGHTHOUSE_BASE_URL replaces http://localhost:3100.
// Reports (<name>.report.html and <name>.report.json) go to apps/docs/.lighthouse/ (gitignored).
// Scores depend on the machine (simulated throttling); compare runs from the same one.
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export const BASE_URL = process.env.LIGHTHOUSE_BASE_URL || 'http://localhost:3100'
export const PAGES = ['/', '/docs/line-chart']
export const THRESHOLDS = { performance: 90, accessibility: 100, seo: 95 }
export const REPORT_DIR = path.join(appDir, '.lighthouse')

const CATEGORIES = Object.keys(THRESHOLDS)
const START_COMMAND =
  'APP_ENV=production SITE_URL=http://localhost:3100 pnpm --filter docs start ' +
  '(after pnpm build && APP_ENV=production SITE_URL=http://localhost:3100 pnpm --filter docs build)'

const metric = (lhr, id) => lhr.audits?.[id]?.numericValue ?? null

/**
 * Reads the scores (0-100, rounded), LCP/TBT/CLS and the Lighthouse version from an LHR. A missing
 * category or a `null` score is a failure of that category, never a pass.
 */
export function summarize(lhr) {
  const summary = {
    url: lhr.finalDisplayedUrl ?? lhr.finalUrl ?? lhr.requestedUrl ?? '',
    performance: null,
    accessibility: null,
    seo: null,
    lcpMs: metric(lhr, 'largest-contentful-paint'),
    tbtMs: metric(lhr, 'total-blocking-time'),
    cls: metric(lhr, 'cumulative-layout-shift'),
    lighthouseVersion: lhr.lighthouseVersion ?? '',
    notCrawlable: lhr.audits?.['is-crawlable']?.score === 0,
    failures: [],
  }
  for (const name of CATEGORIES) {
    const score = lhr.categories?.[name]?.score
    if (typeof score === 'number') summary[name] = Math.round(score * 100)
    else summary.failures.push(`${name}: no score in the report`)
  }
  return summary
}

/** Pass/fail against the thresholds (a score equal to the threshold passes). */
export function evaluate(summaries, thresholds = THRESHOLDS) {
  const failures = []
  for (const summary of summaries) {
    for (const message of summary.failures) failures.push(`${summary.url}: ${message}`)
    for (const [name, min] of Object.entries(thresholds)) {
      const score = summary[name]
      if (typeof score === 'number' && score < min) {
        failures.push(`${summary.url}: ${name} ${score} < ${min}`)
      }
    }
    if (summary.notCrawlable && summary.seo !== null && summary.seo < thresholds.seo) {
      failures.push(
        `${summary.url}: audit is-crawlable failed, the site was probably built or started without APP_ENV=production`,
      )
    }
  }
  return { ok: failures.length === 0, failures }
}

const score = (value) => (value === null ? 'n/a' : String(value))
const ms = (value) => (value === null ? 'n/a' : `${Math.round(value)} ms`)
const cls = (value) => (value === null ? 'n/a' : value.toFixed(3))

/** Plain text table: one row per page. */
export function formatTable(summaries) {
  const rows = [
    ['Page', 'Performance', 'Accessibility', 'SEO', 'LCP', 'TBT', 'CLS'],
    ...summaries.map((s) => [
      s.url,
      score(s.performance),
      score(s.accessibility),
      score(s.seo),
      ms(s.lcpMs),
      ms(s.tbtMs),
      cls(s.cls),
    ]),
  ]
  const widths = rows[0].map((_, i) => Math.max(...rows.map((row) => row[i].length)))
  return rows
    .map((row) =>
      row
        .map((cell, i) => cell.padEnd(widths[i]))
        .join('  ')
        .trimEnd(),
    )
    .join('\n')
}

/** File name (without extension) of a page's report: `/` is `home`. */
export function reportName(pagePath) {
  const name = pagePath.replace(/^\/+|\/+$/g, '').replace(/\//g, '-')
  return name === '' ? 'home' : name
}

async function assertServer() {
  try {
    const response = await fetch(`${BASE_URL}/`, { signal: AbortSignal.timeout(10_000) })
    if (response.ok) return
    throw new Error(`HTTP ${response.status}`)
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw new Error(`No server at ${BASE_URL} (${reason}). Start it first: ${START_COMMAND}`)
  }
}

async function main() {
  await assertServer()
  const [{ default: lighthouse }, { launch }, { chromium }] = await Promise.all([
    import('lighthouse'),
    import('chrome-launcher'),
    import('@playwright/test'),
  ])
  mkdirSync(REPORT_DIR, { recursive: true })
  const chrome = await launch({
    chromePath: process.env.CHROME_PATH || chromium.executablePath(),
    chromeFlags: ['--headless=new'],
  })
  const summaries = []
  try {
    for (const page of PAGES) {
      const result = await lighthouse(`${BASE_URL}${page}`, {
        port: chrome.port,
        output: ['html', 'json'],
        onlyCategories: CATEGORIES,
        logLevel: 'error',
      })
      if (!result) throw new Error(`Lighthouse returned no result for ${page}`)
      const [html, json] = result.report
      writeFileSync(path.join(REPORT_DIR, `${reportName(page)}.report.html`), html)
      writeFileSync(path.join(REPORT_DIR, `${reportName(page)}.report.json`), json)
      summaries.push(summarize(result.lhr))
    }
  } finally {
    chrome.kill()
  }
  console.log(formatTable(summaries))
  console.log(`\nLighthouse ${summaries[0].lighthouseVersion}, mobile preset, ${BASE_URL}`)
  console.log(`Reports: ${path.relative(process.cwd(), REPORT_DIR) || REPORT_DIR}`)
  const { ok, failures } = evaluate(summaries)
  if (!ok) {
    console.error(
      `\nThresholds not met (${Object.entries(THRESHOLDS)
        .map(([k, v]) => `${k} ≥ ${v}`)
        .join(', ')}):`,
    )
    for (const failure of failures) console.error(`- ${failure}`)
    process.exit(1)
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then(
    () => process.exit(0),
    (error) => {
      console.error(error instanceof Error ? error.message : error)
      process.exit(1)
    },
  )
}
