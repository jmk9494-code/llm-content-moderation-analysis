import { getLogoUrl, getProviderName } from '@/lib/provider-logos';

export default function ModelLogo({ provider, name, className = "h-6 w-6" }: { provider: string, name: string, className?: string }) {
    const url = getLogoUrl(name || provider);

    return (
        <div className={`relative ${className} shrink-0 bg-white rounded-full overflow-hidden border border-slate-100`}>
            <img
                src={url}
                alt={`${provider} logo`}
                className="w-full h-full object-contain p-0.5"
                onError={(e) => {
                    e.currentTarget.style.display = 'none';
                }}
            />
        </div>
    );
}
