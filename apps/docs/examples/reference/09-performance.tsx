'use client'

import {
  Axis,
  Bars,
  Chart,
  Legend,
  RankedBars,
  Stat,
  Tooltip,
  thresholds,
  useChart,
  ValueLabel,
  ZoneMeter,
} from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'reference/09-performance',
  title: 'Performance: score distribution, pages below threshold and Core Web Vitals',
  rscSafe: false,
} satisfies ExampleMeta

// The Performance screen, built from the public API only.

const buckets = [
  { bucket: '0', pages: 0 },
  { bucket: '10', pages: 1 },
  { bucket: '20', pages: 2 },
  { bucket: '30', pages: 3 },
  { bucket: '40', pages: 44 },
  { bucket: '50', pages: 88 },
  { bucket: '60', pages: 85 },
  { bucket: '70', pages: 271 },
  { bucket: '80', pages: 239 },
  { bucket: '90', pages: 39 },
]
type Bucket = (typeof buckets)[number]
const THRESHOLD = 70
const bands = thresholds([50, 90], ['loss', 'warn', 'gain'], ['Poor', 'Needs work', 'Good'])
const below = [
  { path: '/galeria', pages: 79 },
  { path: '/artykul', pages: 53 },
  { path: '/intencje-mszalne', pages: 43 },
  { path: 'other', pages: 48 },
]
const zoneTones = ['gain', 'warn', 'loss'] as const
// The card status is the bin label, so the reference's "Poor" / "Good" come from bins[indexOf(v)].label.
const zoneLabels = ['Good', 'Needs improvement', 'Poor']

const vitals = [
  {
    key: 'LCP',
    name: 'Largest Contentful Paint',
    value: 4.1,
    max: 6,
    maxLabel: '6 s+',
    zones: thresholds([2.5, 4], [...zoneTones], zoneLabels),
    format: (v: number) => `${v.toFixed(1)} s`,
    note: 'site average · lab profile',
  },
  {
    key: 'CLS',
    name: 'Cumulative Layout Shift',
    value: 0,
    max: 0.4,
    maxLabel: '0.4+',
    zones: thresholds([0.1, 0.25], [...zoneTones], zoneLabels),
    format: (v: number) => v.toFixed(2),
    note: 'no shift recorded',
  },
  {
    key: 'INP',
    name: 'Interaction to Next Paint',
    value: 0,
    max: 800,
    maxLabel: '800+',
    zones: thresholds([200, 500], [...zoneTones], zoneLabels),
    format: (v: number) => `${Math.round(v)} ms`,
    note: 'lab run, no interactions',
  },
]

const perBand = [0, 0, 0]
for (const b of buckets)
  perBand[bands.indexOf(Number(b.bucket))] =
    (perBand[bands.indexOf(Number(b.bucket))] ?? 0) + b.pages
const [poor = 0, needs = 0, good = 0] = perBand
/** The alert threshold: a dashed rule at the left edge of the band, through public `useChart()`. */
function ThresholdRule({ at, label }: { at: string; label: string }) {
  const { x, innerHeight } = useChart()
  if (x.kind !== 'band') return null
  const start = x.scale(at)
  if (start === undefined) return null
  const left = start - (x.scale.step() - x.scale.bandwidth()) / 2
  return (
    <g className="ref-perf-threshold">
      <line x1={left} x2={left} y1={0} y2={innerHeight} />
      <text x={left + 6} y={-22}>
        {label}
      </text>
    </g>
  )
}

