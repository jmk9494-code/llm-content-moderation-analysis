import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Moderation Bias',
        short_name: 'ModBias',
        description: 'Tracking the political and social biases of Llama-3, GPT-4, and Claude via automated red-teaming.',
        start_url: '/',
        display: 'standalone',
        background_color: '#0B0C15',
        theme_color: '#0B0C15',
        icons: [
            {
                src: '/favicon.ico',
                sizes: 'any',
                type: 'image/x-icon',
            },
            {
                src: '/assets/heatmap.png',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: '/assets/heatmap.png',
                sizes: '512x512',
                type: 'image/png',
            }
        ],
    };
}
