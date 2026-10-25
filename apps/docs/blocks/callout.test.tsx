import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { Callout, calloutSchema } from './callout'

test.each([
  ['info', 'Note'],
  ['warning', 'Warning'],
  ['tip', 'Tip'],
] as const)('tone %s renders an aside with the label %s and the markdown', (tone, label) => {
  const { container } = render(<Callout tone={tone} markdown="Some **bold** text" />)

  const aside = container.querySelector('aside')
  expect(aside?.getAttribute('data-tone')).toBe(tone)
  expect(screen.getByText(label)).toBeTruthy()
  expect(aside?.querySelector('strong')?.textContent).toBe('bold')
})

test('raw HTML in the markdown is ignored, as in Prose', () => {
  const { container } = render(
    <Callout
      tone="warning"
      markdown={
        '<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n\n[x](javascript:alert(1))'
      }
    />,
  )

  expect(container.querySelector('script')).toBeNull()
  expect(container.querySelector('img')).toBeNull()
  expect(container.innerHTML).not.toContain('onerror')
  for (const a of container.querySelectorAll('a'))
    expect(a.getAttribute('href') ?? '').not.toMatch(/^javascript:/i)
})

test('the schema accepts the three tones and rejects an unknown tone or a missing markdown', () => {
  for (const tone of ['info', 'warning', 'tip'])
    expect(calloutSchema.safeParse({ tone, markdown: 'x' }).success).toBe(true)
  expect(calloutSchema.safeParse({ tone: 'danger', markdown: 'x' }).success).toBe(false)
  expect(calloutSchema.safeParse({ tone: 'info' }).success).toBe(false)
})
