"use client";

import React, { useEffect, useState } from 'react';
import EvaluationCard from '@/components/EvaluationCard';
import VideoListItem from '@/components/VideoListItem';
import { fetchEvaluations, fetchCampaigns, deleteCampaign, EvaluationResult } from '@/lib/api';
import { Search, Plus, Folder, ArrowLeft, PlayCircle, Trash2 } from 'lucide-react';

import CampaignModal from '@/components/CampaignModal';
import ConfirmationModal from '@/components/ConfirmationModal';
import { useRouter } from 'next/navigation';


export default function LibraryPage() {
  const router = useRouter();
  const [evaluations, setEvaluations] = useState<EvaluationResult[]>([]);
  const [campaignsRegistry, setCampaignsRegistry] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [deleteData, setDeleteData] = useState<{ open: boolean; name: string | null }>({ open: false, name: null });


  // Navigation State
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const handleRunCampaign = async () => {
    if (!selectedCampaign) return;
    const config = campaignsRegistry[selectedCampaign];
    if (!config) return;

    setRunning(true);
    try {
      const res = await fetch('http://localhost:8000/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: selectedCampaign,
          source_path: config.source_path,
          model_id: config.model_id
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to start campaign');
      }

      loadData(); // Refresh to show processing status if immediate
    } catch (e: any) {
      console.error('Failed to start campaign', e);
      alert(`Error starting analysis: ${e.message}`);
    } finally {
      setRunning(false);
    }
  };




  const notifyDelete = (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    setDeleteData({ open: true, name });
  };

  const confirmDelete = async () => {
    if (deleteData.name) {
      const success = await deleteCampaign(deleteData.name);
      if (success) {
        loadData();
      }
    }
    setDeleteData({ open: false, name: null });
  };



  const loadData = async () => {
    setLoading(true);
    try {
      const [evals, campData] = await Promise.all([
        fetchEvaluations(),
        fetchCampaigns()
      ]);
      setEvaluations(evals || []);
      setCampaignsRegistry(campData || {});
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Poll for updates if inside a campaign
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Compute Campaign Stats
  const campaignStats = React.useMemo(() => {
    const stats: Record<string, { count: number; avgScore: number; totalScore: number }> = {};

    // 1. Initialize from Registry
    Object.keys(campaignsRegistry).forEach(name => {
      stats[name] = { count: 0, avgScore: 0, totalScore: 0 };
    });

    // 2. Aggregate Evaluations
    evaluations.forEach(ev => {
      const name = ev.campaign || "Uncategorized";
      if (!stats[name]) stats[name] = { count: 0, avgScore: 0, totalScore: 0 };
      stats[name].count++;
      stats[name].totalScore += (ev.score || 0);
    });

    return Object.entries(stats).map(([name, stat]) => ({
      name,
      count: stat.count,
      avgScore: stat.count ? stat.totalScore / stat.count : 0
    }));
  }, [evaluations, campaignsRegistry]);

  // filteredCampaigns
  const filteredCampaigns = campaignStats.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Compute Merged Video List for Selected Campaign
  const campaignVideoList = React.useMemo(() => {
    if (!selectedCampaign) return [];

    const registryData = campaignsRegistry[selectedCampaign];
    const registryVideos: string[] = registryData?.videos || [];

    // Create a map of existing evaluations for quick lookup
    const evalMap = new Map();
    evaluations.forEach(ev => {
      if ((ev.campaign || "Uncategorized") === selectedCampaign) {
        evalMap.set(ev.filename, ev);
      }
    });

    // Merge Logic using Sets to avoid duplicates
    // We want all videos from registry AND any from evaluations that might not match registry exactly (legacy)
    const allFilenames = new Set([...registryVideos.map(p => p.split('/').pop()!), ...evalMap.keys()]);

    return Array.from(allFilenames).map(filename => {
      const ev = evalMap.get(filename);
      // If we have an evaluation, it's completed
      if (ev) {
        return {
          filename,
          status: 'completed',
          score: ev.score,
          id: ev.id
        };
      } else {
        // It's in registry but not results -> Pending/Processing
        return {
          filename,
          status: 'processing',
          score: undefined,
          id: null
        };
      }
    }).sort((a, b) => a.filename!.localeCompare(b.filename!));

  }, [selectedCampaign, evaluations, campaignsRegistry]);

  // Compute Progress
  const currentCampaignProgress = React.useMemo(() => {
    if (!selectedCampaign) return null;
    const config = campaignsRegistry[selectedCampaign];
    if (!config || !config.video_count) return null;

    // Find matching stats
    const stats = campaignStats.find(c => c.name === selectedCampaign);
    const completed = stats ? stats.count : 0;
    const total = config.video_count;
    const percent = Math.min(100, Math.round((completed / total) * 100));

    return { completed, total, percent };
  }, [selectedCampaign, campaignStats, campaignsRegistry]);

  return (
    <div className="space-y-6">
      {showModal && <CampaignModal onClose={() => setShowModal(false)} onCreated={loadData} />}

      <ConfirmationModal
        isOpen={deleteData.open}
        title="Delete Campaign"
        message={`Are you sure you want to delete campaign "${deleteData.name}"? This will permanently remove all associated results and cannot be undone.`}
        confirmLabel="Delete"
        isDangerous={true}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteData({ open: false, name: null })}
      />


      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          {selectedCampaign && (
            <button
              onClick={() => setSelectedCampaign(null)}
              className="p-2 hover:bg-gray-100 rounded-full transition"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <div>
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-3">
              {selectedCampaign ? selectedCampaign : "Campaigns"}
              {selectedCampaign && (
                <button
                  onClick={handleRunCampaign}
                  disabled={running}
                  className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full flex items-center gap-1 hover:bg-blue-200 transition disabled:opacity-50"
                >
                  <PlayCircle size={14} className={running ? "animate-spin" : ""} />
                  {running ? 'Starting...' : 'Run Analysis'}
                </button>
              )}
            </h2>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              {selectedCampaign ? (
                <>
                  <span>{currentCampaignProgress ? `${currentCampaignProgress.completed} / ${currentCampaignProgress.total} videos analyzed` : `${campaignVideoList.length} videos`}</span>
                  {currentCampaignProgress && (
                    <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all duration-500 ease-out"
                        style={{ width: `${currentCampaignProgress.percent}%` }}
                      />
                    </div>
                  )}
                </>
              ) : (
                "Manage your evaluation campaigns"
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder={selectedCampaign ? "Search videos..." : "Search campaigns..."}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition"
          >
            <Plus size={18} /> New Campaign
          </button>
        </div>
      </div>

      {loading && !evaluations.length && !Object.keys(campaignsRegistry).length ? (
        <div className="text-center py-20 text-gray-500">Loading library...</div>
      ) : (
        <>
          {/* VIEW 1: CAMPAIGN LIST */}
          {!selectedCampaign && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCampaigns.map(camp => (
                <div
                  key={camp.name}
                  onClick={() => {
                    setSelectedCampaign(camp.name);
                    setSearchTerm("");
                  }}
                  className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100 transition">
                      <Folder size={24} />
                    </div>
                    <div className="px-2 py-1 bg-gray-100 rounded text-xs font-semibold text-gray-600">
                      Avg: {Math.round(camp.avgScore)}
                    </div>
                  </div>
                  <h3 className="font-semibold text-lg text-gray-900 mb-1">{camp.name}</h3>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-500">{camp.count} videos analyzed</p>
                    <button
                      onClick={(e) => notifyDelete(e, camp.name)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition opacity-0 group-hover:opacity-100"
                      title="Delete Campaign"
                    >

                      <Trash2 size={16} />
                    </button>
                  </div>

                </div>
              ))}
              {filteredCampaigns.length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  No campaigns found. Create one to get started!
                </div>
              )}
            </div>
          )}

          {/* VIEW 2: VIDEO LIST (DETAILED LIST VIEW) */}
          {selectedCampaign && (
            <div className="flex flex-col gap-3">
              {campaignVideoList
                .filter(v => v.filename!.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((video) => (
                  <VideoListItem
                    key={video.filename}
                    filename={video.filename!}
                    status={video.status as any}
                    score={video.score}
                    onClick={() => video.status === 'completed' && router.push(`/library/${video.id}`)}
                  />
                ))}
              {campaignVideoList.length === 0 && (
                <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  No videos found in this campaign.
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