// 'use client': ThresholdRule calls useChart(), and the charts get functions (tone, fill, label,
// format), which a server component cannot pass.
export default function Performance() {
  return (
    <div className="ref-perf">
      <header className="ref-perf-head">
        <div>
          <h2 className="ref-perf-title">Performance</h2>
          <p className="ref-perf-sub">
            772 pages scanned on the Mobile profile · alert threshold 70 ·{' '}
            <span className="ref-perf-pill ref-perf-pill-dark">Succeeded</span> 1mo ago
          </p>
        </div>
        <div className="ref-perf-actions">
          <div className="ref-segmented">
            <button type="button" aria-pressed="true">
              Mobile
            </button>
            <button type="button" aria-pressed="false">
              Desktop
            </button>
          </div>
          <button type="button" className="ref-perf-button">
            Export
          </button>
          <button type="button" className="ref-perf-button ref-perf-button-primary">
            Run scan
          </button>
        </div>
      </header>

      <div className="ref-perf-top">
        <article className="ref-card">
          <header className="ref-card-header-row">
            <h3 className="ref-perf-card-title">Score distribution</h3>
            <span className="ref-card-meta">772 pages · buckets of 10</span>
          </header>
          <div className="ref-perf-dist">
            <div className="ref-perf-average">
              <Stat label="Average score" value="73" size="lg" caption="/100" />
              <span className="ref-perf-pill ref-perf-pill-warn">Needs improvement</span>
            </div>
            <div className="ref-perf-chart">
              <Chart
                data={buckets}
                title="Score distribution"
                description="Pages per Performance score bucket; 223 pages score under the alert threshold of 70."
                height={200}
                margin={{ top: 36 }}
                x={{ type: 'band', field: 'bucket', padding: 0.12 }}
                y={{ field: 'pages', domain: [0, 300] }}
              >
                <Bars<Bucket>
                  tone={(d) => (Number(d.bucket) < THRESHOLD ? 'neutral' : 'warn')}
                  fill={(d) => (Number(d.bucket) < THRESHOLD ? 'hatch' : 'solid')}
                  label={(d) => `${d.bucket}–${Number(d.bucket) + 9}`}
                  format={{ preset: 'number', digits: 0 }}
                />
                <ThresholdRule at="70" label="threshold 70" />
                <ValueLabel at={7} />
                <Axis side="bottom" />
                <Tooltip />
              </Chart>
              <Legend
                shape="bar"
                className="ref-perf-tiles"
                items={[
                  { label: 'Good', tone: 'gain', count: good },
                  { label: 'Needs work', tone: 'warn', count: needs },
                  { label: 'Poor', tone: 'loss', count: poor },
                ]}
              />
            </div>
          </div>
        </article>

        <article className="ref-card">
          <header className="ref-perf-below-head">
            <span className="ref-perf-icon">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 3 2 20h20L12 3Z" />
                <path d="M12 10v4M12 17.5v.01" />
              </svg>
            </span>
            <h3 id="perf-below-title" className="ref-perf-card-title">
              Below threshold
            </h3>
            <Stat value="223" size="sm" tone="loss" className="ref-perf-big" />
          </header>
          <p className="ref-perf-sub">Pages scoring under 70.</p>
          <RankedBars
            aria-labelledby="perf-below-title"
            data={below}
            label="path"
            value="pages"
            sort="none"
            tone={(d) => (d.path === 'other' ? 'accent-soft' : d === below[0] ? 'loss' : 'warn')}
            track
            domain={[0, 223]}
          />
          <div className="ref-perf-below-actions">
            <button type="button" className="ref-perf-button ref-perf-button-primary">
              Review 223 pages
            </button>
            <button type="button" className="ref-perf-button">
              Adjust threshold
            </button>
          </div>
        </article>
      </div>

      <div className="ref-perf-vitals">
        {vitals.map((v) => {
          const bin = v.zones.bins[v.zones.indexOf(v.value)]
          return (
            <article
              key={v.key}
              className="ref-card ref-perf-vital"
              data-tone={bin?.tone ?? 'neutral'}
            >
              <header className="ref-perf-vital-head">
                <h3 className="ref-perf-vital-title">
                  <span className="ref-perf-tick" aria-hidden="true" />
                  <b>{v.key}</b> · {v.name}
                </h3>
                <span
                  className="ref-perf-status"
                  data-ch-tone-text="true"
                  data-tone={bin?.tone ?? 'neutral'}
                >
                  {bin?.label}
                </span>
              </header>
              <Stat size="md" value={v.format(v.value)} caption={v.note} />
              <ZoneMeter
                label={v.name}
                value={v.value}
                zones={v.zones}
                max={v.max}
                maxLabel={v.maxLabel}
                format={v.format}
              />
            </article>
          )
        })}
      </div>
    </div>
  )
}
