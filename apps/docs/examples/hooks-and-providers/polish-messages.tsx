import { ChartsProvider, Meter, RankedBars } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'hooks-and-providers/polish-messages',
  title: 'Planned hours by technician, in Polish',
  rscSafe: true,
} satisfies ExampleMeta

const plan = [
  { name: 'Tomasz Brodzki', hours: 62, jobs: '9 zleceń' },
  { name: 'Dana Ostrowska', hours: 54, jobs: '8 zleceń' },
  { name: 'Sebastian Patel', hours: 47, jobs: '6 zleceń' },
  { name: 'Priya Nowak', hours: 31, jobs: '4 zlecenia' },
]

// Keys left out keep their English default. Strings take {placeholders}, not functions, so the
// object can cross from a Server Component to the provider. In a Client Component, define it
// outside the component (or in useMemo): a new object on every render re-renders every chart
// below the provider.
const pl = {
  noData: 'Brak danych',
  keyboardHint:
    'Strzałki przesuwają między punktami, Home i End skaczą na początek i na koniec, Escape czyści.',
  position: '{index} z {total}',
  target: 'cel {value}',
  targetLabel: 'Cel {value}',
  headerItem: 'Pozycja',
  headerValue: 'Wartość',
  headerDetails: 'Szczegóły',
}

export default function PolishMessages() {
  return (
    <ChartsProvider locale="pl-PL" messages={pl}>
      <div style={{ display: 'grid', gap: '1.5rem' }}>
        <RankedBars
          data={plan}
          label="name"
          value="hours"
          meta="jobs"
          format="hours"
          title={meta.title}
          description="Tomasz Brodzki ma zaplanowane 62 godziny przy 9 zleceniach, Priya Nowak 31 godzin przy 4."
        />
        <Meter label="Plan sprzedaży" value={68} max={100} target={80} format="percent" />
      </div>
    </ChartsProvider>
  )
}
