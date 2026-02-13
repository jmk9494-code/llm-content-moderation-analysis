/**
 * Provider Logo Utility
 * 
 * Maps AI model names to their provider's logo using Google's S2 favicon service.
 * This is free, reliable, and requires no API key.
 */

const PROVIDER_MAP: Record<string, { name: string; domain: string }> = {
    'openai': { name: 'OpenAI', domain: 'openai.com' },
    'anthropic': { name: 'Anthropic', domain: 'anthropic.com' },
    'google': { name: 'Google', domain: 'deepmind.google' },
    'gemini': { name: 'Google', domain: 'deepmind.google' },
    'mistral': { name: 'Mistral AI', domain: 'mistral.ai' },
    'ministral': { name: 'Mistral AI', domain: 'mistral.ai' },
    'qwen': { name: 'Alibaba / Qwen', domain: 'qwenlm.ai' },
    'deepseek': { name: 'DeepSeek', domain: 'deepseek.com' },
    'grok': { name: 'xAI', domain: 'x.ai' },
    'llama': { name: 'Meta', domain: 'meta.com' },
    'meta': { name: 'Meta', domain: 'meta.com' },
    'phi': { name: 'Microsoft', domain: 'microsoft.com' },
    'microsoft': { name: 'Microsoft', domain: 'microsoft.com' },
    'cohere': { name: 'Cohere', domain: 'cohere.com' },
    'command': { name: 'Cohere', domain: 'cohere.com' },
    'yi': { name: '01.AI', domain: '01.ai' },
    '01-ai': { name: '01.AI', domain: '01.ai' },
    'x-ai': { name: 'xAI', domain: 'x.ai' },
};

/**
 * Get provider info from a model name.
 * Matches against known prefixes in the model name string.
 */
export function getProviderInfo(modelName: string): { name: string; domain: string } {
    const lower = modelName.toLowerCase();

    // Check for OpenAI o1/o3/o4 series
    if (/\bo[134]-/.test(lower) || lower.includes('gpt')) {
        return PROVIDER_MAP['openai'];
    }

    // Check for Claude models
    if (lower.includes('claude')) {
        return PROVIDER_MAP['anthropic'];
    }

    // Check provider prefix (e.g., "openai/gpt-4")
    const prefix = lower.split('/')[0];
    if (PROVIDER_MAP[prefix]) {
        return PROVIDER_MAP[prefix];
    }

    // Check substrings
    for (const [key, info] of Object.entries(PROVIDER_MAP)) {
        if (lower.includes(key)) {
            return info;
        }
    }

    return { name: 'Unknown', domain: 'openai.com' };
}

/**
 * Get a logo URL for a model using Google's S2 favicon service.
 * Returns high-resolution (128px) favicons. Free, no token needed.
 */
export function getLogoUrl(modelName: string, size: number = 128): string {
    const { domain } = getProviderInfo(modelName);
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
}

/**
 * Get the provider display name for a model.
 */
export function getProviderName(modelName: string): string {
    return getProviderInfo(modelName).name;
}
