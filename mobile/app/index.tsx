import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { useState, useEffect, useMemo } from 'react';
import { Stack } from 'expo-router';
import { fetchMobileAuditData, type AuditRow } from '../lib/api';
import { ShieldCheck, AlertTriangle, Activity } from 'lucide-react-native';

export default function Dashboard() {
    const [data, setData] = useState<AuditRow[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = async () => {
        const res = await fetchMobileAuditData();
        setData(res);
    };

    useEffect(() => {
        loadData();
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const stats = useMemo(() => {
        if (data.length === 0) return { total: 0, refusalRate: 0, safe: 0 };
        const total = data.length;
        const refused = data.filter(d => ['REFUSAL', 'REMOVED', 'unsafe', 'Hard Refusal'].includes(d.verdict)).length;
        return {
            total,
            refusalRate: (refused / total) * 100,
            safe: total - refused
        };
    }, [data]);

    return (
        <ScrollView
            className="bg-slate-50 flex-1 p-4"
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            <Stack.Screen options={{ title: '🛡️ Safety Monitor' }} />

            <View className="mb-6">
                <Text className="text-2xl font-bold text-slate-900">Live Overview</Text>
                <Text className="text-slate-500">Monitoring {stats.total.toLocaleString()} audits</Text>
            </View>

            <View className="flex-row gap-4 mb-6">
                <View className="flex-1 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <ShieldCheck size={24} color="#6366f1" />
                    <Text className="text-2xl font-bold mt-2 text-slate-900">{(100 - stats.refusalRate).toFixed(1)}%</Text>
                    <Text className="text-xs text-slate-500">Pass Rate</Text>
                </View>
                <View className="flex-1 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <AlertTriangle size={24} color="#ef4444" />
                    <Text className="text-2xl font-bold mt-2 text-slate-900">{stats.refusalRate.toFixed(1)}%</Text>
                    <Text className="text-xs text-slate-500">Refusal Rate</Text>
                </View>
            </View>

            <View className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
                <View className="p-4 border-b border-slate-100 flex-row justify-between items-center">
                    <Text className="font-bold text-lg text-slate-800">Latest Traces</Text>
                    <Activity size={16} color="#94a3b8" />
                </View>
                {data.slice(0, 10).map((row, i) => (
                    <View key={i} className="p-4 border-b border-slate-50 flex-row gap-3">
                        <View className={`w-1 h-full rounded-full ${['REFUSAL', 'unsafe'].includes(row.verdict) ? 'bg-red-500' : 'bg-green-500'}`} />
                        <View className="flex-1">
                            <Text className="font-bold text-slate-800 text-sm mb-1">{row.model}</Text>
                            <Text className="text-slate-600 text-xs line-clamp-2 leading-relaxed" numberOfLines={2}>{row.prompt}</Text>
                            <View className="flex-row justify-between mt-2">
                                <Text className="text-[10px] text-slate-400">{row.timestamp.split('T')[0]}</Text>
                                <Text className={`text-[10px] font-bold ${['REFUSAL', 'unsafe'].includes(row.verdict) ? 'text-red-500' : 'text-green-500'}`}>
                                    {row.verdict.toUpperCase()}
                                </Text>
                            </View>
                        </View>
                    </View>
                ))}
            </View>
        </ScrollView>
    );
}
