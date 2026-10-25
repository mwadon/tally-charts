import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { CodeBlock, codeBlockSchema } from './code-block'

const code = 'const answer: number = 42\nexport default answer'

test('highlights on the server: shiki spans with --shiki-* colors, text equal to the code', async () => {
  const { container } = render(await CodeBlock({ code, lang: 'ts' }))

  const spans = [...container.querySelectorAll<HTMLElement>('pre code span')]
  expect(spans.length).toBeGreaterThan(2)
  expect(spans.some((s) => s.style.color.startsWith('var(--shiki-'))).toBe(true)
  expect(container.querySelector('pre')?.textContent).toBe(code)
})

test.each(['tsx', 'ts', 'bash', 'css', 'json'] as const)(
  '%s keeps the text intact',
  async (lang) => {
    const source = lang === 'json' ? '{ "a": [1, 2] }' : 'a b\n\nc'
    const { container } = render(await CodeBlock({ code: source, lang }))

    expect(container.querySelector('pre')?.textContent).toBe(source)
  },
)

test('code that tries to close the block does not create a script element', async () => {
  const evil = '</code></pre><script>alert(1)</script>'
  const { container } = render(await CodeBlock({ code: evil, lang: 'tsx' }))

  expect(container.querySelector('script')).toBeNull()
  expect(container.querySelector('pre')?.textContent).toBe(evil)
})

test('the filename is in the bar and names the region', async () => {
  const { container } = render(await CodeBlock({ code, lang: 'ts', filename: 'app.ts' }))

  expect(container.querySelector('.code-block-name')?.textContent).toBe('app.ts')
  expect(screen.getByRole('region', { name: 'app.ts' })).toBeTruthy()
})

test('bash without a filename is labelled Terminal, other languages have an empty bar title', async () => {
  const { container, rerender } = render(await CodeBlock({ code: 'pnpm i', lang: 'bash' }))
  expect(container.querySelector('.code-block-name')?.textContent).toBe('Terminal')

  rerender(await CodeBlock({ code: 'a {}', lang: 'css' }))
  expect(container.querySelector('.code-block-name')?.textContent).toBe('')
})

test('the schema accepts the five languages and rejects others or a missing code', () => {
  for (const lang of ['tsx', 'ts', 'bash', 'css', 'json'])
    expect(codeBlockSchema.safeParse({ code: 'x', lang }).success).toBe(true)
  expect(codeBlockSchema.safeParse({ code: 'x', lang: 'py' }).success).toBe(false)
  expect(codeBlockSchema.safeParse({ lang: 'ts' }).success).toBe(false)
  expect(codeBlockSchema.safeParse({ code: 'x', lang: 'ts', filename: 'a.ts' }).success).toBe(true)
})

// The copy button is a client component; it is exercised through the block.
let writeText: ReturnType<typeof vi.fn>

beforeEach(() => {
  writeText = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
})

afterEach(() => {
  vi.useRealTimers()
})

test('the copy button copies the exact code and announces Copied, then clears', async () => {
  const view = await CodeBlock({ code, lang: 'ts', filename: 'app.ts' })
  vi.useFakeTimers()
  render(view)

  const status = screen.getByRole('status')
  expect(status.getAttribute('aria-live')).toBe('polite')
  expect(status.textContent).toBe('')

  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Copy code: app.ts' }))
  })

  expect(writeText).toHaveBeenCalledExactlyOnceWith(code)
  expect(screen.getByRole('status').textContent).toBe('Copied')

  await act(async () => {
    vi.advanceTimersByTime(2000)
  })
  expect(screen.getByRole('status').textContent).toBe('')
})

test('without a filename the button is named after the language', async () => {
  render(await CodeBlock({ code: 'pnpm i', lang: 'bash' }))

  expect(screen.getByRole('button', { name: 'Copy code: bash' })).toBeTruthy()
})

test('a rejected clipboard write announces Copy failed', async () => {
  writeText.mockRejectedValue(new Error('denied'))
  const view = await CodeBlock({ code, lang: 'ts' })
  render(view)

  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Copy code: ts' }))
  })

  expect(screen.getByRole('status').textContent).toBe('Copy failed')
})
