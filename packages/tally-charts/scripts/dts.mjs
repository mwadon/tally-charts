// Finds bare side-effect imports (`import "x"`) in built declaration files. A `.d.ts` has no
// reason to keep one: it only appears when the emitter drops every binding of an import, and
// it makes consumers' type checkers resolve a package that no type needs.
import fs from 'node:fs'
import path from 'node:path'

const SIDE_EFFECT_IMPORT = /^\s*import\s*(['"])([^'"\n]+)\1/
const DTS_FILE = /\.d\.[cm]?ts$/

/** Bare `import "x"` lines of a declaration file as `{line, specifier}`; line is 1-based. */
export function findSideEffectImports(text) {
  const found = []
  text.split(/\r?\n/).forEach((content, index) => {
    const match = SIDE_EFFECT_IMPORT.exec(content)
    if (match) found.push({ line: index + 1, specifier: match[2] })
  })
  return found
}

function declarationFiles(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const file = path.join(dir, entry.name)
      if (entry.isDirectory()) return declarationFiles(file)
      return entry.isFile() && DTS_FILE.test(entry.name) ? [file] : []
    })
    .sort()
}

/** Every bare side-effect import under `distDir` as `{file, line, specifier}`; `file` is absolute. */
export function checkDts(distDir) {
  return declarationFiles(distDir).flatMap((file) =>
    findSideEffectImports(fs.readFileSync(file, 'utf8')).map((found) => ({ file, ...found })),
  )
}
