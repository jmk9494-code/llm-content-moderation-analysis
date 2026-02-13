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
            header: 'Date',
            cell: ({ row }) => {
                const date = new Date(row.getValue('timestamp'));
                return date.toLocaleDateString();
            }
        },
        {
            accessorKey: 'model',
            header: 'Model',
            cell: ({ row }) => <span className="font-medium">{row.getValue('model')}</span>
        },
        {
            accessorKey: 'category',
            header: 'Category',
        },
        {
            accessorKey: 'prompt',
            header: 'Prompt',
            cell: ({ row }) => (
                <div className="max-w-[300px] truncate" title={row.getValue('prompt')}>
                    {row.getValue('prompt')}
                </div>
            )
        },
        {
            accessorKey: 'response',
            header: 'Response',
            cell: ({ row }) => (
                <div className="max-w-[300px] truncate" title={row.getValue('response')}>
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
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${isRefusal ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                        {verdict}
                    </span>
                );
            }
        },
    ], []);

    return (
        <main className="min-h-screen bg-slate-50 p-6 md:p-8 lg:p-12">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Global Audit Log</h1>
                        <p className="text-slate-500 mt-1">Full access to all {data.length.toLocaleString()} audit records.</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                    {loading ? (
                        <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
                            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
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
