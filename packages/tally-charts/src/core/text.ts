/** Rough average glyph width of 13–15px UI text in px; good enough to decide where to cut. */
export const CHAR_WIDTH = 7

/** Cuts `text` to fit `maxWidth` px, ending with an ellipsis. Never throws on bad widths. */
export function truncateLabel(text: string, maxWidth: number, charWidth = CHAR_WIDTH): string {
  if (!(maxWidth > 0) || !(charWidth > 0)) return ''
  const max = Math.floor(maxWidth / charWidth)
  if (text.length <= max) return text
  if (max <= 1) return '…'
  return `${text.slice(0, max - 1).trimEnd()}…`
}
