// Bundles the built main entry the way an app's production build would and fails if any
// development warning text survives. Run after `pnpm build`.
import { build } from 'esbuild'

const result = await build({
  entryPoints: ['dist/index.js'],
  bundle: true,
  minify: true,
  write: false,
  format: 'esm',
  platform: 'browser',
  packages: 'external',
  define: { 'process.env.NODE_ENV': '"production"' },
  logLevel: 'silent',
})

const code = result.outputFiles[0].text
// One phrase from each warning site.
const phrases = [
  'skipped a missing',
  'need one band scale',
  'has no domain',
  'Missing or duplicate id',
  'outside the chart domain',
  'needs a linear scale',
  'Bars need x and y fields',
]
const leaks = phrases.filter((phrase) => code.includes(phrase))
if (leaks.length > 0) {
  console.error('Development warnings survived a production build:', leaks)
  process.exit(1)
}
console.log(`ok: development warnings are stripped (${code.length} bytes)`)
