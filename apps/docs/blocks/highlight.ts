import { createCssVariablesTheme, createHighlighterCore, type ThemedToken } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'
import bash from 'shiki/langs/bash.mjs'
import css from 'shiki/langs/css.mjs'
import json from 'shiki/langs/json.mjs'
import ts from 'shiki/langs/ts.mjs'
import tsx from 'shiki/langs/tsx.mjs'

export const codeLangs = ['tsx', 'ts', 'bash', 'css', 'json'] as const
export type CodeLang = (typeof codeLangs)[number]

export type { ThemedToken }

// Token colors are `var(--shiki-*)`, assigned to --ch-* mixes in globals.css, so one theme serves
// light and dark through data-ch-theme.
const theme = createCssVariablesTheme({ name: 'tally-docs', variablePrefix: '--shiki-' })

let highlighter: ReturnType<typeof createHighlighterCore> | undefined

function getHighlighter() {
  highlighter ??= createHighlighterCore({
    themes: [theme],
    langs: [tsx, ts, bash, css, json],
    engine: createJavaScriptRegexEngine(),
  })
  return highlighter
}

/**
 * Tokens per line. The view renders them as React text, so the code is escaped by React and
 * there is no HTML string to inject.
 */
export async function highlight(code: string, lang: CodeLang): Promise<ThemedToken[][]> {
  const { tokens } = (await getHighlighter()).codeToTokens(code, { lang, theme: 'tally-docs' })
  return tokens
}
