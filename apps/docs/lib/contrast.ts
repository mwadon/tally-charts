const channel = (hex: string, i: number) => {
  const v = Number.parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}

/** WCAG relative luminance of a `#rrggbb` color. */
export function luminance(hex: string) {
  return 0.2126 * channel(hex, 0) + 0.7152 * channel(hex, 1) + 0.0722 * channel(hex, 2)
}

/** WCAG contrast ratio of two `#rrggbb` colors, from 1 to 21. */
export function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

/** The ratio as shown in the docs: two decimals, `4.52:1`. */
export function formatContrast(a: string, b: string) {
  return `${contrast(a, b).toFixed(2)}:1`
}
