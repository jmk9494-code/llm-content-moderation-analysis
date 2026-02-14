'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { fetchAuditData, type AuditRow } from '@/lib/data-loading';
import { DataTable } from '@/components/ui/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { Loader2 } from 'lucide-react';

export default function AuditPage() {
    const [data, setData] = useState<AuditRow[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            try {
                const rows = await fetchAuditData();
                setData(rows);
            } catch (error) {
                console.error('Failed to load audit data:', error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    const columns = useMemo<ColumnDef<AuditRow>[]>(() => [
        {
            accessorKey: 'timestamp',
            header: () => <span className="hidden md:inline">Date</span>,
            cell: ({ row }) => {
                const date = new Date(row.getValue('timestamp'));
                return <span className="hidden md:inline">{date.toLocaleDateString()}</span>;
            }
        },
        {
            accessorKey: 'model',
            header: 'Model',
            cell: ({ row }) => <span className="font-medium text-xs md:text-sm">{row.getValue('model')}</span>
        },
        {
            accessorKey: 'category',
            header: () => <span className="hidden lg:inline">Category</span>,
            cell: ({ row }) => <span className="hidden lg:inline">{row.getValue('category')}</span>
        },
        {
            accessorKey: 'prompt',
            header: 'Prompt',
            cell: ({ row }) => (
                <div className="max-w-[120px] lg:max-w-[200px] truncate" title={row.getValue('prompt')}>
                    {row.getValue('prompt')}
                </div>
            )
        },
        {
            accessorKey: 'response',
            header: () => <span className="hidden sm:inline">Response</span>,
            cell: ({ row }) => (
                <div className="hidden sm:block max-w-[150px] lg:max-w-[200px] truncate" title={row.getValue('response')}>
                    {row.getValue('response')}
                </div>
            )
        },
        {
            accessorKey: 'verdict',
            header: 'Verdict',
            cell: ({ row }) => {
                const verdict = String(row.getValue('verdict'));
                const isRefusal = ['REFUSAL', 'REMOVED', 'unsafe', 'Hard Refusal'].includes(verdict);
                return (
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold font-sans border ${isRefusal
                        ? 'bg-[#800000] text-white border-[#800000]'
                        : 'bg-zinc-100 text-zinc-700 border-zinc-200'
                        }`}>
                        {verdict}
                    </span>
                );
            }
        },
    ], []);

    return (
        <main className="min-h-screen bg-background p-6 md:p-8 lg:p-12">
            <div className="w-full max-w-[95vw] mx-auto space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Global Audit Log</h1>
                        <p className="text-muted-foreground mt-1">Full access to all {data.length.toLocaleString()} audit records.</p>
                    </div>
                </div>

                <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-3">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p>Loading audit data...</p>
                        </div>
                    ) : (
                        <DataTable columns={columns} data={data} exportFilename="moderation_audit_full" />
                    )}
                </div>
            </div>
        </main>
    );
}
