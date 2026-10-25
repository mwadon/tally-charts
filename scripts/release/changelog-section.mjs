import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Returns the body of the `## <version>` section of a changesets CHANGELOG (up to the next `## `),
 * trimmed, or `null` when the section is missing.
 */
export function changelogSection(changelog, version) {
  const lines = changelog.split('\n')
  const start = lines.findIndex((line) => line.trimEnd() === `## ${version}`)
  if (start === -1) return null
  let end = lines.findIndex((line, i) => i > start && /^## /.test(line))
  if (end === -1) end = lines.length
  return lines
    .slice(start + 1, end)
    .join('\n')
    .trim()
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const version = process.argv[2]
  const file = resolve(process.argv[3] ?? 'packages/tally-charts/CHANGELOG.md')
  if (!version) {
    console.error('usage: changelog-section.mjs <version> [CHANGELOG.md]')
    process.exit(1)
  }
  const section = changelogSection(readFileSync(file, 'utf8'), version)
  if (section === null) {
    console.error(`changelog-section: no "## ${version}" section in ${file}`)
    process.exit(1)
  }
  console.log(section)
}
