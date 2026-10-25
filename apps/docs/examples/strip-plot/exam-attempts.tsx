import { StripPlot } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'strip-plot/exam-attempts',
  title: 'Practice exam scores, three attempts per student',
  rscSafe: true,
} satisfies ExampleMeta

const scores = [
  [58, 67, 79],
  [63, 74, 76],
  [68, 75, 78],
  [56, 63, 70],
  [62, 66, 72],
  [63, 65, 73],
  [72, 79, 86],
  [54, 65, 69],
  [51, 59, 64],
  [54, 61, 72],
  [60, 62, 72],
  [73, 83, 86],
  [56, 59, 63],
  [76, 86, 93],
  [61, 68, 73],
  [70, 70, 79],
  [71, 71, 80],
  [63, 72, 72],
]
const students = scores.map(([first, second, third], i) => ({
  student: `Student ${i + 1}`,
  first,
  second,
  third,
}))

// Props stay serializable: no median line, a fixed domain and a smaller row.
export default function ExamAttempts() {
  return (
    <StripPlot
      title={meta.title}
      description="Scores rise with each attempt: the first ranges from 51 to 76, the third from 63 to 93. No student scored lower on a later attempt."
      data={students}
      label="student"
      series={[
        { id: 'first', label: 'Attempt 1', value: 'first', tone: 'neutral' },
        { id: 'second', label: 'Attempt 2', value: 'second', tone: 'accent-soft' },
        { id: 'third', label: 'Attempt 3', value: 'third', tone: 'accent' },
      ]}
      median={false}
      domain={[40, 100]}
      radius={5}
      rowHeight={64}
      labelWidth={88}
    />
  )
}
