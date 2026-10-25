// Generates examples.generated.ts from examples/**/*.tsx (see CLAUDE.md, `pnpm --filter docs gen`).
// Plain Node, no build step: metadata is read from the AST of each file, not by importing it.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const ID_PATTERN = /^[a-z0-9-]+(\/[a-z0-9-]+)*$/
const META_KEYS = ['id', 'title', 'rscSafe']

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/** All example files under `dir`, as POSIX paths relative to it. Test files are not examples. */
function listExampleFiles(dir) {
  const found = []
  const walk = (current) => {
    for (const dirent of readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, dirent.name)
      if (dirent.isDirectory()) walk(full)
      else if (dirent.name.endsWith('.tsx') && !dirent.name.endsWith('.test.tsx')) {
        found.push(path.relative(dir, full).split(path.sep).join('/'))
      }
    }
  }
  walk(dir)
  return found.sort()
}

function literalValue(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false
  return undefined
}

function hasModifier(node, kind) {
  return (ts.getModifiers(node) ?? []).some((m) => m.kind === kind)
}

function propertyName(name) {
  return ts.isIdentifier(name) || ts.isStringLiteral(name) ? name.text : undefined
}

/** The object literal behind `{ … } satisfies T`, `{ … } as const` or `({ … })`. */
function unwrapObject(node) {
  let current = node
  while (
    ts.isSatisfiesExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isParenthesizedExpression(current)
  ) {
    current = current.expression
  }
  return ts.isObjectLiteralExpression(current) ? current : undefined
}

function hasDefaultExport(sourceFile) {
  return sourceFile.statements.some((s) => {
    if (ts.isExportAssignment(s)) return !s.isExportEquals
    if (ts.isExportDeclaration(s)) {
      return s.exportClause !== undefined && ts.isNamedExports(s.exportClause)
        ? s.exportClause.elements.some((e) => e.name.text === 'default')
        : false
    }
    return (
      (ts.isFunctionDeclaration(s) || ts.isClassDeclaration(s)) &&
      hasModifier(s, ts.SyntaxKind.ExportKeyword) &&
      hasModifier(s, ts.SyntaxKind.DefaultKeyword)
    )
  })
}

function hasUseClient(sourceFile) {
  for (const s of sourceFile.statements) {
    if (!ts.isExpressionStatement(s) || !ts.isStringLiteral(s.expression)) return false
    if (s.expression.text === 'use client') return true
  }
  return false
}

/** Returns `{ meta }` or `{ problems }` for the metadata of one example. */
function readMeta(sourceFile) {
  const declaration = sourceFile.statements
    .filter((s) => ts.isVariableStatement(s) && hasModifier(s, ts.SyntaxKind.ExportKeyword))
    .flatMap((s) => [...s.declarationList.declarations])
    .find((d) => ts.isIdentifier(d.name) && d.name.text === 'meta')
  if (!declaration?.initializer) {
    return {
      problems: ['missing `export const meta = { id, title, rscSafe } satisfies ExampleMeta`'],
    }
  }
  const object = unwrapObject(declaration.initializer)
  if (!object) return { problems: ['`meta` must be an object literal'] }

  const meta = {}
  const problems = []
  for (const property of object.properties) {
    const key =
      ts.isPropertyAssignment(property) || ts.isShorthandPropertyAssignment(property)
        ? propertyName(property.name)
        : undefined
    if (key === undefined || !META_KEYS.includes(key)) {
      problems.push(`\`meta\` may only contain ${META_KEYS.join(', ')} as plain properties`)
      continue
    }
    const value = ts.isPropertyAssignment(property) ? literalValue(property.initializer) : undefined
    const expected = key === 'rscSafe' ? 'boolean' : 'string'
    if (typeof value !== expected) {
      problems.push(`\`meta.${key}\` must be a ${expected} literal`)
      continue
    }
    meta[key] = value
  }
  for (const key of META_KEYS) {
    if (!(key in meta) && !problems.some((p) => p.includes(`meta.${key}`))) {
      problems.push(`\`meta.${key}\` is missing`)
    }
  }
  return problems.length > 0 ? { problems } : { meta }
}

