'use client';

import { Fragment, type ReactNode } from 'react';

export type TableColumn<T> = {
  key: string;
  header: string;
  /** `num` right-aligns and uses tabular figures; `ltr` forces latin direction. */
  align?: 'num' | 'ltr';
  cell: (row: T, index: number) => ReactNode;
};

/**
 * Table — a plain, dense table, and deliberately not a data grid.
 *
 * It is named `Table`, not `DataTable`, because `@erp/ui` already exports a
 * `DataTable` and the two are different components: that one is a grid with
 * sorting, selection, a column chooser and pagination, while this one is
 * presentational — the API decides the order and the caller decides the
 * markup. Sharing a name across two different shapes is how a reader (or a
 * future migration) points 78 screens at the wrong component, which is
 * exactly what happened while measuring this one.
 *
 * It stays in staff rather than moving to `@erp/ui` because four of its six
 * styling classes (`zebra`, `clickable`, `row-active`, `compact`) are defined
 * only in this app's `globals.css`; hoisting it would break the other two
 * surfaces for no gain.
 */
export function Table<T>({
  columns,
  rows,
  rowKey,
  zebra = true,
  compact,
  onRowClick,
  activeKey,
  footer,
  expanded,
}: {
  columns: Array<TableColumn<T>>;
  rows: T[];
  rowKey: (row: T, index: number) => string;
  zebra?: boolean;
  compact?: boolean;
  onRowClick?: (row: T) => void;
  activeKey?: string;
  /** Cells of the totals row, in column order. */
  footer?: ReactNode[];
  /** Detail rendered under the row — lot, serial, the source document. */
  expanded?: (row: T) => ReactNode;
}) {
  return (
    <div className="table-wrap">
      <table className={[zebra ? 'zebra' : '', compact ? 'compact' : ''].filter(Boolean).join(' ') || undefined}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={column.align === 'num' ? 'num' : undefined}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const key = rowKey(row, index);
            const active = activeKey !== undefined && activeKey === key;
            return (
              <Fragment key={key}>
                <tr
                  className={[onRowClick ? 'clickable' : '', active ? 'row-active' : ''].filter(Boolean).join(' ') || undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={column.align === 'num' ? 'num' : undefined}
                      dir={column.align === 'ltr' ? 'ltr' : undefined}
                    >
                      {column.cell(row, index)}
                    </td>
                  ))}
                </tr>
                {expanded ? (
                  <tr>
                    <td colSpan={columns.length} style={{ background: 'var(--surface-2)', padding: '8px 12px' }}>
                      {expanded(row)}
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
        {footer ? (
          <tfoot>
            <tr>
              {footer.map((cell, index) => (
                <td key={columns[index]?.key ?? index} className={columns[index]?.align === 'num' ? 'num' : undefined}>
                  {cell}
                </td>
              ))}
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  );
}
