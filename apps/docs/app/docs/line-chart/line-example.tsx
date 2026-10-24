import { LineChart } from 'tally-charts'

const months = [
  { month: 'Jan', actual: 410, forecast: null },
  { month: 'Feb', actual: 455, forecast: null },
  { month: 'Mar', actual: 498, forecast: null },
  { month: 'Apr', actual: 530, forecast: null },
  { month: 'May', actual: 590, forecast: null },
  { month: 'Jun', actual: 640, forecast: 640 },
  { month: 'Jul', actual: null, forecast: 700 },
  { month: 'Aug', actual: null, forecast: 745 },
  { month: 'Sep', actual: null, forecast: 790 },
  { month: 'Oct', actual: null, forecast: 850 },
]

export const LINE_EXAMPLE_TITLE = 'Monthly revenue, actual and forecast'

// Props stay serializable (no functions): the page is a server component.
export function LineExample() {
  return (
    <LineChart
      data={months}
      x="month"
      series={[
        { id: 'actual', label: 'Actual', value: 'actual' },
        { id: 'forecast', label: 'Forecast', value: 'forecast', style: 'forecast' },
      ]}
      forecastFrom="Jul"
      target={{ value: 800, label: 'Target' }}
      format="currency-compact"
      height={260}
      title={LINE_EXAMPLE_TITLE}
      description="Revenue grew from 410 to 640 over six months; the forecast reaches 850 in October."
    />
  )
}
