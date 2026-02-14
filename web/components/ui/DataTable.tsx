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
import { useState, useEffect, useCallback, Fragment, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
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

    // Virtualization
    const { rows } = table.getRowModel();
    const parentRef = useRef<HTMLDivElement>(null);

    const virtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 50,
        overscan: 20,
    });

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                {searchKey && (
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input
                            data-search-input
                            placeholder="Search... (Press /)"
                            value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ''}
                            onChange={(event) =>
                                table.getColumn(searchKey)?.setFilterValue(event.target.value)
                            }
                            className="pl-9 h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 text-foreground"
                        />
                    </div>
                )}

                <div className="flex items-center gap-2">
                    {/* Column Visibility */}
                    <div className="relative">
                        <button
                            onClick={() => setShowColumnMenu(!showColumnMenu)}
                            className="inline-flex items-center gap-2 h-10 px-4 text-sm font-medium rounded-md border border-border bg-background hover:bg-muted/50 text-foreground"
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
                                    className="absolute right-0 top-12 z-10 w-48 rounded-md border border-border bg-popover shadow-lg p-2 text-popover-foreground"
                                >
                                    {table.getAllColumns()
                                        .filter(col => col.getCanHide())
                                        .map(col => (
                                            <label
                                                key={col.id}
                                                className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-muted/50 rounded cursor-pointer"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={col.getIsVisible()}
                                                    onChange={col.getToggleVisibilityHandler()}
                                                    className="rounded border-border bg-background"
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
                        className="inline-flex items-center gap-2 h-10 px-4 text-sm font-medium rounded-md bg-primary hover:bg-primary/90 text-primary-foreground"
                        aria-label="Export to CSV"
                    >
                        <Download className="h-4 w-4" />
                        Export
                    </button>
                </div>
            </div>

            {/* Virtualized Table Container */}
            <div
                ref={parentRef}
                className="rounded-lg border border-border bg-card shadow-sm overflow-auto text-card-foreground h-[700px] relative"
            >
                <div
                    style={{
                        height: `${virtualizer.getTotalSize()}px`,
                        width: '100%',
                        position: 'relative',
                    }}
                >
                    <table className="w-full text-sm text-left absolute top-0 left-0" style={{ transform: `translateY(${virtualizer.getVirtualItems()[0]?.start ?? 0}px)` }}>
                        <thead className="bg-muted/50 text-muted-foreground font-medium flex w-full sticky top-0 z-10">
                            {table.getHeaderGroups().map(headerGroup => (
                                <tr key={headerGroup.id} className="flex w-full border-b border-border">
                                    {renderExpanded && <th className="w-10 px-2 shrink-0 bg-muted/50" />}
                                    {headerGroup.headers.map(header => (
                                        <th key={header.id} className="h-12 px-4 flex items-center shrink-0 grow basis-0 bg-muted/50" style={{ width: header.getSize() }}>
                                            {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                        </th>
                                    ))}
                                </tr>
                            ))}
                        </thead>

                        <tbody className="block">
                            {virtualizer.getVirtualItems().map((virtualRow) => {
                                const row = rows[virtualRow.index];
                                return (
                                    <Fragment key={row.id}>
                                        <tr
                                            data-index={virtualRow.index}
                                            ref={virtualizer.measureElement}
                                            data-state={row.getIsSelected() && 'selected'}
                                            className={`flex w-full border-b border-border transition-colors hover:bg-muted/50 ${renderExpanded ? 'cursor-pointer' : ''} ${row.getIsExpanded() ? 'bg-muted/50' : ''}`}
                                            onClick={() => renderExpanded && row.toggleExpanded()}
                                        >
                                            {renderExpanded && (
                                                <td className="w-10 px-2 shrink-0 flex items-center justify-center">
                                                    <motion.div animate={{ rotate: row.getIsExpanded() ? 90 : 0 }} transition={{ duration: 0.2 }}>
                                                        <ExpandIcon className="h-4 w-4 text-muted-foreground" />
                                                    </motion.div>
                                                </td>
                                            )}
                                            {row.getVisibleCells().map(cell => (
                                                <td key={cell.id} className="p-4 flex items-center shrink-0 grow basis-0" style={{ width: cell.column.getSize() }}>
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </td>
                                            ))}
                                        </tr>
                                        {row.getIsExpanded() && renderExpanded && (
                                            <tr className="flex w-full">
                                                <td className="w-full p-0 block">
                                                    <div className="p-4 bg-muted/30 border-b border-border text-foreground">
                                                        {renderExpanded(row.original)}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="flex items-center justify-between py-4 text-muted-foreground">
                <div className="text-sm">
                    Showing {rows.length} records (Scroll for more)
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
            className="flex items-center hover:text-foreground focus:outline-none"
            aria-label={`Sort by ${title}`}
        >
            {title}
            {column.getIsSorted() === 'asc' ? (
                <ChevronUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
                <ChevronDown className="ml-2 h-4 w-4" />
            ) : (
                <ChevronsUpDown className="ml-2 h-4 w-4 text-muted-foreground" />
            )}
        </button>
    );
}
