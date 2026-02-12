'use client';

const LOGO_TOKEN = 'pk_Ja1WjMWYTkCwFS1VjADPcA';

interface ModelData {
    name: string;
    refusalRate: number;
    cost: number;
    displayName?: string;
}

interface RestrictivenessScaleProps {
    models: ModelData[];
    onModelClick?: (model: ModelData) => void;
}

// Map model name to a Logo.dev brand domain
function getBrandDomain(modelName: string): string {
    const name = modelName.toLowerCase();
    if (name.includes('gpt') || name.includes('openai') || name.includes('o1-') || name.includes('o3-') || name.includes('o4-')) return 'openai.com';
    if (name.includes('claude') || name.includes('anthropic')) return 'anthropic.com';
    if (name.includes('gemini') || name.includes('google')) return 'google.com';
    if (name.includes('mistral') || name.includes('ministral')) return 'mistral.ai';
    if (name.includes('qwen')) return 'alibaba.com';
    if (name.includes('deepseek')) return 'deepseek.com';
    if (name.includes('grok') || name.includes('x-ai')) return 'x.ai';
    if (name.includes('yi') || name.includes('01-ai')) return '01.ai';
    if (name.includes('llama') || name.includes('meta')) return 'meta.com';
    if (name.includes('phi') || name.includes('microsoft')) return 'microsoft.com';
    if (name.includes('command') || name.includes('cohere')) return 'cohere.com';
    return 'openai.com'; // fallback
}

function getLogoUrl(modelName: string): string {
    const domain = getBrandDomain(modelName);
    return `https://img.logo.dev/${domain}?token=${LOGO_TOKEN}&size=64&format=png`;
}

function getProviderName(modelName: string): string {
    const name = modelName.toLowerCase();
    if (name.includes('gpt') || name.includes('openai') || name.includes('o1-') || name.includes('o3-') || name.includes('o4-')) return 'OpenAI';
    if (name.includes('claude') || name.includes('anthropic')) return 'Anthropic';
    if (name.includes('gemini') || name.includes('google')) return 'Google';
    if (name.includes('mistral') || name.includes('ministral')) return 'Mistral AI';
    if (name.includes('qwen')) return 'Alibaba / Qwen';
    if (name.includes('deepseek')) return 'DeepSeek';
    if (name.includes('grok') || name.includes('x-ai')) return 'xAI';
    if (name.includes('yi') || name.includes('01-ai')) return '01.AI';
    if (name.includes('llama') || name.includes('meta')) return 'Meta';
    if (name.includes('phi') || name.includes('microsoft')) return 'Microsoft';
    if (name.includes('command') || name.includes('cohere')) return 'Cohere';
    return 'Unknown';
}

// Color based on refusal rate (0-1 scale)
function getRateColor(rate: number): string {
    if (rate < 0.1) return '#10b981';
    if (rate < 0.3) return '#f59e0b';
    if (rate < 0.6) return '#f97316';
    return '#ef4444';
}

export default function RestrictivenessScale({ models, onModelClick }: RestrictivenessScaleProps) {
    // Sort models by refusal rate (least to most restrictive)
    const sortedModels = [...models].sort((a, b) => a.refusalRate - b.refusalRate);

    return (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-8">
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        🎚️ Restrictiveness Spectrum
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Models ranked by refusal rate — least to most restrictive
                    </p>
                </div>
            </div>

            {/* Gradient bar */}
            <div className="mb-6">
                <div className="h-2 rounded-full bg-gradient-to-r from-green-200 via-yellow-200 via-orange-200 to-red-200" />
                <div className="flex justify-between text-xs text-slate-500 mt-2">
                    <span className="font-semibold">← Least Restrictive</span>
                    <span className="font-semibold">Most Restrictive →</span>
                </div>
            </div>

            {/* Model list */}
            <div className="space-y-3">
                {sortedModels.map((model) => {
                    const pct = (model.refusalRate * 100).toFixed(0);
                    return (
                        <div
                            key={model.name}
                            className="flex items-center gap-4 p-4 rounded-lg border border-slate-100 hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer"
                            onClick={() => onModelClick?.(model)}
                        >
                            {/* Provider Logo */}
                            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden">
                                <img
                                    src={getLogoUrl(model.name)}
                                    alt={getProviderName(model.name)}
                                    className="w-7 h-7 object-contain"
                                    loading="lazy"
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        if (target.parentElement) {
                                            target.parentElement.innerHTML = `<span class="text-sm font-bold text-slate-400">${getProviderName(model.name).charAt(0)}</span>`;
                                        }
                                    }}
                                />
                            </div>

                            {/* Model info */}
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-sm text-slate-900 truncate">
                                    {model.displayName || model.name}
                                </h3>
                                <p className="text-xs text-slate-400">
                                    {getProviderName(model.name)}
                                </p>
                            </div>

                            {/* Refusal bar (fills left to right proportionally) */}
                            <div className="hidden sm:block w-32">
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{
                                            width: `${model.refusalRate * 100}%`,
                                            backgroundColor: getRateColor(model.refusalRate)
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Percentage */}
                            <div className="flex-shrink-0 w-14 text-right">
                                <span
                                    className="text-xl font-black"
                                    style={{ color: getRateColor(model.refusalRate) }}
                                >
                                    {pct}%
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="mt-6 pt-4 border-t border-slate-200">
                <div className="flex flex-wrap gap-4 text-xs">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span className="text-slate-600">Permissive (&lt;10%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                        <span className="text-slate-600">Moderate (10-30%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-orange-500" />
                        <span className="text-slate-600">Restrictive (30-60%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <span className="text-slate-600">Very Restrictive (&gt;60%)</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
