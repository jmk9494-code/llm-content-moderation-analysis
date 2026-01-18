import Image from 'next/image';

const PROVIDER_DOMAINS: Record<string, string> = {
    'OpenAI': 'openai.com',
    'Anthropic': 'anthropic.com',
    'Google': 'google.com',
    'DeepSeek': 'deepseek.com',
    'Alibaba': 'alibaba.com',
    '01.AI': '01.ai',
    'Mistral AI': 'mistral.ai',
    'Microsoft': 'microsoft.com',
    'Meta': 'meta.com',
    'Cohere': 'cohere.com',
    'Databricks': 'databricks.com',
    'Nvidia': 'nvidia.com',
    'Perplexity': 'perplexity.ai',
    'Together': 'together.ai',
    'HuggingFace': 'huggingface.co',
};

// API Key provided by user
const LOGO_API_KEY = "pk_JCpYIPZHQjiSB9uwIkO50A";

function getLogoUrl(provider: string): string {
    const domain = PROVIDER_DOMAINS[provider] || 'openai.com'; // Default to something if unknown, or maybe generic
    return `https://img.logo.dev/${domain}?token=${LOGO_API_KEY}&size=60`;
}

export default function ModelLogo({ provider, name, className = "h-6 w-6" }: { provider: string, name: string, className?: string }) {
    const url = getLogoUrl(provider);

    return (
        <div className={`relative ${className} shrink-0 bg-white rounded-full overflow-hidden border border-slate-100`}>
            <img
                src={url}
                alt={`${provider} logo`}
                className="w-full h-full object-contain p-0.5"
                onError={(e) => {
                    // Fallback if logo fails
                    e.currentTarget.style.display = 'none';
                }}
            />
        </div>
    );
}
