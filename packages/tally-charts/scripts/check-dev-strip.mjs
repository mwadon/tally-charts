// Bundles the built main entry the way an app's production and development builds would. Fails if
// any development warning text survives the production build, or if the development build can't
// turn warnings on (no `process` global, as in a browser dev server). Run after `pnpm build`.
import vm from 'node:vm'
import { build } from 'esbuild'

const bundle = async (nodeEnv, options) => {
  const result = await build({
    bundle: true,
    minify: true,
    write: false,
    format: 'esm',
    platform: 'browser',
    packages: 'external',
    define: { 'process.env.NODE_ENV': JSON.stringify(nodeEnv) },
    logLevel: 'silent',
    ...options,
  })
  return result.outputFiles[0].text
}

const code = await bundle('production', { entryPoints: ['dist/index.js'] })
// One phrase from each warning site.
const phrases = [
  'skipped a missing',
  'need one band scale',
  'has no domain',
  'Missing or duplicate id',
  'outside the chart domain',
  'needs a linear scale',
  'Bars need x and y fields',
  'ComparisonBars skipped',
  'RowLabels need a band scale',
  'RowLabels need a row field',
  'RowDividers need a band scale',
  'Target needs an',
  'Target needs a linear or time scale',
  'Target value',
  'skipped an x value that is not a date',
  'skipped a date outside the x domain',
  'has no valid dates',
  'has no `title`',
]
const leaks = phrases.filter((phrase) => code.includes(phrase))
if (leaks.length > 0) {
  console.error('Development warnings survived a production build:', leaks)
  process.exit(1)
}

const devCode = await bundle('development', { entryPoints: ['dist/index.js'] })
const survivors = phrases.filter((phrase) => devCode.includes(phrase))
if (survivors.length === 0) {
  console.error('No development warning text survived a development build.')
  process.exit(1)
}

// Evaluate DEV in a context without `process`, like a browser running a dev bundle. DEV is
// internal; tsdown.config.ts keeps src/core/warn.ts verbatim in its own dist chunk.
const devFlag = await bundle('development', {
  stdin: {
    contents: "import { DEV } from './src/core/warn.ts'\nglobalThis.__isDev = DEV",
    resolveDir: process.cwd(),
    loader: 'ts',
  },
  format: 'iife',
})
const sandbox = {}
vm.runInNewContext(devFlag, sandbox)
if (sandbox.__isDev !== true) {
  console.error(`DEV is ${sandbox.__isDev} in a development build without a process global.`)
  process.exit(1)
}

console.log(
  `ok: development warnings are stripped (${code.length} bytes) and enabled in development (${survivors.length}/${phrases.length} phrases)`,
)
