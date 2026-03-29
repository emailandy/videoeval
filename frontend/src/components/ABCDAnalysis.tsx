"use client";

import React, { useState } from 'react';
import { ABCD_CATEGORIES, getFeatureCategory, formatFeatureName } from '@/lib/abcd-mapping';
import { ChevronDown, ChevronUp, CheckCircle, XCircle, HelpCircle } from 'lucide-react';

interface Feature {
    id: string;
    detected: boolean;
    confidence_score: number;
    explanation?: string;
    evaluation?: any;
    label?: string;
}

interface ABCDAnalysisProps {
    features: Feature[];
}

export default function ABCDAnalysis({ features }: ABCDAnalysisProps) {
    // Group features by category
    const grouped = ABCD_CATEGORIES.map(cat => ({
        ...cat,
        items: features.filter(f => getFeatureCategory(f.id)?.id === cat.id)
    }));

    // Find features that didn't match any category
    const uncategorized = features.filter(f => !getFeatureCategory(f.id));

    return (
        <div className="space-y-8">
            <h3 className="text-xl font-bold text-gray-800">ABCD Framework Analysis</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {grouped.map(category => (
                    <div key={category.id} className="flex flex-col gap-4">
                        <div className={`p-3 rounded-lg text-white font-bold text-center ${category.color}`}>
                            {category.name}
                        </div>
                        <div className="space-y-4">
                            {category.items.length === 0 && (
                                <div className="text-gray-400 text-sm italic text-center p-4 bg-gray-50 rounded">
                                    No features analyzed
                                </div>
                            )}
                            {category.items.map((feat, idx) => (
                                <FeatureCard key={idx} feature={feat} />
                            ))}
                            {category.items.length === 0 && (
                                <div className="text-gray-400 text-sm italic text-center p-4 bg-white border border-gray-200 border-dashed rounded-lg shadow-sm flex items-center justify-center min-h-[80px]">
                                    No features analyzed
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {uncategorized.length > 0 && (
                <div className="mt-8 pt-8 border-t border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-500 uppercase mb-4">Other Considerations</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {uncategorized.map((feat, idx) => (
                            <FeatureCard key={idx} feature={feat} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function FeatureCard({ feature }: { feature: Feature }) {
    const [expanded, setExpanded] = useState(false);
    const score = Math.round(feature.confidence_score * 100);
    const label = feature.label || formatFeatureName(feature.id);
    const explanation = feature.explanation || feature.evaluation?.rationale || feature.evaluation?.overall_assessment?.primary_style;

    // Determine status color based on detection/score
    const isPositive = feature.detected;

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition">
            <div
                className="flex items-start justify-between cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                <div>
                    <div className="flex items-start gap-2 mb-1">
                        <div className="mt-0.5 shrink-0">
                            {isPositive ?
                                <CheckCircle size={16} className="text-green-500" /> :
                                <XCircle size={16} className="text-gray-400" />
                            }
                        </div>
                        <h4 className="font-medium text-sm text-gray-800 leading-tight">{label}</h4>
                    </div>
                    <div className="text-xs text-gray-500 pl-6">
                        Confidence: <span className="font-mono">{score}%</span>
                    </div>
                </div>
                <button className="text-gray-400 hover:text-gray-600 mt-0.5">
                    {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
            </div>

            {expanded && explanation && (
                <div className="mt-3 text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-100 leading-relaxed">
                    {explanation}
                </div>
            )}

            {expanded && feature.evaluation && (
                <div className="mt-2 text-xs">
                    {Object.entries(feature.evaluation).map(([key, value]) => {
                        if (key === 'rationale' || key === 'overall_assessment') return null;
                        if (typeof value === 'object') return null;
                        return (
                            <div key={key} className="flex gap-1 mt-1">
                                <span className="font-semibold capitalize text-gray-500">{key.replace(/_/g, ' ')}:</span>
                                <span className="text-gray-700 truncate">{String(value)}</span>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    );
}
