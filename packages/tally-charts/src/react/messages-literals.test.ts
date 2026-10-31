// @vitest-environment node
// biome-ignore-all lint/suspicious/noTemplateCurlyInString: the cases are source text, which holds `${}`
import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import * as defaults from './messages'

// Keeps `ChartsProvider messages` complete: a user-visible English literal in `react/` has to live
// in `DEFAULT_MESSAGES`. The test walks every non-test source file and flags text that a reader or
// a screen reader could meet. What it lets through is listed below, each with its reason; nothing
// is allowed by file or by line, so a new literal anywhere fails until it becomes a message.

const reactDir = import.meta.dirname

// Prose in DEV-only warnings is for developers, not for readers of the chart.
const WARNING_CALLEE = /(^|\.)warn$/
// `KeyboardEvent.key` values, compared against in key handlers.
const KEY_NAMES = /^(Arrow(Up|Down|Left|Right)|Home|End|Page(Up|Down)|Enter|Escape)$/
// A lowercase token with no spaces is a part name, an id or id suffix (`-title`), a custom property
// (`--_ch-x`), a tone or another enum value, not text.
const TOKEN = /^[\0_-]*[a-z0-9][a-z0-9:_-]*$/
// CSS values such as `color-mix(in srgb, …)`, `var(--ch-loss)` and `translateX(-3%)`.
const CSS_FUNCTION = /^[A-Za-z-]+\(.*\)$/s
// aria-* attributes that hold a token, a number or an id reference, never words. The rest
// (`aria-label`, `aria-valuetext`, …) carry text and are checked.
const ARIA_NOT_TEXT = new Set([
  'aria-hidden',
  'aria-live',
  'aria-labelledby',
  'aria-describedby',
  'aria-activedescendant',
])
// The mark's name, passed on so that its error and warning messages can say who is speaking.
const NAME_CALLEES = new Set(['useChartContext', 'useSeriesScales', 'timeX'])

// Properties whose string value reaches the screen: tooltip segments, ticks, table cells.
const SHOWN_KEYS = new Set(['label', 'text', 'value'])

const hasLetters = (text: string) => /\p{L}/u.test(text)

