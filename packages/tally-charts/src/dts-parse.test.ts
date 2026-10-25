// @vitest-environment node
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import type * as TS from 'typescript'
import { describe, expect, it } from 'vitest'

// api-extractor analyses the built `.d.ts` with its own bundled TypeScript, which can be older than
// the project's (`--typescript-compiler-folder` only swaps the lib typings). This parses and
// checks every declaration file with that bundled compiler, so syntax it can't read fails here
// and not as a confusing api-extractor error. It needs `pnpm build` and is skipped without it,
// unless REQUIRE_DIST is set (the CI `check` job sets it, after the build).
const root = path.resolve(import.meta.dirname, '..')
const dist = path.join(root, 'dist')
const built = fs.existsSync(path.join(dist, 'index.d.ts'))

if (!built && process.env.REQUIRE_DIST) {
  throw new Error('dist is missing: run pnpm build before src/dts-parse.test.ts')
}

const require = createRequire(import.meta.url)

function declarationFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name)
    if (entry.isDirectory()) return declarationFiles(file)
    return /\.d\.[cm]?ts$/.test(entry.name) ? [file] : []
  })
}

describe.skipIf(!built)('built declarations', () => {
  it("parse and check without errors in api-extractor's bundled TypeScript", () => {
    const extractorEntry = require.resolve('@microsoft/api-extractor')
    const ts = require(
      require.resolve('typescript', { paths: [path.dirname(extractorEntry)] }),
    ) as typeof TS
    const config = JSON.parse(fs.readFileSync(path.join(root, 'api-extractor.json'), 'utf8'))
    const { options, errors } = ts.convertCompilerOptionsFromJson(
      // skipLibCheck would skip the dist files too: they are declaration files.
      { ...config.compiler.overrideTsconfig.compilerOptions, skipLibCheck: false },
      root,
    )
    expect(errors).toEqual([])

    const files = declarationFiles(dist)
    expect(files.length).toBeGreaterThan(1)
    const program = ts.createProgram(files, options)
    const ours = new Set(files.map((file) => path.resolve(file)))
    const diagnostics = [
      ...program.getOptionsDiagnostics(),
      ...program.getGlobalDiagnostics(),
      ...files.flatMap((file) => {
        const source = program.getSourceFile(file)
        return [
          ...program.getSyntacticDiagnostics(source),
          ...program.getSemanticDiagnostics(source),
        ]
      }),
    ].filter((d) => !d.file || ours.has(path.resolve(d.file.fileName)))

    expect(
      diagnostics.map(
        (d) => `${d.file?.fileName ?? ''}: ${ts.flattenDiagnosticMessageText(d.messageText, '\n')}`,
      ),
    ).toEqual([])
  })
})
