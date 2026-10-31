/**
 * `pnpm --filter docs seed [--dry-run] [--content-dir <dir>]`: creates or updates the pages of
 * `content/*.json` in glokki through its MCP server and publishes them. A second run changes
 * nothing. Needs `CMS_BASE_URL` and `CMS_ADMIN_API_KEY`, also with `--dry-run`: the plan is
 * computed from what the CMS holds, which is only read. Pages that have no fixture are left alone.
 */
import path from 'node:path'
import { parseArgs } from 'node:util'
import { createGlokkiMcpClient } from '../lib/content/glokki-mcp'
import { loadNavigationConfig } from '../lib/content/navigation-config'
import { applySeed, formatPlan, planSeed, readFixtures, readRemote } from '../lib/content/seed'
import { readSeedEnv } from '../lib/content/seed-env'

// pnpm may forward the `--` of `pnpm seed -- --flag` to the script.
const argv = process.argv.slice(2).filter((arg, i) => !(i === 0 && arg === '--'))
const { values } = parseArgs({
  args: argv,
  options: {
    'dry-run': { type: 'boolean', default: false },
    'content-dir': { type: 'string' },
  },
})
const dryRun = values['dry-run']
const contentDir = values['content-dir'] ? path.resolve(values['content-dir']) : undefined

try {
  const { baseUrl, apiKey } = readSeedEnv(process.env)
  const client = createGlokkiMcpClient({
    baseUrl,
    apiKey,
    onRateLimit: (what, seconds) =>
      console.log(`seed: ${what} is rate limited, waiting ${seconds}s`),
  })

  const fixtures = await readFixtures(contentDir)
  const navigation = await loadNavigationConfig(contentDir)
  const plan = planSeed(fixtures, navigation, await readRemote(client, fixtures))
  console.log(formatPlan(plan))

  if (dryRun) {
    console.log('seed: dry run, nothing was written')
  } else {
    await applySeed(client, plan, {
      onAction: ({ kind, slug }) => console.log(`seed: ${kind} ${slug}`),
    })
    console.log('seed: done')
  }
} catch (error) {
  console.error(`seed: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
}
