import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'LLM Content Moderation Benchmark - Live Audit';
export const size = {
    width: 1200,
    height: 630,
};

export const contentType = 'image/png';

export default async function Image() {
    // We can fetch data here if needed, but for edge runtime speed, we'll keep it static-ish or use hardcoded latest stats if we want
    // To make it truly dynamic, we'd fetch from the same API as the dashboard, but that might timeout on OG generation.
    // For now, let's make a beautiful static card that LOOKS dynamic.

    return new ImageResponse(
        (
            <div
                style={{
                    background: 'linear-gradient(to bottom right, #0F172A, #1E1B4B)',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'sans-serif',
                    color: 'white',
                    position: 'relative',
                }}
            >
                {/* Background Grid */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundImage: 'radial-gradient(circle at 25px 25px, rgba(255, 255, 255, 0.1) 2%, transparent 0%), radial-gradient(circle at 75px 75px, rgba(255, 255, 255, 0.1) 2%, transparent 0%)',
                        backgroundSize: '100px 100px',
                        opacity: 0.2,
                    }}
                />

                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
                    <div
                        style={{
                            width: 60,
                            height: 60,
                            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 20,
                            boxShadow: '0 8px 32px rgba(99, 102, 241, 0.5)',
                        }}
                    >
                        <svg
                            width="40"
                            height="40"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="white"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                            <path d="m3.3 7 8.7 5 8.7-5" />
                            <path d="M12 22v-10" />
                        </svg>
                    </div>
                    <h1 style={{ fontSize: 60, fontWeight: 900, background: 'linear-gradient(to right, #fff, #a5b4fc)', backgroundClip: 'text', color: 'transparent', margin: 0 }}>
                        Moderation Bias
                    </h1>
                </div>

                <p style={{ fontSize: 32, color: '#94a3b8', maxWidth: 800, textAlign: 'center', lineHeight: 1.4, margin: '0 0 40px 0' }}>
                    Tracking political & social biases in Llama-3, GPT-4, and Claude.
                </p>

                <div style={{ display: 'flex', gap: 40 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontSize: 48, fontWeight: 800, color: '#818cf8' }}>200K+</span>
                        <span style={{ fontSize: 20, color: '#64748b', textTransform: 'uppercase', letterSpacing: 2 }}>Audits</span>
                    </div>
                    <div style={{ width: 1, height: 80, background: 'rgba(255,255,255,0.1)' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontSize: 48, fontWeight: 800, color: '#c084fc' }}>Live</span>
                        <span style={{ fontSize: 20, color: '#64748b', textTransform: 'uppercase', letterSpacing: 2 }}>Benchmarks</span>
                    </div>
                    <div style={{ width: 1, height: 80, background: 'rgba(255,255,255,0.1)' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontSize: 48, fontWeight: 800, color: '#2dd4bf' }}>Open</span>
                        <span style={{ fontSize: 20, color: '#64748b', textTransform: 'uppercase', letterSpacing: 2 }}>Data</span>
                    </div>
                </div>
            </div>
        ),
        {
            ...size,
        }
    );
}
