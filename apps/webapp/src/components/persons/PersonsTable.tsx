import { CaretDownIcon, CaretUpIcon } from '@phosphor-icons/react';
// oxlint-disable no-ternary
// oxlint-disable no-magic-numbers
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { useState } from 'react';
import { Card } from '#apps/webapp/components/ui/card';
import { cn } from '#apps/webapp/lib/utils';

export interface PersonTableRow {
  id: string;
  firstName: string;
  lastName: string;
  gender?: string;
  dateOfBirth?: string;
}

interface PersonsTableProps {
  data: PersonTableRow[];
  loading?: boolean;
  selectedId?: string;
  onRowSelect?: (person: PersonTableRow) => void;
}

const columnHelper = createColumnHelper<PersonTableRow>();

const formatDate = (dateString?: string) => {
  if (!dateString) {
    return '-';
  }
  const date = new Date(dateString);
  return date.toLocaleDateString();
};

const formatGender = (gender?: string) => {
  if (!gender) {
    return '-';
  }
  return gender.charAt(0).toUpperCase() + gender.slice(1).replace(/_/g, ' ');
};

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
    cell: (info) => formatGender(info.getValue()),
  }),
  columnHelper.accessor('dateOfBirth', {
    header: 'Birth Date',
    cell: (info) => formatDate(info.getValue()),
  }),
];

const getRowClassName = (isSelected: boolean) =>
  cn(
    'border-b border-border-default cursor-pointer transition-colors',
    isSelected ? 'bg-action-primary/10 hover:bg-action-primary/15' : 'hover:bg-surface-state-hover',
  );

export const PersonsTable = ({ data, loading, selectedId, onRowSelect }: PersonsTableProps) => {
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
                      {{
                        asc: <CaretUpIcon className="h-4 w-4 text-icon-muted" />,
                        desc: <CaretDownIcon className="h-4 w-4 text-icon-muted" />,
                      }[header.column.getIsSorted() as string] ?? null}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => {
              const isSelected = selectedId === row.original.id;
              return (
                <tr
                  key={row.id}
                  onClick={() => onRowSelect?.(row.original)}
                  className={getRowClassName(isSelected)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-sm text-text-primary">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
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
