import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { changelogSection } from './changelog-section.mjs'

const CHANGELOG = `# tally-charts

## 1.0.0-rc.1

### Patch Changes

- abc: fix

## 1.0.0-rc.0

### Major Changes

- def: breaking

  \`\`\`ts
  // after
  \`\`\`

## 0.9.0

### Minor Changes

- 70b9381: last
`

describe('changelogSection', () => {
  it('returns a middle section up to the next heading', () => {
    const section = changelogSection(CHANGELOG, '1.0.0-rc.0')
    assert.match(section, /^### Major Changes/)
    assert.match(section, /\/\/ after/)
    assert.doesNotMatch(section, /0\.9\.0|last/)
  })

  it('returns the last section to the end of the file', () => {
    assert.equal(changelogSection(CHANGELOG, '0.9.0'), '### Minor Changes\n\n- 70b9381: last')
  })

  it('does not match a version that is a prefix of another', () => {
    assert.equal(changelogSection(CHANGELOG, '1.0.0'), null)
  })

  it('returns null for a missing section', () => {
    assert.equal(changelogSection(CHANGELOG, '2.0.0'), null)
  })
})

describe('changelog-section CLI', () => {
  const script = join(dirname(fileURLToPath(import.meta.url)), 'changelog-section.mjs')

  it('prints the section, and exits 1 when it is missing', () => {
    const dir = mkdtempSync(join(tmpdir(), 'changelog-section-'))
    try {
      const file = join(dir, 'CHANGELOG.md')
      writeFileSync(file, CHANGELOG)
      const ok = spawnSync(process.execPath, [script, '0.9.0', file], { encoding: 'utf8' })
      assert.equal(ok.status, 0)
      assert.match(ok.stdout, /70b9381: last/)
      const missing = spawnSync(process.execPath, [script, '9.9.9', file], { encoding: 'utf8' })
      assert.equal(missing.status, 1)
      assert.match(missing.stderr, /no "## 9\.9\.9" section/)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
