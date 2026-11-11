/*
 * The drawing under the hero copy: overlapping translucent areas on a baseline, thin vertical
 * rules and a few dots. It is decoration, not data, so it is hidden from assistive technology.
 * Colors come from the chart tokens through the `art-*` classes in `globals.css`, so the drawing
 * follows the theme. Free of server code: the editor registry renders it too.
 */

const RULES_LOSS =
  'M44 300V110M62 300V150M80 300V190M98 300V170M134 300V205M152 300V185M188 300V150M224 300V175M242 300V120M278 300V140' +
  'M900 300V175M918 300V150M936 300V130M954 300V160M972 300V120M990 300V145M1026 300V165M1044 300V140M1080 300V175M1098 300V190'

const RULES_INK =
  'M330 300V140M348 300V160M366 300V120M384 300V150M402 300V95M470 300V130M488 300V150M506 300V175M560 300V190M578 300V170' +
  'M596 300V205M650 300V160M668 300V185M686 300V150M740 300V140M758 300V165M776 300V130M794 300V150M830 300V175M848 300V160'

/** [class, opacity, path] of each area, back to front. */
const AREAS: readonly (readonly [string, number, string])[] = [
  ['art-loss', 0.62, 'M40 300L120 250L170 212L210 240L260 190L330 150L380 205L430 300Z'],
  ['art-loss', 0.45, 'M100 300L200 262L280 230L340 250L400 215L450 300Z'],
  ['art-gain', 0.4, 'M300 300L360 190L400 170L430 56L455 150L480 112L520 210L560 300Z'],
  ['art-accent', 0.85, 'M410 300C450 300 470 200 500 190C530 180 540 260 580 300Z'],
  [
    'art-gain',
    0.6,
    'M520 300C560 240 590 200 630 215C670 230 690 180 730 205C770 230 800 270 840 300Z',
  ],
  ['art-accent', 0.5, 'M600 300C640 270 660 250 700 262C740 274 760 240 800 300Z'],
  ['art-soft', 0.6, 'M780 300L800 235L860 222L880 300Z'],
  ['art-accent', 0.45, 'M850 300L900 245L960 268L990 300Z'],
  ['art-loss', 0.55, 'M900 300L980 240L1040 255L1100 205L1150 190L1160 300Z'],
  ['art-warn', 0.6, 'M1040 300L1120 230L1180 250L1240 300Z'],
]

/** [cx, cy, r] */
const DOTS_LOSS: readonly (readonly [number, number, number])[] = [
  [165, 124, 2],
  [205, 156, 2],
  [232, 142, 1.5],
  [540, 98, 2],
  [566, 118, 1.5],
  [592, 84, 2],
  [1058, 118, 2],
  [1090, 102, 2],
  [1112, 126, 1.5],
  [1138, 96, 2],
]

const DOTS_GAIN: readonly (readonly [number, number, number])[] = [
  [180, 160, 2],
  [300, 148, 2],
  [556, 140, 1.5],
  [640, 120, 2],
  [1010, 132, 2],
]

export function HomeArt() {
  return (
    <svg
      className="home-art"
      viewBox="0 0 1280 320"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      focusable="false"
    >
      <path className="art-rule art-rule-loss" d={RULES_LOSS} />
      <path className="art-rule art-rule-ink" d={RULES_INK} />
      {AREAS.map(([tone, opacity, d]) => (
        <path key={d} className={tone} fillOpacity={opacity} d={d} />
      ))}
      <path
        className="art-line art-line-gain"
        d="M500 205L560 200L600 150L640 172L690 190L730 160L790 128L850 150"
      />
      <path className="art-line art-line-loss" d="M930 190L975 172L1010 150L1045 158" />
      <path className="art-base" d="M30 300H1250" />
      <g className="art-loss">
        {DOTS_LOSS.map(([cx, cy, r]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
        ))}
      </g>
      <g className="art-gain">
        {DOTS_GAIN.map(([cx, cy, r]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
        ))}
      </g>
    </svg>
  )
}

/** [class, opacity, path] of the ridges along the bottom of the closing band. */
const RIDGES: readonly (readonly [string, number, string])[] = [
  ['art-loss', 0.6, 'M0 120L120 70L220 90L330 40L430 120Z'],
  ['art-gain', 0.5, 'M300 120C360 80 400 52 450 52C510 52 520 78 590 82C650 86 680 100 700 120Z'],
  ['art-soft', 0.5, 'M560 120L680 50L760 80L860 30L960 120Z'],
  ['art-warn', 0.6, 'M860 120L980 70L1060 86L1160 44L1280 120Z'],
]

/** The drawing along the bottom edge of the closing band; decoration, like `HomeArt`. */
export function CtaArt() {
  return (
    <svg
      className="cta-art"
      viewBox="0 0 1280 120"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      focusable="false"
    >
      {RIDGES.map(([tone, opacity, d]) => (
        <path key={d} className={tone} fillOpacity={opacity} d={d} />
      ))}
    </svg>
  )
}
