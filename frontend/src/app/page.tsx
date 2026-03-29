"use client";

import React, { useEffect, useState } from 'react';
import EvaluationCard from '@/components/EvaluationCard';
import { fetchEvaluations, fetchCampaigns, fetchComparativeAnalysis, deleteCampaign, EvaluationResult } from '@/lib/api';
import { ArrowRight, Trophy, RefreshCw, Folder, Trash2, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ConfirmationModal from '@/components/ConfirmationModal';


export default function CampaignSelectorPage() {
  const [evaluations, setEvaluations] = useState<EvaluationResult[]>([]);
  const [campaigns, setCampaigns] = useState<Record<string, any>>({});
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reRunning, setReRunning] = useState<string | null>(null);
  const [deleteData, setDeleteData] = useState<{ open: boolean; name: string | null }>({ open: false, name: null });
  const router = useRouter();


  useEffect(() => {
    async function load() {
      try {
        const [evals, camps, analysisData] = await Promise.all([
          fetchEvaluations(),
          fetchCampaigns(),
          fetchComparativeAnalysis()
        ]);
        // Sort by score desc
        const sorted = (evals || []).sort((a, b) => (b.score || 0) - (a.score || 0));
        setEvaluations(sorted);
        setCampaigns(camps || {});
        if (analysisData) {
          setAnalysis(analysisData.content);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleReRun = async (name: string, config: any) => {
    setReRunning(name);
    try {
      await fetch('http://localhost:8000/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name,
          source_path: config.source_path,
          model_id: config.model_id
        })
      });
      // Optionally reload or just let it spin for a moment
    } catch (e) {
      console.error('Failed to restart campaign', e);
    } finally {
      setReRunning(null);
    }
  };

  const notifyDelete = (name: string) => {
    setDeleteData({ open: true, name });
  };

  const confirmDelete = async () => {
    if (deleteData.name) {
      const success = await deleteCampaign(deleteData.name);
      if (success) {
        const next = { ...campaigns };
        delete next[deleteData.name];
        setCampaigns(next);
      }
    }
    setDeleteData({ open: false, name: null });
  };


  const winner = evaluations[0];
  const runnersUp = evaluations.slice(1, 4);

  if (loading) return <div className="text-center py-20">Loading campaign data...</div>;

  return (
    <div className="space-y-10">
      <ConfirmationModal
        isOpen={deleteData.open}
        title="Delete Campaign"
        message={`Are you sure you want to delete campaign "${deleteData.name}"? This will permanently remove all associated results and cannot be undone.`}
        confirmLabel="Delete"
        isDangerous={true}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteData({ open: false, name: null })}
      />

      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-yellow-100 rounded-lg text-yellow-600">
            <Trophy size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Top Performer</h2>
            <p className="text-gray-500">Recommended for immediate deployment</p>
          </div>
        </div>

        {winner ? (
          <div className="flex gap-8 bg-gradient-to-r from-blue-50 to-indigo-50 p-8 rounded-2xl border border-blue-100 shadow-sm relative overflow-hidden">
            <div className="w-1/3 aspect-video bg-black rounded-xl shadow-lg relative z-10 flex items-center justify-center overflow-hidden">
              {winner.preview_url ? (
                <video
                  src={`http://localhost:8000${winner.preview_url}`}
                  controls
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-400">
                  <span className="font-medium">Preview Unavailable</span>
                  <span className="text-xs">No video source found</span>
                </div>
              )}
            </div>
            <div className="flex-1 z-10">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-2xl font-bold text-gray-900">{winner.filename}</h3>
                <div className="bg-white px-4 py-2 rounded-full shadow-sm border border-blue-100 font-bold text-blue-600 text-lg">
                  {Math.round(winner.score || 0)} / 100
                </div>
              </div>
              <p className="text-gray-600 mb-6 max-w-xl">
                This asset demonstrates exceptional adherence to ABCD guidelines, with strong audio/visual sync and high production quality.
              </p>
              <div className="flex gap-4">
                <Link href={`/library/${winner.id}`} className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition shadow-md hover:shadow-lg active:scale-95">
                  View Full Analysis
                </Link>
                <button className="px-6 py-3 bg-white text-blue-600 border border-blue-200 rounded-lg font-medium hover:bg-blue-50 transition">
                  Approve for Launch
                </button>
              </div>
            </div>
            {/* Decorative background element/blob */}
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-yellow-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
            <div className="absolute top-0 right-0 -mt-10 mr-40 w-64 h-64 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
          </div>
        ) : (
          <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed">
            No evaluations found. Start by running an evaluation.
          </div>
        )}
      </section>

      {runnersUp.length > 0 && (
        <section>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Runners Up</h2>
            <Link href="/library" className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium">
              View All <ArrowRight size={16} />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {runnersUp.map(ev => (
              <EvaluationCard
                key={ev.id}
                id={ev.id}
                filename={ev.filename || ev.id}
                date={ev.date}
                score={ev.score}
              />
            ))}
          </div>
        </section>
      )}

      {Object.keys(campaigns).length > 0 && (
        <section className="pt-8 border-t border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Recent Campaigns</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(campaigns).map(([name, config]) => (
              <div key={name} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                    <Folder size={20} />
                  </div>
                  <span className="text-xs font-mono text-gray-400 bg-gray-50 px-2 py-1 rounded">
                    {config.model_id || 'gemini-1.5'}
                  </span>
                </div>
                <h3 className="font-bold text-lg text-gray-900 mb-2">{name}</h3>
                <p className="text-sm text-gray-500 font-mono mb-6 truncate" title={config.source_path}>
                  {config.source_path}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleReRun(name, config)}
                    disabled={reRunning === name}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 hover:text-blue-600 transition disabled:opacity-50"
                  >
                    <RefreshCw size={16} className={reRunning === name ? "animate-spin" : ""} />
                    {reRunning === name ? 'Queuing...' : 'Re-run'}
                  </button>
                  <button
                    onClick={() => notifyDelete(name)}
                    className="flex items-center justify-center px-4 py-2 bg-white border border-gray-200 text-red-500 rounded-lg hover:bg-red-50 hover:border-red-200 transition"
                    title="Delete Campaign"
                  >

                    <Trash2 size={16} />
                  </button>
                </div>

              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
