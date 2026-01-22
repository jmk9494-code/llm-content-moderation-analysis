'use client';

import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    getExpandedRowModel,
    useReactTable,
    SortingState,
    ColumnFiltersState,
    VisibilityState,
    ExpandedState,
    Row,
} from '@tanstack/react-table';
import { useState, useEffect, useCallback, Fragment } from 'react';
import {
    ChevronDown,
    ChevronUp,
    ChevronsUpDown,
    Search,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Download,
    Columns,
    ChevronRight as ExpandIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    searchKey?: string;
    renderExpanded?: (row: TData) => React.ReactNode;
    exportFilename?: string;
}

export function DataTable<TData, TValue>({
    columns,
    data,
    searchKey,
    renderExpanded,
    exportFilename = 'export',
}: DataTableProps<TData, TValue>) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const [expanded, setExpanded] = useState<ExpandedState>({});
    const [showColumnMenu, setShowColumnMenu] = useState(false);

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        onColumnFiltersChange: setColumnFilters,
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        getExpandedRowModel: getExpandedRowModel(),
        onExpandedChange: setExpanded,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            expanded,
        },
    });

    // Keyboard shortcut for search focus
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
                const target = e.target as HTMLElement;
                if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                    const searchInput = document.querySelector('[data-search-input]') as HTMLInputElement;
                    searchInput?.focus();
                }
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Export to CSV
    const handleExport = useCallback(() => {
        const headers = table.getVisibleFlatColumns().map(col => col.id);
        const rows = table.getFilteredRowModel().rows.map(row =>
            headers.map(header => {
                const value = row.getValue(header);
                return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
            }).join(',')
        );
        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${exportFilename}_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    }, [table, exportFilename]);

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                {searchKey && (
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                        <input
                            data-search-input
                            placeholder="Search... (Press /)"
                            value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ''}
                            onChange={(event) =>
                                table.getColumn(searchKey)?.setFilterValue(event.target.value)
                            }
                            className="pl-9 h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                        />
                    </div>
                )}

                <div className="flex items-center gap-2">
                    {/* Column Visibility */}
                    <div className="relative">
                        <button
                            onClick={() => setShowColumnMenu(!showColumnMenu)}
                            className="inline-flex items-center gap-2 h-10 px-4 text-sm font-medium rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                            aria-label="Toggle columns"
                        >
                            <Columns className="h-4 w-4" />
                            Columns
                        </button>
                        <AnimatePresence>
                            {showColumnMenu && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="absolute right-0 top-12 z-10 w-48 rounded-md border border-slate-200 bg-white shadow-lg p-2"
                                >
                                    {table.getAllColumns()
                                        .filter(col => col.getCanHide())
                                        .map(col => (
                                            <label
                                                key={col.id}
                                                className="flex items-center gap-2 px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100 rounded cursor-pointer"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={col.getIsVisible()}
                                                    onChange={col.getToggleVisibilityHandler()}
                                                    className="rounded border-slate-300"
                                                />
                                                {col.id}
                                            </label>
                                        ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Export Button */}
                    <button
                        onClick={handleExport}
                        className="inline-flex items-center gap-2 h-10 px-4 text-sm font-medium rounded-md bg-indigo-600 hover:bg-indigo-700 text-white"
                        aria-label="Export to CSV"
                    >
                        <Download className="h-4 w-4" />
                        Export
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium">
                            {table.getHeaderGroups().map((headerGroup) => (
                                <tr key={headerGroup.id} className="border-b border-slate-200">
                                    {renderExpanded && <th className="w-10 px-2" />}
                                    {headerGroup.headers.map((header) => (
                                        <th key={header.id} className="h-12 px-4 align-middle whitespace-nowrap">
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(header.column.columnDef.header, header.getContext())}
                                        </th>
                                    ))}
                                </tr>
                            ))}
                        </thead>
                        <tbody>
                            {table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map((row) => (
                                    <Fragment key={row.id}>
                                        <tr
                                            data-state={row.getIsSelected() && 'selected'}
                                            className={`border-b border-slate-100 transition-colors hover:bg-slate-50 ${renderExpanded ? 'cursor-pointer' : ''
                                                } ${row.getIsExpanded() ? 'bg-slate-50' : ''}`}
                                            onClick={() => renderExpanded && row.toggleExpanded()}
                                        >
                                            {renderExpanded && (
                                                <td className="px-2">
                                                    <motion.div
                                                        animate={{ rotate: row.getIsExpanded() ? 90 : 0 }}
                                                        transition={{ duration: 0.2 }}
                                                    >
                                                        <ExpandIcon className="h-4 w-4 text-slate-400" />
                                                    </motion.div>
                                                </td>
                                            )}
                                            {row.getVisibleCells().map((cell) => (
                                                <td key={cell.id} className="p-4 align-middle">
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </td>
                                            ))}
                                        </tr>
                                        {/* Expanded Row */}
                                        <AnimatePresence>
                                            {row.getIsExpanded() && renderExpanded && (
                                                <tr>
                                                    <td colSpan={columns.length + 1} className="p-0">
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: 'auto', opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            transition={{ duration: 0.2 }}
                                                            className="overflow-hidden"
                                                        >
                                                            <div className="p-4 bg-slate-50 border-b border-slate-200">
                                                                {renderExpanded(row.original)}
                                                            </div>
                                                        </motion.div>
                                                    </td>
                                                </tr>
                                            )}
                                        </AnimatePresence>
                                    </Fragment>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={columns.length + (renderExpanded ? 1 : 0)} className="h-24 text-center text-slate-500">
                                        No results.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between flex-wrap gap-4 py-4">
                <div className="text-sm text-slate-500">
                    Showing {table.getRowModel().rows.length} of {table.getFilteredRowModel().rows.length} results
                    {table.getFilteredRowModel().rows.length !== data.length && (
                        <span className="ml-1">(filtered from {data.length} total)</span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    <button
                        className="h-9 w-9 flex items-center justify-center rounded-md border border-slate-200 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => table.setPageIndex(0)}
                        disabled={!table.getCanPreviousPage()}
                        aria-label="First page"
                    >
                        <ChevronsLeft className="h-4 w-4" />
                    </button>
                    <button
                        className="h-9 w-9 flex items-center justify-center rounded-md border border-slate-200 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                        aria-label="Previous page"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="px-3 text-sm text-slate-600">
                        Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                    </span>
                    <button
                        className="h-9 w-9 flex items-center justify-center rounded-md border border-slate-200 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                        aria-label="Next page"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                    <button
                        className="h-9 w-9 flex items-center justify-center rounded-md border border-slate-200 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                        disabled={!table.getCanNextPage()}
                        aria-label="Last page"
                    >
                        <ChevronsRight className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}

// Helper for sortable headers
export function SortableHeader({ column, title }: { column: any; title: string }) {
    return (
        <button
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="flex items-center hover:text-slate-900 focus:outline-none"
            aria-label={`Sort by ${title}`}
        >
            {title}
            {column.getIsSorted() === 'asc' ? (
                <ChevronUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
                <ChevronDown className="ml-2 h-4 w-4" />
            ) : (
                <ChevronsUpDown className="ml-2 h-4 w-4 text-slate-400" />
            )}
        </button>
    );
}
