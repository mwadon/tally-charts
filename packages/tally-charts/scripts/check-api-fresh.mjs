// Fails if `dist/index.d.ts` is older than any file in `src`: api:check would read stale types
// and pass for code that is no longer there. Takes the package directory as an argument (default:
// cwd). Run before api-extractor.
import path from 'node:path'
import { newerThan } from './api-fresh.mjs'

const root = path.resolve(process.argv[2] ?? process.cwd())
const newer = newerThan(path.join(root, 'src'), path.join(root, 'dist', 'index.d.ts'))
const SHOWN = 5

if (newer === null) {
  console.error('dist is older than src, run pnpm build (dist/index.d.ts does not exist)')
  process.exit(1)
}
if (newer.length > 0) {
  console.error('dist is older than src, run pnpm build')
  for (const file of newer.slice(0, SHOWN)) console.error(`  newer: ${path.relative(root, file)}`)
  if (newer.length > SHOWN) console.error(`  ... and ${newer.length - SHOWN} more`)
  process.exit(1)
}
