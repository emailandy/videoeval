"use client";

import React, { useState } from 'react';
import { X, Folder, Play, ChevronDown, ChevronUp } from 'lucide-react';

interface CampaignModalProps {
    onClose: () => void;
    onCreated: () => void;
}

export default function CampaignModal({ onClose, onCreated }: CampaignModalProps) {
    const [name, setName] = useState("");
    const [path, setPath] = useState("");
    const [brandAssetsPath, setBrandAssetsPath] = useState("");
    const [modelId, setModelId] = useState("gemini-3-flash-preview");
    const [modelOverrides, setModelOverrides] = useState<Record<string, string>>({});
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<any>(null);

    const MODELS = [
        { id: "gemini-3-flash-preview", name: "Gemini 3.0 Flash Preview" },
        { id: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro Preview" },
        { id: "gemini-3.1-flash-lite-preview", name: "Gemini 3.1 Flash Lite Preview" },
        // { id: "gemini-3.1-flash", name: "Gemini 3.1 Flash" }, // Checking if this exists, user requested it
    ];

    const AGENTS = [
        { id: "orchestrator", name: "Orchestrator (Executive Summary)" },
        { id: "evaluation_context_agent", name: "Evaluation Context Agent" },
        { id: "abcd_agent", name: "ABCD Framework Agent" },
        { id: "audio_realism_checker", name: "Audio Realism Checker" },
        { id: "visual_artifact_checker", name: "Visual Artifact Checker" },
        { id: "av_sync_checker", name: "AV Sync Checker" },
    ];

    const handleOverrideChange = (agentId: string, value: string) => {
        if (value === "default") {
            const newOverrides = { ...modelOverrides };
            delete newOverrides[agentId];
            setModelOverrides(newOverrides);
        } else {
            setModelOverrides({ ...modelOverrides, [agentId]: value });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('http://localhost:8000/campaigns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    source_path: path,
                    model_id: modelId,
                    brand_assets_path: brandAssetsPath.trim() || undefined,
                    model_overrides: Object.keys(modelOverrides).length > 0 ? modelOverrides : undefined
                })
            });
            const data = await res.json();
            if (data.status === 'campaign_started') {
                setStatus(data);
                setTimeout(() => {
                    onCreated();
                    onClose();
                }, 2000);
            } else {
                alert('Error: ' + JSON.stringify(data));
            }
        } catch (err) {
            console.error(err);
            alert('Failed to create campaign');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                    <X size={24} />
                </button>

                <h2 className="text-xl font-bold mb-1">New Campaign</h2>
                <p className="text-sm text-gray-500 mb-6">Batch analyze videos from a folder</p>

                {!status ? (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name</label>
                            <input
                                type="text"
                                required
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="e.g. Summer 2024 Launch"
                                value={name}
                                onChange={e => setName(e.target.value)}
                            />
                        </div>
                        <div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    required
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                                    placeholder="/path/to/videos or gs://bucket/..."
                                    value={path}
                                    onChange={e => setPath(e.target.value)}
                                />
                            </div>
                            <p className="text-xs text-gray-400 mt-1">Full absolute path to the folder containing videos.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Default AI Model</label>
                            <select
                                value={modelId}
                                onChange={e => setModelId(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                            >
                                {MODELS.map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-400 mt-1">Select the default Gemini model used for all agents.</p>
                        </div>

                        <div>
                            <button
                                type="button"
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800 focus:outline-none"
                            >
                                {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                Advanced Model Settings (Per Agent)
                            </button>

                            {showAdvanced && (
                                <div className="mt-2 space-y-2 border-l-2 border-blue-100 pl-3">
                                    {AGENTS.map(agent => (
                                        <div key={agent.id} className="grid grid-cols-2 gap-2 items-center">
                                            <label className="text-xs text-gray-600">{agent.name}</label>
                                            <select
                                                value={modelOverrides[agent.id] || "default"}
                                                onChange={e => handleOverrideChange(agent.id, e.target.value)}
                                                className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                                            >
                                                <option value="default">Default ({MODELS.find(m => m.id === modelId)?.name})</option>
                                                {MODELS.map(m => (
                                                    <option key={m.id} value={m.id}>{m.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Brand Assets Path (Optional)</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                                placeholder="/path/to/logos/and/images"
                                value={brandAssetsPath}
                                onChange={e => setBrandAssetsPath(e.target.value)}
                            />
                            <p className="text-xs text-gray-400 mt-1">
                                Path to specific brand guidelines or image assets.
                            </p>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-70"
                            >
                                {loading ? 'Starting...' : <><Play size={16} /> Start Analysis</>}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="text-center py-8">
                        <div className="text-green-500 text-4xl mb-4">🚀</div>
                        <h3 className="font-bold text-lg">Campaign Started!</h3>
                        <p className="text-gray-600">Queued {status.videos_queued} videos for analysis.</p>
                        {status.model_overrides && Object.keys(status.model_overrides).length > 0 && (
                            <div className="mt-2 text-xs text-gray-500 text-left bg-gray-50 p-2 rounded">
                                <p className="font-semibold">Model Overrides:</p>
                                <ul className="list-disc list-inside">
                                    {Object.entries(status.model_overrides).map(([k, v]) => (
                                        <li key={k}>{k}: {String(v)}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