/**
 * Reads every example under `dir` (the `examples` directory). Returns entries sorted by id and
 * throws one Error listing every violation as `examples/<path>: <problem>`.
 */
export function collectExamples(dir) {
  const entries = []
  const problems = []
  for (const rel of listExampleFiles(dir)) {
    const file = `examples/${rel}`
    const source = readFileSync(path.join(dir, rel), 'utf8')
    const sourceFile = ts.createSourceFile(
      file,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    )
    const fileProblems = []

    const result = readMeta(sourceFile)
    if (result.problems) fileProblems.push(...result.problems)
    if (!hasDefaultExport(sourceFile)) fileProblems.push('missing default export of the component')

    const { meta } = result
    if (meta) {
      const expectedId = rel.replace(/\.tsx$/, '')
      if (!ID_PATTERN.test(meta.id)) {
        fileProblems.push(`\`meta.id\` "${meta.id}" must match ${ID_PATTERN}`)
      } else if (meta.id !== expectedId) {
        fileProblems.push(`\`meta.id\` "${meta.id}" must equal the path "${expectedId}"`)
      }
      if (meta.title.trim() === '') fileProblems.push('`meta.title` must not be empty')
      if (meta.rscSafe && hasUseClient(sourceFile)) {
        fileProblems.push("a file with 'use client' cannot have `rscSafe: true`")
      }
    }

    if (fileProblems.length > 0) problems.push(...fileProblems.map((p) => `${file}: ${p}`))
    else entries.push({ id: meta.id, title: meta.title, rscSafe: meta.rscSafe, file, source })
  }
  if (problems.length > 0) throw new Error(problems.join('\n'))
  return entries.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
}

/** The text of examples.generated.ts for the given entries. Deterministic. */
export function renderRegistry(entries) {
  const sorted = [...entries].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  const body = sorted
    .map((e) => {
      const importPath = `./${e.file.replace(/\.tsx$/, '')}`
      return `  ${JSON.stringify(e.id)}: define({
    id: ${JSON.stringify(e.id)},
    title: ${JSON.stringify(e.title)},
    rscSafe: ${e.rscSafe},
    file: ${JSON.stringify(e.file)},
    source: ${JSON.stringify(e.source)},
    load: () => import(${JSON.stringify(importPath)}),
  }),`
    })
    .join('\n')

  return `// Generated by scripts/gen-examples.mjs from examples/**/*.tsx, do not edit.
// Run \`pnpm --filter docs gen\`; dev, build, test and typecheck run it first.
import { type ComponentType, type LazyExoticComponent, lazy } from 'react'
import type { ExampleMeta } from './examples/types'

export interface ExampleEntry extends ExampleMeta {
  /** Path of the example file relative to the docs app. */
  file: string
  /** The exact content of the file. */
  source: string
  /** Loads the component; \`renderToString\` cannot resolve \`Component\`, so tests use this. */
  load: () => Promise<{ default: ComponentType }>
  Component: LazyExoticComponent<ComponentType>
}

function define(entry: Omit<ExampleEntry, 'Component'>): ExampleEntry {
  return { ...entry, Component: lazy(entry.load) }
}

export const examples = {
${body}
}

export type ExampleId = keyof typeof examples
`
}

/** Writes the registry next to the app. Returns whether the file changed. */
export function generate(root = appDir) {
  const output = path.join(root, 'examples.generated.ts')
  const next = renderRegistry(collectExamples(path.join(root, 'examples')))
  if (existsSync(output) && readFileSync(output, 'utf8') === next) return false
  writeFileSync(output, next)
  return true
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const changed = generate()
    console.log(
      changed ? 'gen: wrote examples.generated.ts' : 'gen: examples.generated.ts is up to date',
    )
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  }
}
