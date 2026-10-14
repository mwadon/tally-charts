export interface DataTableColumn<D> {
  header: string
  value: (d: D, i: number) => string
}

export interface DataTableSpec<D> {
  columns: readonly DataTableColumn<D>[]
  /** Defaults to the chart title. */
  caption?: string
}

export interface DataTableProps<D> extends DataTableSpec<D> {
  data: readonly D[]
}

/**
 * The chart's data as a visually hidden table, for screen-reader users. The wrapper does the
 * hiding: a table ignores the 1px box and would keep its full height in the page flow.
 */
export function DataTable<D>({ data, columns, caption }: DataTableProps<D>) {
  return (
    <div className="ch-sr-only">
      <table data-ch-part="data-table">
        {caption ? <caption>{caption}</caption> : null}
        <thead>
          <tr>
            {columns.map((column, c) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: columns are positional and never reorder
              <th key={c} scope="col">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((d, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: rows mirror data order
            <tr key={i}>
              {columns.map((column, c) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: columns are positional and never reorder
                <td key={c}>{column.value(d, i)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
