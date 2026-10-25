// Detects a `dist` older than `src`, which makes api-extractor report on code that no longer exists.
import fs from 'node:fs'
import path from 'node:path'

function filesUnder(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name)
    if (entry.isDirectory()) return filesUnder(file)
    return entry.isFile() ? [file] : []
  })
}

/**
 * Files under `srcDir` (all of them, tests included) with an mtime later than `refFile`'s, as
 * absolute paths. A missing `refFile` counts as older than everything: every file is returned,
 * and `null` when `srcDir` is empty too, so the caller can tell "no build" from "fresh".
 */
export function newerThan(srcDir, refFile) {
  if (!fs.existsSync(refFile)) return null
  const ref = fs.statSync(refFile).mtimeMs
  return filesUnder(srcDir)
    .filter((file) => fs.statSync(file).mtimeMs > ref)
    .sort()
}