/** The user-visible literals of one source file, as `line: text`. */
function findLiterals(fileName: string, source: string): string[] {
  const sf = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )
  const found: string[] = []
  const report = (node: ts.Node, text: string) =>
    found.push(`${sf.getLineAndCharacterOfPosition(node.getStart()).line + 1}: ${text.trim()}`)

  const calleeName = (call: ts.CallExpression) => call.expression.getText(sf)
  const inWarning = (node: ts.Node) => {
    for (let n: ts.Node | undefined = node.parent; n; n = n.parent) {
      if (ts.isCallExpression(n) && WARNING_CALLEE.test(calleeName(n))) return true
      if (ts.isNewExpression(n) && n.expression.getText(sf) === 'Error') return true
    }
    return false
  }
  // 'Area' in `useChartContext('Area')`: a direct argument of one of those calls.
  const isMarkName = (node: ts.Node) =>
    ts.isCallExpression(node.parent) &&
    NAME_CALLEES.has(calleeName(node.parent)) &&
    node.parent.arguments.includes(node as ts.Expression)

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) return
    if (ts.isLiteralTypeNode(node) || ts.isTypeNode(node)) return

    // Words that must never be a literal, whatever their shape.
    if (ts.isPropertyAssignment(node) && node.name.getText(sf) === 'header') {
      const init = node.initializer
      if (ts.isStringLiteralLike(init) && hasLetters(init.text)) report(init, init.text)
    }
    if (ts.isCallExpression(node) && calleeName(node) === 'headerOf') {
      const fallback = node.arguments[1]
      if (fallback && ts.isStringLiteralLike(fallback)) report(fallback, fallback.text)
    }

    if (ts.isJsxAttribute(node)) {
      const name = node.name.getText(sf)
      // className, data-* and the like never hold prose; aria-* and title do.
      if (!name.startsWith('aria-') && name !== 'title' && name !== 'alt') return
      if (ARIA_NOT_TEXT.has(name)) return
    }

    if (ts.isTemplateExpression(node) && CSS_FUNCTION.test(node.getText(sf).slice(1, -1))) return

    // Whatever its shape, a literal that is shown as the text of a property, or as a JSX child
    // expression, is words: `{ label: 'total' }`, `aria-label: 'x'`, `{'x'}`.
    if (ts.isStringLiteralLike(node) && hasLetters(node.text) && !inWarning(node)) {
      const parent = node.parent
      const key =
        ts.isPropertyAssignment(parent) && parent.initializer === node
          ? parent.name.getText(sf).replace(/^['"]|['"]$/g, '')
          : undefined
      if (
        (key !== undefined && (SHOWN_KEYS.has(key) || key.startsWith('aria-'))) ||
        ts.isJsxExpression(parent)
      ) {
        if (!(key !== undefined && ARIA_NOT_TEXT.has(key))) report(node, node.text)
      }
    }

    // JSX text is always on screen, so a token-shaped word such as `<b>ok</b>` is still words.
    if (ts.isJsxText(node) && hasLetters(node.text)) report(node, node.text)

    let text: string | undefined
    if (ts.isStringLiteralLike(node) || ts.isTemplateLiteralToken(node)) {
      text = node.text
    }
    if (text !== undefined && hasLetters(text)) {
      const trimmed = text.trim()
      const allowed =
        inWarning(node) ||
        KEY_NAMES.test(trimmed) ||
        TOKEN.test(text) ||
        CSS_FUNCTION.test(text) ||
        isMarkName(node)
      if (!allowed) report(node, text)
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return [...new Set(found)]
}

const constName = (key: string) => key.replace(/[A-Z]/g, (c) => `_${c}`).toUpperCase()

/**
 * The reads of a message key in one source file. `useMessages()` holds only what the caller passed,
 * so a read needs its own default: `messages.noData ?? NO_DATA`. TypeScript can't catch a missing
 * one, because JSX accepts undefined. Returns the keys read, and the reads that break the rule.
 */
function checkMessageReads(fileName: string, source: string) {
  const sf = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )
  const keys: string[] = []
  const problems: string[] = []
  const isCoalesce = (node: ts.Node): node is ts.BinaryExpression =>
    ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
  const isReader = (node: ts.Expression) =>
    node.getText(sf) === 'messages' || node.getText(sf) === 'useMessages()'
  const isHookDeps = (node: ts.Node) =>
    ts.isArrayLiteralExpression(node.parent) &&
    ts.isCallExpression(node.parent.parent) &&
    /^use[A-Z]/.test(node.parent.parent.expression.getText(sf))

  const visit = (node: ts.Node): void => {
    if (ts.isPropertyAccessExpression(node) && isReader(node.expression)) {
      const key = node.name.text
      const line = sf.getLineAndCharacterOfPosition(node.getStart()).line + 1
      keys.push(key)
      // `prop ?? messages.noData ?? NO_DATA` parses as `(prop ?? messages.noData) ?? NO_DATA`.
      const inner = isCoalesce(node.parent) && node.parent.right === node ? node.parent : node
      const outer = inner.parent
      const fallback = isCoalesce(outer) && outer.left === inner ? outer.right : undefined
      if (fallback?.getText(sf) !== constName(key) && !isHookDeps(node)) {
        problems.push(`${line}: ${key} needs \`?? ${constName(key)}\``)
      }
    }
    if (
      ts.isVariableDeclaration(node) &&
      ts.isObjectBindingPattern(node.name) &&
      node.initializer?.getText(sf) === 'useMessages()'
    ) {
      problems.push(
        `${sf.getLineAndCharacterOfPosition(node.getStart()).line + 1}: destructured messages`,
      )
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return { keys, problems }
}

function sources(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return sources(full)
    const skip = entry.name.includes('.test.') || entry.name === 'messages.ts'
    return /\.tsx?$/.test(entry.name) && !skip ? [full] : []
  })
}

describe('findLiterals', () => {
  const find = (code: string) => findLiterals('x.tsx', code)

  it('flags JSX text, header literals and the headerOf fallback', () => {
    expect(find('const a = <p>Hello</p>')).toHaveLength(1)
    expect(find("const t = { header: 'name' }")).toHaveLength(1)
    expect(find("const t = headerOf(x, 'name')")).toHaveLength(1)
  })
  it('flags words in aria-label and sr-only children', () => {
    expect(find("const a = <i aria-label='Close' />")).toHaveLength(1)
    expect(find('const a = <i aria-valuetext={`${v} of ten`} />')).toHaveLength(1)
    expect(find("const a = <span className='ch-sr-only'>{n ?? 'Up'}</span>")).toHaveLength(1)
  })
  it('flags a lowercase word shown as a label, text or JSX child', () => {
    expect(find("const s = { value: 1, label: 'total' }")).toHaveLength(1)
    expect(find("const s = { text: 'ok' }")).toHaveLength(1)
    expect(find("const s = { 'aria-label': 'close' }")).toHaveLength(1)
    expect(find("const a = <b>{'ok'}</b>")).toHaveLength(1)
  })
  it('flags a bare lowercase word, or a key name, as a JSX text child', () => {
    expect(find('const a = <b>ok</b>')).toHaveLength(1)
    expect(find('const a = <b>End</b>')).toHaveLength(1)
    expect(find('const a = <b>{x}</b>')).toEqual([])
  })
  it('flags text in a template chunk', () => {
    expect(find('const s = `${a}, plan ${b}`')).toHaveLength(1)
  })
  it('lets through warnings, keys, tokens, ids, CSS and mark names', () => {
    expect(find("warn('id', 'Chart needs a thing.')")).toEqual([])
    expect(find('ctx.warn(`x`, `Region from "${a}" to "${b}".`)')).toEqual([])
    expect(find("throw new Error('Not in a chart')")).toEqual([])
    expect(find("if (e.key === 'ArrowUp') go()")).toEqual([])
    expect(find("const k = { kind: 'step', part: 'meter-labels' }")).toEqual([])
    expect(find('const a = <i aria-hidden="true" aria-labelledby={`${id}-name`} />')).toEqual([])
    expect(find('const c = `color-mix(in srgb, var(--ch-${t}) 8%, var(--ch-surface))`')).toEqual([])
    expect(find("const x = useChartContext('Area')")).toEqual([])
  })
  it('does not exempt a mark name outside those calls', () => {
    expect(find("const label = title || 'Heatmap'")).toHaveLength(1)
  })
})

describe('user-visible English in react/', () => {
  it('lives in DEFAULT_MESSAGES', () => {
    const offenders = sources(reactDir).flatMap((file) =>
      findLiterals(file, fs.readFileSync(file, 'utf8')).map(
        (hit) => `${path.relative(reactDir, file)}:${hit}`,
      ),
    )
    expect(offenders, 'move these into DEFAULT_MESSAGES (react/messages.ts)').toEqual([])
  })
})

describe('checkMessageReads', () => {
  const problems = (code: string) => checkMessageReads('x.tsx', code).problems

  it('accepts a read with its own default, after a prop or as a hook dependency', () => {
    expect(problems('const a = messages.noData ?? NO_DATA')).toEqual([])
    expect(problems('const a = useMessages().noData ?? NO_DATA')).toEqual([])
    expect(problems('const a = empty ?? messages.noData ?? NO_DATA')).toEqual([])
    expect(problems('useMemo(() => a, [messages.noData])')).toEqual([])
  })
  it('flags a read with no default, the wrong default or a destructured hook', () => {
    expect(problems('const a = <b>{messages.noData}</b>')).toHaveLength(1)
    expect(problems('const a = useMessages().noData')).toHaveLength(1)
    expect(problems('const a = empty ?? messages.noData')).toHaveLength(1)
    expect(problems('const a = messages.noData ?? NO_VALUE')).toHaveLength(1)
    expect(problems('const a = [messages.noData]')).toHaveLength(1)
    expect(problems('const { noData } = useMessages()')).toHaveLength(1)
  })
})

describe('reads of a message key in react/', () => {
  const checked = sources(reactDir).map((file) => ({
    file,
    ...checkMessageReads(file, fs.readFileSync(file, 'utf8')),
  }))

  it('each carry their own default', () => {
    const offenders = checked.flatMap(({ file, problems }) =>
      problems.map((p) => `${path.relative(reactDir, file)}:${p}`),
    )
    expect(offenders).toEqual([])
  })
  it('cover every key, and each default is the const named after its key', () => {
    const read = new Set(checked.flatMap(({ keys }) => keys))
    const all = Object.keys(defaults.DEFAULT_MESSAGES)
    expect(all.filter((key) => !read.has(key))).toEqual([])
    const named = defaults as unknown as Record<string, string>
    const table = defaults.DEFAULT_MESSAGES as unknown as Record<string, string>
    expect(all.filter((key) => named[constName(key)] !== table[key])).toEqual([])
  })
})
