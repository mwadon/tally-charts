// Fails if a built declaration file keeps a bare `import "pkg"`. Run after `pnpm build`.
import fs from 'node:fs'
import path from 'node:path'
import { checkDts } from './dts.mjs'

const root = process.cwd()
const distDir = path.join(root, 'dist')

if (!fs.existsSync(distDir)) {
  console.error('check:dts: dist does not exist, run pnpm build')
  process.exit(1)
}

const findings = checkDts(distDir)
for (const { file, line, specifier } of findings) {
  console.error(`${path.relative(root, file)}:${line}: side-effect import of "${specifier}"`)
}
if (findings.length > 0) {
  console.error(`check:dts: ${findings.length} side-effect import(s) in declaration files`)
  process.exit(1)
}
console.log('check:dts: no side-effect imports in dist declarations')
