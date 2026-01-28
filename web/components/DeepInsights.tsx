
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar } from 'recharts';
import { Scale, Zap, Activity } from 'lucide-react';

interface DeepInsightsProps {
    driftData?: any[];
    consensusData?: any[];
}

export function DeepInsights({ driftData = [], consensusData = [] }: DeepInsightsProps) {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. Consensus / Agreement */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Scale className="h-5 w-5 text-indigo-500" />
                            Council Consensus
                        </CardTitle>
                        <CardDescription>
                            Agreement level among 3 judges on refusal reasons.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        {consensusData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={consensusData}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                    <XAxis dataKey="model" fontSize={11} angle={-15} textAnchor="end" height={60} />
                                    <YAxis domain={[0, 1]} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                    />
                                    <Bar dataKey="agreement_score" fill="#6366f1" name="Agreement Score" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                No consensus data available. Run analysis first.
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* 2. Drift / Stability */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="h-5 w-5 text-rose-500" />
                            Model Stability (Drift)
                        </CardTitle>
                        <CardDescription>
                            Change in Refusal Rate (Start vs End Date).
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        {driftData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={driftData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                    <XAxis type="number" domain={[-20, 20]} />
                                    <YAxis dataKey="model" type="category" width={100} fontSize={11} />
                                    <Tooltip />
                                    <Bar dataKey="rate_change" fill="#f43f5e" name="Rate Change (%)" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                No drift data available.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
