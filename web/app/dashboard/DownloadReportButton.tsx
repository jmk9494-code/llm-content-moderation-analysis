'use client';

import { Download } from 'lucide-react';

export default function DownloadReportButton() {
    const handleDownload = () => {
        // Simple and robust: Print to PDF
        window.print();
    };

    return (
        <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow-sm text-sm"
        >
            <Download className="h-4 w-4" />
            Print Report
        </button>
    );
}
