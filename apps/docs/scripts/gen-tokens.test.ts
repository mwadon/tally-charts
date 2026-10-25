import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, expect, test } from 'vitest'
// @ts-expect-error plain .mjs script without types
import { collectTokens, generate, renderTokens } from './gen-tokens.mjs'

interface Token {
  name: string
  group: 'theme' | 'shared'
  light: string
  dark: string
}

const themeCss = readFileSync(
  path.join(import.meta.dirname, '../../../packages/tally-charts/src/theme/theme.css'),
  'utf8',
)

let root: string

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), 'gen-tokens-'))
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

const byName = (tokens: Token[], name: string) => tokens.find((t) => t.name === name)

test('reads the light and dark value of a theme token', () => {
  const { tokens } = collectTokens(themeCss) as { tokens: Token[] }

  expect(byName(tokens, '--ch-accent')).toEqual({
    name: '--ch-accent',
    group: 'theme',
    light: '#2f6bf0',
    dark: '#4d86ff',
  })
})

test('theme-independent tokens are in the shared group with the same value for both themes', () => {
  const { tokens } = collectTokens(themeCss) as { tokens: Token[] }

  const radius = byName(tokens, '--ch-radius')
  expect(radius?.group).toBe('shared')
  expect(radius?.light).toBe('3px')
  expect(radius?.dark).toBe(radius?.light)
  for (const t of tokens.filter((t) => t.group === 'shared')) expect(t.dark).toBe(t.light)
})

test('private --_ch-* variables are skipped and every name is unique', () => {
  const { tokens } = collectTokens(themeCss) as { tokens: Token[] }
  const names = tokens.map((t) => t.name)

  expect(names.every((n) => n.startsWith('--ch-'))).toBe(true)
  expect(new Set(names).size).toBe(names.length)
})

test('the vivid palette overrides warn, gain and neutral and is light only', () => {
  const { palettes } = collectTokens(themeCss)

  expect(palettes.vivid.light.warn).toBe('#f1a23b')
  expect(palettes.vivid.light.gain).toBe('#23a866')
  expect(palettes.vivid.light.neutral).toBe('#a3a3ab')
  expect(palettes.vivid.light.accent).toBe(palettes.default.light.accent)
  expect(palettes.vivid.dark).toBeUndefined()
  expect(palettes.default.dark.warn).toBe('#ffb24d')
  expect(palettes.default.surface).toEqual({ light: '#fafafa', dark: '#121215' })
})

test('a light token without a dark value fails and names the problem', () => {
  const css = themeCss.replace(/^ {2}--ch-grid: #2a2a31;\n/m, '')
  expect(css).not.toBe(themeCss)

  expect(() => collectTokens(css)).toThrow(/^theme\.css: --ch-grid has a light value but no dark/)
})

test('a dark token without a light value fails', () => {
  const css = themeCss.replace(/^ {2}--ch-grid: #e4e4e9;\n/m, '')

  expect(() => collectTokens(css)).toThrow(/theme\.css: --ch-grid has a dark value but no light/)
})

test('the rendered file is deterministic and exports TOKENS, TOKEN_GROUPS and PALETTES', () => {
  const text = renderTokens(collectTokens(themeCss))

  expect(renderTokens(collectTokens(themeCss))).toBe(text)
  expect(text).toContain('export const TOKENS')
  expect(text).toContain("export const TOKEN_GROUPS = ['theme', 'shared'] as const")
  expect(text).toContain('export const PALETTES')
})

test('generate writes the file once and does not touch it when the content is the same', () => {
  const cssFile = path.join(root, 'theme.css')
  writeFileSync(cssFile, themeCss)
  const output = path.join(root, 'tokens.generated.ts')

  expect(generate(root, cssFile)).toBe(true)
  const first = statSync(output).mtimeMs
  const content = readFileSync(output, 'utf8')

  expect(generate(root, cssFile)).toBe(false)
  expect(statSync(output).mtimeMs).toBe(first)
  expect(readFileSync(output, 'utf8')).toBe(content)
})

test('generate fails without writing when the theme is inconsistent', () => {
  const cssFile = path.join(root, 'theme.css')
  writeFileSync(cssFile, themeCss.replace(/^ {2}--ch-grid: #2a2a31;\n/m, ''))

  expect(() => generate(root, cssFile)).toThrow(/theme\.css: /)
  expect(() => statSync(path.join(root, 'tokens.generated.ts'))).toThrow()
})
