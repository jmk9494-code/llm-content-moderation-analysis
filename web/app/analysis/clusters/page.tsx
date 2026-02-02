'use client';

import { useAnalysis } from '@/app/analysis/AnalysisContext';
import { SemanticClustersView } from '@/components/SemanticClusters';
import { LoadingState } from '../summary/page';

export default function ClustersPage() {
    const { clusters, loading } = useAnalysis();

    if (loading) return <LoadingState />;

    return <SemanticClustersView clusters={clusters} />;
}
