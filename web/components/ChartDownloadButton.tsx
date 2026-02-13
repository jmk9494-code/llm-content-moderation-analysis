'use client';

import { Download } from 'lucide-react';
import { useState } from 'react';

interface ChartDownloadButtonProps {
    chartId: string;
    chartTitle: string;
    format?: 'png' | 'svg';
}

export default function ChartDownloadButton({ chartId, chartTitle, format = 'png' }: ChartDownloadButtonProps) {
    const [downloading, setDownloading] = useState(false);

    const handleDownload = async () => {
        setDownloading(true);
        try {
            const element = document.getElementById(chartId);
            if (!element) {
                console.error(`Chart element with id "${chartId}" not found`);
                return;
            }

            if (format === 'svg') {
                // Handle SVG download
                const svgElement = element.querySelector('svg');
                if (svgElement) {
                    const svgData = new XMLSerializer().serializeToString(svgElement);
                    const blob = new Blob([svgData], { type: 'image/svg+xml' });
                    downloadBlob(blob, `${chartTitle}.svg`);
                }
            } else {
                // Handle PNG download using html2canvas or similar
                // For now, we'll use a simple screenshot approach
                const canvas = await import('html2canvas').then(mod => mod.default);
                const canvasEl = await canvas(element, {
                    backgroundColor: '#ffffff',
                    scale: 2, // Higher quality
                });

                canvasEl.toBlob((blob) => {
                    if (blob) {
                        downloadBlob(blob, `${chartTitle}.png`);
                    }
                });
            }
        } catch (error) {
            console.error('Download failed:', error);
        } finally {
            setDownloading(false);
        }
    };

    const downloadBlob = (blob: Blob, filename: string) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
            title={`Download chart as ${format.toUpperCase()}`}
        >
            <Download className={`w-4 h-4 ${downloading ? 'animate-bounce' : ''}`} />
            <span>{downloading ? 'Downloading...' : 'Download'}</span>
        </button>
    );
}
