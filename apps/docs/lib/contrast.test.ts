import { expect, test } from 'vitest'
import { contrast, formatContrast } from './contrast'

test('black on white is 21:1 and a color on itself is 1:1', () => {
  expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5)
  expect(contrast('#2f6bf0', '#2f6bf0')).toBeCloseTo(1, 5)
})

test('the ratio does not depend on the argument order', () => {
  expect(contrast('#2f6bf0', '#fafafa')).toBe(contrast('#fafafa', '#2f6bf0'))
})

test('formatContrast writes two decimals and the :1 suffix', () => {
  expect(formatContrast('#000000', '#ffffff')).toBe('21.00:1')
  expect(formatContrast('#2f6bf0', '#fafafa')).toMatch(/^\d+\.\d{2}:1$/)
})
