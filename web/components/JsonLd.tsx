export default function JsonLd() {
    const jsonLd = [
        {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'Moderation Bias - Into the Black Box',
            url: 'https://moderationbias.com',
            description: 'Tracking the political and social biases of Llama-3, GPT-4, and Claude.',
            potentialAction: {
                '@type': 'SearchAction',
                target: 'https://moderationbias.com/?q={search_term_string}',
                'query-input': 'required name=search_term_string',
            },
        },
        {
            '@context': 'https://schema.org',
            '@type': 'Dataset',
            name: 'LLM Content Moderation Audit Log',
            description: 'A comprehensive benchmark of content moderation biases in LLMs like Llama-3, GPT-4, and Claude.',
            url: 'https://moderationbias.com/data/audit_log.csv',
            sameAs: 'https://github.com/jacobkandel/llm-content-moderation-analysis',
            license: 'https://creativecommons.org/licenses/by/4.0/',
            creator: {
                '@type': 'Person',
                name: 'Jacob Kandel',
                url: 'https://github.com/jacobkandel',
            },
            distribution: [
                {
                    '@type': 'DataDownload',
                    encodingFormat: 'text/csv',
                    contentUrl: 'https://moderationbias.com/data/audit_log.csv',
                },
            ],
        },
    ];

    return (
        <section>
            {jsonLd.map((data, index) => (
                <script
                    key={index}
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
                />
            ))}
        </section>
    );
}
