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
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

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

const getRowClassName = (isSelected: boolean) => {
  const base = 'border-b border-white/10 cursor-pointer transition-colors';
  if (isSelected) {
    return `${base} bg-cyan-600/30 hover:bg-cyan-600/40`;
  }
  return `${base} hover:bg-white/10`;
};

export const PersonsTable = ({ data, loading, selectedId, onRowSelect }: PersonsTableProps) => {
  const [sorting, setSorting] = useState<SortingState>([]);

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
      <div className="rounded-lg border border-white/20 bg-white/5 backdrop-blur-sm overflow-hidden">
        <div className="p-8 text-center text-white/70">
          <div className="animate-pulse">Loading persons...</div>
        </div>
      </div>
    );
  }

  const hasNoData = data.length === 0;
  if (hasNoData) {
    return (
      <div className="rounded-lg border border-dashed border-white/30 p-12 text-center">
        <p className="text-lg font-medium text-white/70">No persons found</p>
        <p className="mt-1 text-sm text-white/60">Try adjusting your search or add some persons.</p>
      </div>
    );
  }

  const personLabel = data.length === 1 ? 'person' : 'persons';

  return (
    <div className="rounded-lg border border-white/20 bg-white/5 backdrop-blur-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-white/20 bg-white/10">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className="px-4 py-3 text-left text-sm font-semibold text-white cursor-pointer hover:bg-white/10 transition-colors select-none"
                  >
                    <div className="flex items-center gap-2">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                      {{
                        asc: <ChevronUp className="h-4 w-4" />,
                        desc: <ChevronDown className="h-4 w-4" />,
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
                    <td key={cell.id} className="px-4 py-3 text-sm text-white/90">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 text-sm text-white/60 border-t border-white/10">
        {data.length} {personLabel}
      </div>
    </div>
  );
};
