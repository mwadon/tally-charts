// The API Extractor doc model (`api/*.api.json`) is committed, so the docs app can read the public
// API without `dist`. api-extractor writes it to `temp/api/` with `fileUrlPath` fields that point at
// chunks with a content hash (`dist/thresholds-BM9m96FR.d.ts`); those are dropped here, or every
// build would change the committed file.
//
//   node scripts/api-model.mjs check [packageDir]   fails when `api/` differs from `temp/api/`
//   node scripts/api-model.mjs update [packageDir]  copies the normalized `temp/api/` to `api/`
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** File names (without extension) of the models, one per entry point. */
export const MODEL_NAMES = ['tally-charts', 'core']

const STALE_HINT = 'api model is stale, run pnpm --filter tally-charts api:update'

function withoutFileUrlPath(value) {
  if (Array.isArray(value)) return value.map(withoutFileUrlPath)
  if (value === null || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== 'fileUrlPath')
      .map(([key, entry]) => [key, withoutFileUrlPath(entry)]),
  )
}

/** The text of a doc model without any `fileUrlPath`: indent 2, trailing newline, same key order. */
export function normalizeModel(json) {
  return `${JSON.stringify(withoutFileUrlPath(json), null, 2)}\n`
}

function paths(root, name) {
  return {
    generated: path.join(root, 'temp', 'api', `${name}.api.json`),
    committed: path.join(root, 'api', `${name}.api.json`),
  }
}

function readGenerated(root, name) {
  const { generated } = paths(root, name)
  if (!fs.existsSync(generated)) {
    throw new Error(
      `${path.relative(root, generated)} does not exist, run api-extractor first (pnpm --filter tally-charts api:update)`,
    )
  }
  return normalizeModel(JSON.parse(fs.readFileSync(generated, 'utf8')))
}

/** Names of the models whose committed file is missing or differs from the generated one. */
export function checkModels(root) {
  return MODEL_NAMES.filter((name) => {
    const { committed } = paths(root, name)
    const next = readGenerated(root, name)
    return !fs.existsSync(committed) || fs.readFileSync(committed, 'utf8') !== next
  })
}

/** Writes the normalized models to `api/`. Returns the names whose file changed. */
export function updateModels(root) {
  return MODEL_NAMES.filter((name) => {
    const { committed } = paths(root, name)
    const next = readGenerated(root, name)
    if (fs.existsSync(committed) && fs.readFileSync(committed, 'utf8') === next) return false
    fs.mkdirSync(path.dirname(committed), { recursive: true })
    fs.writeFileSync(committed, next)
    return true
  })
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, dir] = process.argv.slice(2)
  const root = path.resolve(dir ?? process.cwd())
  try {
    if (command === 'check') {
      const stale = checkModels(root)
      if (stale.length > 0) {
        console.error(STALE_HINT)
        for (const name of stale) console.error(`  stale: api/${name}.api.json`)
        process.exit(1)
      }
    } else if (command === 'update') {
      for (const name of updateModels(root)) console.log(`api-model: wrote api/${name}.api.json`)
    } else {
      console.error('usage: api-model.mjs check|update [packageDir]')
      process.exit(1)
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  }
}
