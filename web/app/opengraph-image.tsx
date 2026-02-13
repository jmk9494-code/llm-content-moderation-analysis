import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'Censorship Amongst AIs - Live Benchmark';
export const size = {
    width: 1200,
    height: 630,
};

export const contentType = 'image/png';

export default async function Image() {
    return new ImageResponse(
        (
            <div
                style={{
                    background: '#0B0C15',
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
                {/* Background Gradients */}
                <div style={{ position: 'absolute', top: -100, left: -100, width: 600, height: 600, background: 'rgba(99, 102, 241, 0.15)', filter: 'blur(100px)', borderRadius: '50%' }} />
                <div style={{ position: 'absolute', bottom: -100, right: -100, width: 600, height: 600, background: 'rgba(168, 85, 247, 0.15)', filter: 'blur(100px)', borderRadius: '50%' }} />

                {/* Content Container */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 10, textAlign: 'center', padding: '0 60px' }}>

                    {/* Badge */}
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        padding: '8px 20px',
                        borderRadius: '50px',
                        fontSize: 18,
                        fontWeight: 600,
                        color: '#cbd5e1',
                        marginBottom: 30,
                        textTransform: 'uppercase',
                        letterSpacing: '2px'
                    }}>
                        Live Audit Log
                    </div>

                    <h1 style={{
                        fontSize: 80,
                        fontWeight: 900,
                        lineHeight: 1.1,
                        margin: '0 0 30px 0',
                        background: 'linear-gradient(to right, #fff, #a5b4fc)',
                        backgroundClip: 'text',
                        color: 'transparent',
                        textShadow: '0 10px 30px rgba(0,0,0,0.5)'
                    }}>
                        Censorship Amongst AIs
                    </h1>

                    <p style={{
                        fontSize: 32,
                        color: '#94a3b8',
                        marginBottom: 60,
                        maxWidth: 900,
                        lineHeight: 1.4
                    }}>
                        Tracking political bias and refusal rates in <span style={{ color: '#fff', fontWeight: 700 }}>Llama-3</span>, <span style={{ color: '#fff', fontWeight: 700 }}>GPT-4</span>, and <span style={{ color: '#fff', fontWeight: 700 }}>Claude</span>.
                    </p>

                    {/* Stats Row */}
                    <div style={{
                        display: 'flex',
                        gap: 20,
                        background: 'rgba(15, 23, 42, 0.6)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        padding: '20px 40px',
                        borderRadius: '24px',
                        backdropFilter: 'blur(10px)'
                    }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 30px' }}>
                            <span style={{ fontSize: 42, fontWeight: 800, color: '#f43f5e' }}>Refusal</span>
                            <span style={{ fontSize: 16, color: '#94a3b8', marginTop: 5, textTransform: 'uppercase' }}>Tracking</span>
                        </div>
                        <div style={{ width: 1, height: 70, background: 'rgba(255,255,255,0.1)' }} />
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 30px' }}>
                            <span style={{ fontSize: 42, fontWeight: 800, color: '#818cf8' }}>Bias</span>
                            <span style={{ fontSize: 16, color: '#94a3b8', marginTop: 5, textTransform: 'uppercase' }}>Analysis</span>
                        </div>
                        <div style={{ width: 1, height: 70, background: 'rgba(255,255,255,0.1)' }} />
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 30px' }}>
                            <span style={{ fontSize: 42, fontWeight: 800, color: '#2dd4bf' }}>200K+</span>
                            <span style={{ fontSize: 16, color: '#94a3b8', marginTop: 5, textTransform: 'uppercase' }}>Records</span>
                        </div>
                    </div>

                </div>
            </div>
        ),
        {
            ...size,
        }
    );
}
