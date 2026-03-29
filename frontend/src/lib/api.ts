const API_BASE_URL = 'http://localhost:8000';

export interface EvaluationResult {
  id: string;
  filename: string;
  date: number; // timestamp
  score?: number; // Added score likely to be in summary
  campaign?: string; // Added campaign field
  preview_url?: string; // URL for video preview
}

export interface DetailedEvaluation {
  individual_checks: {
    abcd_agent: {
      score_0_to_100: number;
      abcd_features: any[];
    };
    av_sync_checker?: {
      has_sync_issues: boolean;
      issues_log: any[];
    };
    visual_artifact_checker?: {
      has_visual_issues: boolean;
      issues_log: any[];
    };
    audio_realism_checker?: {
      has_audio_issues: boolean;
      issues_log: any[];
    };
  };
  final_report?: string;
  campaign_name?: string;
  comparative_analysis?: string; // Markdown content
  deduplications_log?: string[]; // Added deduplications log
  video_uri?: string;
  overall_score?: number; // Calculated weighted score
}

export async function fetchEvaluations(): Promise<EvaluationResult[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/evaluations`);
    if (!res.ok) return []; // Return empty on error to avoid breaking UI
    return res.json();
  } catch (e) {
    console.error("API fetch error", e);
    return [];
  }
}

export async function fetchCampaigns(): Promise<Record<string, any>> {
  try {
    const res = await fetch(`${API_BASE_URL}/campaigns`);
    if (!res.ok) return {};
    return res.json();
  } catch (e) {
    console.error("API fetch error", e);
    return {};
  }
}

export async function deleteCampaign(name: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/campaigns/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch (e) {
    console.error("Failed to delete campaign", e);
    return false;
  }
}

export async function fetchEvaluationDetail(filename: string): Promise<DetailedEvaluation> {
  // Ensure special characters in filename (like spaces, parens) are encoded
  const encodedName = encodeURIComponent(filename);
  const res = await fetch(`${API_BASE_URL}/evaluations/${encodedName}`);
  if (!res.ok) throw new Error('Failed to fetch evaluation detail');
  return res.json();
}

export async function fetchComparativeAnalysis(): Promise<{ content: string; filename: string } | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/analysis/comparative`);
    if (!res.ok) return null;
    return res.json();
  } catch (e) {
    console.error("Failed to fetch comparative analysis", e);
    return null;
  }
}

export async function runEvaluation(video_uri: string, campaign_name: string, model_id: string = "gemini-1.5-pro-latest", user_request: string = "Evaluate this video ad"): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      video_uri,
      user_request,
      campaign_name,
      model_id
    })
  });
  if (!res.ok) throw new Error('Failed to start evaluation');
  return res.json();
}
