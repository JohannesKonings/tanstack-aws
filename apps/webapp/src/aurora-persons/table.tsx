import { CaretDownIcon, CaretUpIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { useState } from 'react';
import type { AuroraPersonListRow } from '#apps/webapp/aurora-persons/view.ts';
import { Card } from '#apps/webapp/components/ui/card';
import { cn } from '#apps/webapp/lib/utils';

interface AuroraPersonsTableProps {
  data: AuroraPersonListRow[];
  loading?: boolean;
}

const columnHelper = createColumnHelper<AuroraPersonListRow>();

const columns = [
  columnHelper.accessor('firstName', {
    header: 'First Name',
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor('lastName', {
    header: 'Last Name',
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor('gender', {
    header: 'Gender',
    cell: (info) => info.getValue(),
  }),
];

const rowClassName = cn(
  'border-b border-border-default cursor-pointer transition-colors hover:bg-surface-state-hover',
);

export const AuroraPersonsTable = ({ data, loading }: AuroraPersonsTableProps) => {
  const [sorting, setSorting] = useState<SortingState>([]);

  // oxlint-disable-next-line react/incompatible-library -- TanStack Table returns unstable function refs by design
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (loading) {
    return (
      <Card className="overflow-hidden">
        <div className="p-8 text-center text-text-secondary">
          <div className="animate-pulse">Loading persons...</div>
        </div>
      </Card>
    );
  }

  const hasNoData = data.length === 0;
  if (hasNoData) {
    return (
      <Card className="border-dashed p-12 text-center">
        <p className="text-lg font-medium text-text-secondary">No persons found</p>
        <p className="mt-1 text-sm text-text-muted">
          Try adjusting your search or add some persons.
        </p>
      </Card>
    );
  }

  const personLabel = data.length === 1 ? 'person' : 'persons';

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                key={headerGroup.id}
                className="border-b border-border-default bg-background-subtle"
              >
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className="px-4 py-3 text-left text-sm font-semibold text-text-primary cursor-pointer hover:bg-surface-state-hover transition-colors select-none"
                  >
                    <div className="flex items-center gap-2">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === 'asc' ? (
                        <CaretUpIcon className="h-4 w-4 text-icon-muted" />
                      ) : null}
                      {header.column.getIsSorted() === 'desc' ? (
                        <CaretDownIcon className="h-4 w-4 text-icon-muted" />
                      ) : null}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => {
              const personLabelText = `${row.original.firstName} ${row.original.lastName}`;
              return (
                <tr key={row.id} className={rowClassName}>
                  {row.getVisibleCells().map((cell, index) => (
                    <td key={cell.id} className="p-0 text-sm text-text-primary">
                      <Link
                        to="/demo/db-persons/aurora/$id"
                        params={{ id: row.original.id }}
                        preload="intent"
                        tabIndex={index === 0 ? 0 : -1}
                        aria-hidden={index === 0 ? undefined : true}
                        aria-label={index === 0 ? personLabelText : undefined}
                        className="block px-4 py-3"
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </Link>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="border-t border-border-default px-4 py-2 text-sm text-text-muted">
        {data.length} {personLabel}
      </div>
    </Card>
  );
};
