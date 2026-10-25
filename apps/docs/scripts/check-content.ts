/**
 * `pnpm --filter docs check:content [--content-dir <dir>] [--require-coverage]`: validates the
 * pages of the fixtures (and of glökki, when `CMS_BASE_URL` is set). Needs `pnpm build`: the
 * examples import `tally-charts` from `dist`.
 */
import path from 'node:path'
import { parseArgs } from 'node:util'
import { formatIssue } from '../lib/content/check'
import { checkSources, selectSources } from '../lib/content/check-sources'

// pnpm may forward the `--` of `pnpm check:content -- --flag` to the script.
const argv = process.argv.slice(2).filter((arg, i) => !(i === 0 && arg === '--'))
const { values } = parseArgs({
  args: argv,
  options: {
    'content-dir': { type: 'string' },
    'require-coverage': { type: 'boolean', default: false },
  },
})

const requireCoverage =
  values['require-coverage'] ||
  ['1', 'true'].includes(process.env.CHECK_CONTENT_REQUIRE_COVERAGE ?? '')
const contentDir = values['content-dir'] ? path.resolve(values['content-dir']) : undefined

let reports: Awaited<ReturnType<typeof checkSources>>
try {
  reports = await checkSources(selectSources(process.env, contentDir), { requireCoverage })
} catch (error) {
  console.error(`check:content: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
}

let errorCount = 0
let pageCount = 0
for (const { name, pages, errors, coverage } of reports) {
  pageCount += pages
  errorCount += errors.length
  for (const issue of errors) console.error(`${name}: ${formatIssue(issue)}`)

  const total = coverage.covered.length + coverage.missing.length
  console.log(`${name}: API coverage: ${coverage.covered.length}/${total}`)
  if (coverage.missing.length > 0) {
    console.log(`${name}: no PropsTable for ${coverage.missing.join(', ')}`)
  }
}

const summary = `check:content: ${errorCount} errors in ${pageCount} pages`
if (errorCount > 0) {
  console.error(summary)
  process.exit(1)
}
console.log(summary)
