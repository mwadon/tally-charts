import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// The one place with the address of the docs site. homepage, the package README and the changeset
// migration links must all use it (checkDocsUrl, run by `pnpm test:scripts`, guards that).
export const DOCS_URL = 'https://tally-charts-docs.vercel.app'

// Changesets (names without .md) that end with "See the migration guide: <DOCS_URL>/docs/migration-1-0".
export const MIGRATION_CHANGESETS = [
  'ranked-bars-solid-fill',
  'required-chart-name',
  'line-breaks-on-invalid-date',
  'stability-docs',
]

const VERCEL_URL = /https?:\/\/([a-z0-9.-]+\.vercel\.app)/gi
const DOCS_HOST = new URL(DOCS_URL).host
const README = 'packages/tally-charts/README.md'
const PACKAGE_JSON = 'packages/tally-charts/package.json'
const STABILITY = 'docs/stability.md'

function read(root, file, problems) {
  try {
    return readFileSync(join(root, file), 'utf8')
  } catch {
    problems.push(`${file}: file is missing or unreadable`)
    return null
  }
}

function checkHosts(file, text, problems) {
  for (const match of text.matchAll(VERCEL_URL)) {
    const host = match[1].toLowerCase()
    if (host !== DOCS_HOST) {
      problems.push(`${file}: host ${host} is not the docs host ${DOCS_HOST}`)
    }
  }
}

/** Returns `file: problem` messages for every place where the docs address diverges from DOCS_URL. */
export function checkDocsUrl(root) {
  const problems = []
  const changesetDir = join(root, '.changeset')
  const files = [README, PACKAGE_JSON, STABILITY]
  try {
    for (const name of readdirSync(changesetDir).sort()) {
      if (name.endsWith('.md') && name !== 'README.md') files.push(`.changeset/${name}`)
    }
  } catch {
    problems.push('.changeset: directory is missing or unreadable')
  }
  for (const name of MIGRATION_CHANGESETS) {
    const file = `.changeset/${name}.md`
    if (!files.includes(file)) files.push(file)
  }

  const texts = new Map()
  for (const file of files) {
    const text = read(root, file, problems)
    if (text !== null) {
      texts.set(file, text)
      checkHosts(file, text, problems)
    }
  }

  const pkg = texts.get(PACKAGE_JSON)
  if (pkg !== undefined) {
    let homepage
    try {
      homepage = JSON.parse(pkg).homepage
    } catch {
      problems.push(`${PACKAGE_JSON}: not valid JSON`)
    }
    if (homepage !== DOCS_URL) {
      problems.push(
        `${PACKAGE_JSON}: homepage is ${JSON.stringify(homepage)}, expected ${DOCS_URL}`,
      )
    }
  }

  const readme = texts.get(README)
  if (readme !== undefined) {
    for (const link of [DOCS_URL, `${DOCS_URL}/docs/stability`, `${DOCS_URL}/docs/migration-1-0`]) {
      if (!readme.includes(link)) problems.push(`${README}: link ${link} is missing`)
    }
  }

  const migration = `${DOCS_URL}/docs/migration-1-0`
  for (const name of MIGRATION_CHANGESETS) {
    const file = `.changeset/${name}.md`
    const text = texts.get(file)
    if (text !== undefined && !text.includes(migration)) {
      problems.push(`${file}: link ${migration} is missing`)
    }
  }

  return problems
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = process.argv[2] ?? resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
  const problems = checkDocsUrl(root)
  if (problems.length > 0) {
    for (const problem of problems) console.error(problem)
    process.exit(1)
  }
  console.log(`docs URL ${DOCS_URL}: OK`)
}
