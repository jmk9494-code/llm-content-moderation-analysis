'use client';

import { useRef, useState } from 'react';
import { Download, Loader2, Image, FileText, Check } from 'lucide-react';

interface ExportButtonProps {
    targetId?: string;
    filename?: string;
    className?: string;
}

/**
 * Export dashboard content to PNG or download CSV data
 */
export default function ExportButton({
    targetId = 'dashboard-content',
    filename = 'moderation-bias-export',
    className = ''
}: ExportButtonProps) {
    const [isExporting, setIsExporting] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);

    const exportToPNG = async () => {
        setIsExporting(true);
        setShowMenu(false);

        try {
            // Dynamically import html2canvas to keep bundle size down
            const html2canvas = (await import('html2canvas')).default;

            const element = document.getElementById(targetId);
            if (!element) {
                console.error(`Element with id "${targetId}" not found`);
                return;
            }

            const canvas = await html2canvas(element, {
                backgroundColor: '#f8fafc', // slate-50
                scale: 2, // Higher quality
                useCORS: true,
                logging: false,
            });

            // Create download link
            const link = document.createElement('a');
            link.download = `${filename}-${new Date().toISOString().split('T')[0]}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();

            setSuccess('PNG');
            setTimeout(() => setSuccess(null), 2000);
        } catch (error) {
            console.error('Failed to export PNG:', error);
            alert('Failed to export as PNG. Please try again.');
        } finally {
            setIsExporting(false);
        }
    };

    const exportToCSV = async () => {
        setIsExporting(true);
        setShowMenu(false);

        try {
            // Fetch the raw CSV data
            const response = await fetch('/audit_log.csv');
            const csvData = await response.text();

            // Create download link
            const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.download = `${filename}-data-${new Date().toISOString().split('T')[0]}.csv`;
            link.href = URL.createObjectURL(blob);
            link.click();
            URL.revokeObjectURL(link.href);

            setSuccess('CSV');
            setTimeout(() => setSuccess(null), 2000);
        } catch (error) {
            console.error('Failed to export CSV:', error);
            alert('Failed to export as CSV. Please try again.');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className={`relative ${className}`}>
            <button
                onClick={() => setShowMenu(!showMenu)}
                disabled={isExporting}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isExporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : success ? (
                    <Check className="h-4 w-4 text-emerald-300" />
                ) : (
                    <Download className="h-4 w-4" />
                )}
                {isExporting ? 'Exporting...' : success ? `${success} Downloaded!` : 'Export'}
            </button>

            {showMenu && !isExporting && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-50">
                    <button
                        onClick={exportToPNG}
                        className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-3 text-slate-700"
                    >
                        <Image className="h-4 w-4 text-indigo-500" />
                        <div>
                            <div className="font-medium">Export as PNG</div>
                            <div className="text-xs text-slate-400">Dashboard screenshot</div>
                        </div>
                    </button>
                    <button
                        onClick={exportToCSV}
                        className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-3 text-slate-700"
                    >
                        <FileText className="h-4 w-4 text-emerald-500" />
                        <div>
                            <div className="font-medium">Export as CSV</div>
                            <div className="text-xs text-slate-400">Raw audit data</div>
                        </div>
                    </button>
                </div>
            )}

            {/* Click outside to close */}
            {showMenu && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowMenu(false)}
                />
            )}
        </div>
    );
}
