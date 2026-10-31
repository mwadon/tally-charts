import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { after, describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { checkDocsUrl, DOCS_URL, MIGRATION_CHANGESETS } from './docs-url.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(here, '..', '..')
const script = join(here, 'docs-url.mjs')
const tmpRoots = []

after(() => {
  for (const dir of tmpRoots) rmSync(dir, { recursive: true, force: true })
})

/** Builds a minimal valid repo layout in a tmp dir; `overrides` maps relative paths to contents (null removes). */
function fixture(overrides = {}) {
  const files = {
    'packages/tally-charts/package.json': JSON.stringify({
      name: 'tally-charts',
      homepage: DOCS_URL,
    }),
    'packages/tally-charts/README.md': [
      `Docs: <${DOCS_URL}>`,
      `Stability: <${DOCS_URL}/docs/stability>`,
      `Moving to 1.0: <${DOCS_URL}/docs/migration-1-0>`,
    ].join('\n'),
    'docs/stability.md': `[Theming](${DOCS_URL}/docs/theming)\n`,
    '.changeset/other.md': "---\n'tally-charts': patch\n---\n\nNo links here.\n",
  }
  for (const name of MIGRATION_CHANGESETS) {
    files[`.changeset/${name}.md`] =
      `---\n'tally-charts': major\n---\n\nSee the migration guide: ${DOCS_URL}/docs/migration-1-0\n`
  }
  Object.assign(files, overrides)
  const root = mkdtempSync(join(tmpdir(), 'docs-url-'))
  tmpRoots.push(root)
  for (const [file, content] of Object.entries(files)) {
    if (content === null) continue
    mkdirSync(dirname(join(root, file)), { recursive: true })
    writeFileSync(join(root, file), content)
  }
  return root
}

const runCli = (root) => spawnSync(process.execPath, [script, root], { encoding: 'utf8' })

describe('DOCS_URL', () => {
  it('is the tally-charts-docs Vercel host', () => {
    assert.equal(DOCS_URL, 'https://tally-charts-docs.vercel.app')
  })
})

describe('checkDocsUrl', () => {
  it('finds no problems in the real repo', () => {
    assert.deepEqual(checkDocsUrl(repoRoot), [])
  })

  it('finds no problems in a correct fixture', () => {
    assert.deepEqual(checkDocsUrl(fixture()), [])
  })

  it('names the foreign host found in the README', () => {
    const root = fixture({
      'packages/tally-charts/README.md': [
        'Docs: <https://tally-charts.vercel.app>',
        `Stability: <${DOCS_URL}/docs/stability>`,
        `Moving to 1.0: <${DOCS_URL}/docs/migration-1-0>`,
        `Docs: <${DOCS_URL}>`,
      ].join('\n'),
    })
    const problems = checkDocsUrl(root)
    assert.equal(problems.length, 1)
    assert.match(problems[0], /README\.md: host tally-charts\.vercel\.app/)
  })

  it('names any other *.vercel.app host', () => {
    const root = fixture({
      'docs/stability.md': '[Theming](https://other-project.vercel.app/docs/theming)\n',
    })
    assert.match(checkDocsUrl(root).join('\n'), /stability\.md: host other-project\.vercel\.app/)
  })

  it('reports a README that lacks the stability and migration links', () => {
    const root = fixture({ 'packages/tally-charts/README.md': `Docs: <${DOCS_URL}>\n` })
    const problems = checkDocsUrl(root).join('\n')
    assert.match(problems, /README\.md: link .*\/docs\/stability is missing/)
    assert.match(problems, /README\.md: link .*\/docs\/migration-1-0 is missing/)
  })

  it('reports a changeset with another host, even a non-migration one', () => {
    const root = fixture({
      '.changeset/other.md':
        "---\n'tally-charts': patch\n---\n\nSee https://tally-charts.vercel.app/x\n",
    })
    assert.match(
      checkDocsUrl(root).join('\n'),
      /\.changeset\/other\.md: host tally-charts\.vercel\.app/,
    )
  })

  it('reports a migration changeset with a foreign host and without the link', () => {
    const name = MIGRATION_CHANGESETS[0]
    const root = fixture({
      [`.changeset/${name}.md`]:
        "---\n'tally-charts': major\n---\n\nSee https://tally-charts.vercel.app/docs/migration-1-0\n",
    })
    const problems = checkDocsUrl(root).join('\n')
    assert.match(problems, new RegExp(`${name}\\.md: host tally-charts\\.vercel\\.app`))
    assert.match(problems, new RegExp(`${name}\\.md: link .* is missing`))
  })

  it('reports a migration changeset without the migration link', () => {
    const name = MIGRATION_CHANGESETS[2]
    const root = fixture({
      [`.changeset/${name}.md`]: "---\n'tally-charts': major\n---\n\nNo link.\n",
    })
    assert.deepEqual(checkDocsUrl(root), [
      `.changeset/${name}.md: link ${DOCS_URL}/docs/migration-1-0 is missing`,
    ])
  })

  it('accepts a migration changeset moved to .changeset/pre by a prerelease', () => {
    const name = MIGRATION_CHANGESETS[0]
    const root = fixture({
      [`.changeset/${name}.md`]: null,
      [`.changeset/pre/${name}.md`]: `See the migration guide: ${DOCS_URL}/docs/migration-1-0\n`,
    })
    assert.deepEqual(checkDocsUrl(root), [])
  })

  it('reports a foreign host and a missing link in .changeset/pre', () => {
    const name = MIGRATION_CHANGESETS[0]
    const root = fixture({
      [`.changeset/${name}.md`]: null,
      [`.changeset/pre/${name}.md`]: 'See https://tally-charts.vercel.app/docs/migration-1-0\n',
    })
    const problems = checkDocsUrl(root).join('\n')
    assert.match(problems, new RegExp(`pre/${name}\\.md: host tally-charts\\.vercel\\.app`))
    assert.match(problems, new RegExp(`pre/${name}\\.md: link .* is missing`))
  })

  it('reports a missing migration changeset by file name', () => {
    const name = MIGRATION_CHANGESETS[1]
    const root = fixture({ [`.changeset/${name}.md`]: null })
    assert.deepEqual(checkDocsUrl(root), [`.changeset/${name}.md: file is missing or unreadable`])
  })

  it('reports a homepage different from DOCS_URL', () => {
    const root = fixture({
      'packages/tally-charts/package.json': JSON.stringify({ homepage: `${DOCS_URL}/docs` }),
    })
    assert.match(checkDocsUrl(root).join('\n'), /package\.json: homepage is .*expected/)
  })

  it('reports a missing homepage', () => {
    const root = fixture({ 'packages/tally-charts/package.json': '{}' })
    assert.match(checkDocsUrl(root).join('\n'), /package\.json: homepage is undefined, expected/)
  })

  it('reports a missing README by file name', () => {
    const root = fixture({ 'packages/tally-charts/README.md': null })
    assert.deepEqual(checkDocsUrl(root), [
      'packages/tally-charts/README.md: file is missing or unreadable',
    ])
  })
})

describe('docs-url CLI', () => {
  it('exits 1 and prints the host and file to stderr for a wrong README', () => {
    const root = fixture({
      'packages/tally-charts/README.md': `<${DOCS_URL}> <${DOCS_URL}/docs/stability> <${DOCS_URL}/docs/migration-1-0> https://tally-charts.vercel.app\n`,
    })
    const result = runCli(root)
    assert.equal(result.status, 1)
    assert.match(result.stderr, /README\.md: host tally-charts\.vercel\.app/)
  })

  it('exits 0 for a correct fixture', () => {
    const result = runCli(fixture())
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /OK/)
  })

  it('checks the real repo when called without arguments', () => {
    const result = spawnSync(process.execPath, [script], { encoding: 'utf8' })
    assert.equal(result.status, 0, result.stderr)
  })
})
