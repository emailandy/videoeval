"use client";

import React, { useEffect, useState } from 'react';
import ScoreGauge from '@/components/ScoreGauge';
import ABCDAnalysis from '@/components/ABCDAnalysis';

import { useParams } from 'next/navigation';
import { AlertTriangle, CheckCircle, XCircle, FileText, Play } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { fetchEvaluationDetail, DetailedEvaluation } from '@/lib/api';

export default function EvaluationDetailPage() {
    const params = useParams();
    const id = params?.id as string;
    const [data, setData] = useState<DetailedEvaluation | null>(null);
    const [loading, setLoading] = useState(true);

    // Helper to extract clean filename and campaign from ID
    const parseId = (rawId: string) => {
        const decoded = decodeURIComponent(rawId);
        if (decoded.includes('::')) {
            const [campaign, filename] = decoded.split('::', 2);
            return { campaign, filename };
        }
        return { campaign: 'Unknown', filename: decoded };
    };

    const displayInfo = id ? parseId(id) : { campaign: '', filename: '' };

    // Helper to format feature IDs into readable text
    const formatFeatureName = (id: string) => {
        if (!id) return null;
        return id
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    const loadData = () => {
        if (id) {
            setLoading(true);
            fetchEvaluationDetail(decodeURIComponent(id))
                .then(setData)
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    };

    useEffect(() => {
        loadData();
    }, [id]);

    if (loading) return <div>Loading details...</div>;
    if (!data) return <div>Evaluation not found.</div>;

    const abcd = data.individual_checks?.abcd_agent;
    const sync = data.individual_checks?.av_sync_checker;
    const artifacts = data.individual_checks?.visual_artifact_checker;
    const audio = data.individual_checks?.audio_realism_checker;

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center border-b border-gray-100 pb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 truncate max-w-2xl" title={displayInfo.filename}>
                        {displayInfo.filename}
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                            {displayInfo.campaign}
                        </span>
                        <p className="text-gray-500 text-sm">Evaluation Details</p>
                    </div>
                </div>
            </div>

            {/* Overall Performance Section */}
            <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <CheckCircle size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Overall Performance</h2>
                        <p className="text-sm text-gray-500">Combined score based on technical and creative metrics</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-center">
                    <div className="flex justify-center md:border-r border-gray-100 pr-8">
                        <ScoreGauge score={data.overall_score ?? abcd?.score_0_to_100 ?? 0} />
                    </div>

                    <div className="col-span-2 space-y-6">
                        <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <AlertTriangle size={18} className="text-gray-400" />
                                Technical Health Check
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="flex justify-between items-center p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                                    <span className="font-medium text-gray-700">Audio/Video Sync</span>
                                    {sync?.has_sync_issues ?
                                        <span className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-1 rounded-full text-sm font-medium border border-red-100"><XCircle size={14} /> Issues</span> :
                                        <span className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1 rounded-full text-sm font-medium border border-green-100"><CheckCircle size={14} /> Pass</span>
                                    }
                                </div>
                                <div className="flex justify-between items-center p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                                    <span className="font-medium text-gray-700">Visual Artifacts</span>
                                    {artifacts?.has_visual_issues ?
                                        <span className="flex items-center gap-2 text-yellow-600 bg-yellow-50 px-3 py-1 rounded-full text-sm font-medium border border-yellow-100"><AlertTriangle size={14} /> Warning</span> :
                                        <span className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1 rounded-full text-sm font-medium border border-green-100"><CheckCircle size={14} /> Clean</span>
                                    }
                                </div>
                                <div className="flex justify-between items-center p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                                    <span className="font-medium text-gray-700">Audio Realism</span>
                                    {audio?.has_audio_issues ?
                                        <span className="flex items-center gap-2 text-yellow-600 bg-yellow-50 px-3 py-1 rounded-full text-sm font-medium border border-yellow-100"><AlertTriangle size={14} /> Warning</span> :
                                        <span className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1 rounded-full text-sm font-medium border border-green-100"><CheckCircle size={14} /> Clean</span>
                                    }
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ABCD Analysis - Now Full Width Below Overall Performance */}
            {abcd?.abcd_features && (
                <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
                    <ABCDAnalysis features={abcd.abcd_features} />
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Issues Log */}
                <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-fit">
                    <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
                        <AlertTriangle className="text-orange-500" />
                        <h3 className="text-lg font-semibold text-gray-900">Issues Log</h3>
                    </div>
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                        {sync?.issues_log?.map((issue: any, idx: number) => (
                            <div key={`sync-${idx}`} className="p-4 bg-red-50 text-red-900 rounded-lg border border-red-100 text-sm">
                                <div className="font-semibold flex items-center gap-2 mb-1">
                                    <AlertTriangle size={14} />
                                    Sync Issue ({issue.timestamp})
                                </div>
                                <p className="opacity-90 leading-relaxed">{issue.description}</p>
                            </div>
                        ))}
                        {artifacts?.issues_log?.map((issue: any, idx: number) => (
                            <div key={`art-${idx}`} className="p-4 bg-yellow-50 text-yellow-900 rounded-lg border border-yellow-100 text-sm">
                                <div className="font-semibold flex items-center gap-2 mb-1">
                                    <AlertTriangle size={14} />
                                    Visual Artifact ({issue.timestamp})
                                </div>
                                <p className="opacity-90 leading-relaxed">{issue.description}</p>
                            </div>
                        ))}
                        {audio?.issues_log?.map((issue: any, idx: number) => (
                            <div key={`audio-${idx}`} className="p-4 bg-yellow-50 text-yellow-900 rounded-lg border border-yellow-100 text-sm">
                                <div className="font-semibold flex items-center gap-2 mb-1">
                                    <AlertTriangle size={14} />
                                    Audio Realism ({issue.timestamp})
                                </div>
                                <p className="opacity-90 leading-relaxed">{issue.description}</p>
                            </div>
                        ))}
                        {(!sync?.issues_log?.length && !artifacts?.issues_log?.length && !audio?.issues_log?.length) && (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-400 bg-gray-50 rounded-lg border border-gray-100 border-dashed">
                                <CheckCircle size={32} className="mb-2 text-green-500 opacity-50" />
                                <p className="text-sm">No critical issues found</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Executive Summary */}
                {data.final_report && (
                    <div className="lg:col-span-1 bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
                            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                                <FileText size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Executive Summary</h3>
                                <p className="text-sm text-gray-500">AI-generated synthesis of all findings</p>
                            </div>
                        </div>
                        <div className="prose prose-blue max-w-none text-gray-700 leading-relaxed">
                            <ReactMarkdown>{data.final_report}</ReactMarkdown>
                        </div>
                    </div>
                )}

                {/* Deduplication Log - Now Side Card */}
                {data.deduplications_log && data.deduplications_log.length > 0 && (
                    <div className="lg:col-span-1 bg-white p-8 rounded-xl border border-gray-200 shadow-sm h-fit">
                        <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                <CheckCircle size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Deduplication Log</h3>
                                <p className="text-sm text-gray-500">Rules applied to merge redundant findings</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {data.deduplications_log.map((log: string, idx: number) => (
                                <div key={`dedup-${idx}`} className="p-3 bg-gray-50 text-gray-700 rounded-lg border border-gray-100 text-sm flex gap-2">
                                    <div className="mt-0.5 text-blue-500">
                                        <CheckCircle size={14} />
                                    </div>
                                    <span>{log}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {data.deduplications_log && data.deduplications_log.length === 0 && (
                        <div className="lg:col-span-1 bg-white p-8 rounded-xl border border-gray-200 shadow-sm h-fit">
                            <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                    <CheckCircle size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">Deduplication Log</h3>
                                    <p className="text-sm text-gray-500">Rules applied to merge redundant findings</p>
                                </div>
                            </div>
                            <div className="flex flex-col items-center justify-center py-12 text-gray-400 bg-gray-50 rounded-lg border border-gray-100 border-dashed">
                                <CheckCircle size={32} className="mb-2 text-green-500 opacity-50" />
                                <p className="text-sm">No duplicate issues merged</p>
                            </div>
                        </div>
                )}
            </div>
        </div>
    );
}
