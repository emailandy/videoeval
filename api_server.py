import os
import json
import glob
import re
import logging
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, BackgroundTasks

# Load environment variables
load_dotenv()
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from fastapi.middleware.cors import CORSMiddleware
from src.orchestrator import VideoAdEvaluator

from fastapi.staticfiles import StaticFiles

app = FastAPI(title="BHI Video Ad Eval API")

# Mount media_assets directory
os.makedirs("media_assets", exist_ok=True)
app.mount("/media_assets", StaticFiles(directory="media_assets"), name="media_assets")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For dev only, update for prod

    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Evaluator
try:
    evaluator = VideoAdEvaluator("config/agents.yaml")
except Exception as e:
    print(f"Warning: Could not initialize VideoAdEvaluator: {e}")
    evaluator = None

class EvaluateRequest(BaseModel):
    video_uri: str
    user_request: Optional[str] = "Evaluate this video ad."
    campaign_name: Optional[str] = None
    model_id: Optional[str] = None
    model_overrides: Optional[Dict[str, str]] = None

class CampaignRequest(BaseModel):
    name: str
    source_path: str
    user_request: Optional[str] = "Evaluate this video ad."
    model_id: Optional[str] = None
    brand_assets_path: Optional[str] = None
    model_overrides: Optional[Dict[str, str]] = None

class SettingsRequest(BaseModel):
    api_key: str

def update_env_file(key, value):
    """Updates or appends a key-value pair in the .env file"""
    env_path = ".env"
    lines = []
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            lines = f.readlines()
            
    new_lines = []
    found = False
    for line in lines:
        if line.startswith(f"{key}="):
            new_lines.append(f"{key}={value}\n")
            found = True
        else:
            new_lines.append(line)
            
    if not found:
        new_lines.append(f"{key}={value}\n")
        
    with open(env_path, "w") as f:
        f.writelines(new_lines)

    with open(env_path, "w") as f:
        f.writelines(new_lines)

def get_campaign_folder(campaign_name: str) -> str:
    """Returns the sanitized result folder path for a campaign"""
    if not campaign_name:
        return "results"
    # Sanitize campaign name for folder usage
    safe_campaign = "".join([c for c in campaign_name if c.isalnum() or c in (' ', '-', '_')]).strip().replace(' ', '_')
    return os.path.join("results", safe_campaign)

def process_video(video_uri: str, user_request: str, campaign_name: str = None, model_id: str = None, brand_assets_path: str = None, model_overrides: Dict[str, str] = None):

    """Background task to process a single video"""
    try:
        print(f"Processing {video_uri} for campaign {campaign_name} with model {model_id}...")
        # Pass model_overrides to evaluate
        print(f"Processing {video_uri} with model_overrides: {model_overrides}")
        results = evaluator.evaluate(
            video_uri=video_uri, 
            user_request=user_request,
            model_overrides=model_overrides # Granular overrides
        )
        
        # Inject campaign info into results if present
        if campaign_name:
            results["campaign_name"] = campaign_name
            
        filename = os.path.basename(video_uri)
        if '?' in filename:
            filename = filename.split('?')[0]
            
        if '?' in filename:
            filename = filename.split('?')[0]
            
        # Determine output directory
        output_dir = get_campaign_folder(campaign_name)
        os.makedirs(output_dir, exist_ok=True)
        
        # Use filename as ID.
        output_filename = os.path.join(output_dir, f"{filename}.json")

        
        with open(output_filename, "w") as f:
            json.dump(results, f, indent=2)
        print(f"Finished processing {video_uri} -> {output_filename}")
    except Exception as e:
        print(f"Error processing {video_uri}: {e}")
        import traceback
        traceback.print_exc()
        
        # Save error state so frontend knows it failed
        filename = os.path.basename(video_uri)
        if '?' in filename: filename = filename.split('?')[0]
        
        filename = os.path.basename(video_uri)
        if '?' in filename: filename = filename.split('?')[0]
        
        output_dir = get_campaign_folder(campaign_name)
        os.makedirs(output_dir, exist_ok=True)
        output_filename = os.path.join(output_dir, f"{filename}.json")

        
        error_result = {
            "id": filename,
            "filename": filename,
            "campaign_name": campaign_name,
            "status": "failed",
            "error": str(e),
            "individual_checks": {}
        }
        try:
             with open(output_filename, "w") as f:
                json.dump(error_result, f, indent=2)
        except:
            print("Could not write error file.")

@app.get("/")
def read_root():
    return {"status": "Agoda Video Ad Eval API is running"}

@app.post("/evaluate")
def run_evaluation(req: EvaluateRequest, background_tasks: BackgroundTasks):
    if not evaluator:
        raise HTTPException(status_code=500, detail="Evaluator not initialized")
    
    # Run in background to be responsive
    background_tasks.add_task(
        process_video, 
        req.video_uri, 
        req.user_request, 
        campaign_name=req.campaign_name, 
        model_id=req.model_id, 
        model_overrides=req.model_overrides
    )
    
    return {
        "status": "queued",
        "video_uri": req.video_uri,
        "campaign": req.campaign_name,
        "model": req.model_id
    }

# ... existing code ...

CAMPAIGNS_FILE = "results/campaigns.json"

def load_campaigns():
    if os.path.exists(CAMPAIGNS_FILE):
        with open(CAMPAIGNS_FILE, "r") as f:
            return json.load(f)
    return {}

def save_campaign(name, data):
    campaigns = load_campaigns()
    campaigns[name] = data
    with open(CAMPAIGNS_FILE, "w") as f:
        json.dump(campaigns, f, indent=2)

@app.get("/campaigns")
def list_campaigns():
    """Lists all registered campaigns"""
    return load_campaigns()

@app.post("/campaigns")
def create_campaign(req: CampaignRequest, background_tasks: BackgroundTasks):
    """Scans a folder and triggers evaluations for all videos"""
    try:
        if not evaluator:
            raise HTTPException(status_code=500, detail="Evaluator not initialized")

        videos = []
        
        # 1. Local Folder Support
        if os.path.isdir(req.source_path):
            for root, dirs, files in os.walk(req.source_path):
                for file in files:
                    if file.lower().endswith(('.mp4', '.mov', '.avi', '.mkv')):
                        full_path = os.path.join(root, file)
                        videos.append(full_path)
        
        # 2. GCS Support (Basic detection)
        elif req.source_path.startswith("gs://"):
            pass

        if not videos:
             # Check if it's a single file
            if os.path.isfile(req.source_path) or req.source_path.startswith("gs://"):
                 videos.append(req.source_path)
            else:
                 return {"status": "error", "message": "No videos found in path or path invalid"}

        # Save Campaign Immediately
        campaign_info = {
            "name": req.name,
            "source_path": req.source_path,
            "video_count": len(videos),
            "created_at": os.path.getmtime(req.source_path) if os.path.exists(req.source_path) else 0,
            "videos": videos,
            "model_id": req.model_id,
            "brand_assets_path": req.brand_assets_path,
            "model_overrides": req.model_overrides
        }
        save_campaign(req.name, campaign_info)

        # Queue all
        for vid in videos:
            background_tasks.add_task(process_video, vid, req.user_request, req.name, req.model_id, req.brand_assets_path, req.model_overrides)

        return {
            "status": "campaign_started",
            "campaign": req.name,
            "videos_queued": len(videos),
            "files": videos,
            "model": req.model_id
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/campaigns/{name}")
def delete_campaign(name: str):
    """Deletes a campaign from the registry and removes its results"""
    campaigns = load_campaigns()
    
    videos = []
    if name in campaigns:
        videos = campaigns[name].get("videos", [])
        del campaigns[name]
        with open(CAMPAIGNS_FILE, "w") as f:
            json.dump(campaigns, f, indent=2)
            print(f"Deleted campaign from registry: {name}")
    
    # 1. Try to delete the specific campaign folder (New Style)
    try:
        folder = get_campaign_folder(name)
        if os.path.exists(folder) and folder != "results": # Safety check
            import shutil
            shutil.rmtree(folder)
            print(f"Deleted campaign results folder: {folder}")
    except Exception as e:
        print(f"Error deleting campaign folder: {e}")

    # 2. Try to clean up legacy flat files (Old Style)
    if videos:
        for vid_path in videos:
            try:
                fname = os.path.basename(vid_path)
                # Remove query params if any
                if '?' in fname: fname = fname.split('?')[0]
                
                # Legacy path was results/{filename}.json
                legacy_path = os.path.join("results", f"{fname}.json")
                if os.path.exists(legacy_path):
                    os.remove(legacy_path)
                    print(f"Deleted legacy result file: {legacy_path}")
            except Exception as e:
                print(f"Error deleting legacy result file {vid_path}: {e}")
                
    return {"status": "deleted", "campaign": name}


@app.get("/evaluations")
def list_evaluations():
    """List all JSON files in results/ folder recursively"""
    # Use recursive glob to find all json files in subfolders
    files = glob.glob("results/**/*.json", recursive=True)
    files.sort(key=os.path.getmtime, reverse=True)
    
    # Load campaigns to augment missing data if needed
    campaigns_registry = load_campaigns()
    # Create a mapping of video filename -> campaign name
    video_to_campaign = {}
    for camp_name, camp_data in campaigns_registry.items():
        for vid_path in camp_data.get("videos", []):
            fname = os.path.basename(vid_path)
            video_to_campaign[fname] = camp_name

    evals = []
    for f in files:
        if os.path.basename(f) == "campaigns.json": continue
        try:
            with open(f, "r") as json_file:
                data = json.load(json_file)
                score = 0
                status = data.get("status", "completed") # Default to completed if not specified (legacy)
                error = data.get("error", None)
                
                # Try to get score if not failed
                if status != "failed":
                    try:
                        # Prioritize overall_score if available (patched or new)
                        if "overall_score" in data:
                            score = data["overall_score"]
                        else:
                            # Fallback to abcd score
                            score = data.get("individual_checks", {}).get("abcd_agent", {}).get("score_0_to_100", 0)
                    except:
                        pass
                
                fname = os.path.basename(f)
                # Strip .json extension to match registry
                if fname.endswith(".json"):
                    fname = fname[:-5]
                
                # Check if file has campaign_name, if not try to infer from registry
                campaign = data.get("campaign_name", "Uncategorized")
                
                # Create unique ID using campaign::filename
                unique_id = f"{campaign}::{fname}"
                
                # Resolve preview_url dynamically if missing
                preview_url = data.get("preview_url")
                if not preview_url:
                    # Try to find the video file in media_assets
                    video_extensions = ['.mp4', '.mov', '.avi', '.mkv']
                    
                    # If fname already has an extension, try it first
                    candidates = []
                    if any(fname.lower().endswith(ext) for ext in video_extensions):
                        candidates.append(fname)
                    
                    # Also try appending extensions just in case (e.g. if json was named without extension)
                    for ext in video_extensions:
                        if not fname.lower().endswith(ext):
                            candidates.append(fname + ext)
                            
                    for video_filename in candidates:
                        # Check likely locations first
                        # 1. media_assets/videos/best
                        # 2. media_assets/videos/worst
                        # 3. media_assets/videos
                        likely_paths = [
                            f"media_assets/videos/best/{video_filename}",
                            f"media_assets/videos/worst/{video_filename}",
                            f"media_assets/videos/{video_filename}"
                        ]
                        
                        found = False
                        for p in likely_paths:
                            if os.path.exists(p):
                                preview_url = f"/{p}"
                                found = True
                                break
                        if found: break
                        
                evals.append({
                    "id": unique_id, # form: campaign::filename
                    "filename": fname,
                    "date": os.path.getmtime(f),
                    "score": score,
                    "campaign": campaign,
                    "status": status,
                    "error": error,
                    "preview_url": preview_url
                })
        except Exception:
            continue
            
    return evals

def extract_comparative_section(filename: str) -> Optional[str]:
    """
    Extracts the specific section for a video from the comparative analysis markdown.
    Tries to match by exact filename or by ID prefix (e.g. '16' from '16_IN...').
    """
    try:
        candidates = glob.glob("results/comparative_analysis*.md")
        if not candidates:
            return None
        candidates.sort(key=os.path.getmtime, reverse=True)
        latest_file = candidates[0]
        
        with open(latest_file, "r") as f:
            content = f.read()
            
        # Strategy 1: Match by exact filename
        # Pattern: **Rank X: filename ...**
        # content
        # (until next **Rank)
        
        # Strategy 2: Match by prefix (e.g. "16.json" for "16_IN...")
        prefix = filename.split('_')[0]
        search_terms = [filename, f"{prefix}.json"]
        
        for term in search_terms:
            # Regex to find the header and capture content until next header
            # Header format: **Rank \d+: term ...**
            # We want to capture the lines AFTER the header
            pattern = r"\*\*Rank \d+: " + re.escape(term) + r".*?\n(.*?)(?=\n\*\*Rank|\Z)"
            match = re.search(pattern, content, re.DOTALL | re.IGNORECASE)
            if match:
                return match.group(1).strip()
                
        return None
    except Exception as e:
        print(f"Error extracting analysis for {filename}: {e}")
        return None

@app.get("/evaluations/{filename}")
def get_evaluation(filename: str):
    # Check if this is a composite ID (campaign::filename)
    target_path = None
    original_filename = filename # Keep for fallback

    if "::" in filename:
        try:
            campaign, real_filename = filename.split("::", 1)
            filename = real_filename # Update filename for extraction logic
            
            # Construct path directly
            # 1. Try get_campaign_folder logic
            # If standard campaign, it's inside results/{campaign}
            campaign_folder = get_campaign_folder(campaign)
            potential_path = os.path.join(campaign_folder, f"{real_filename}.json")
            
            if os.path.exists(potential_path):
                target_path = potential_path
        except:
            pass

    # If target_path found, use it; otherwise fallback to search
    if target_path:
        found_files = [target_path]
    else:
        # Legacy/Fallback: Search recursively in results/ for the file
        search_pattern = f"results/**/{filename}"
        if not filename.endswith(".json"):
            search_pattern += ".json"
            
        found_files = glob.glob(search_pattern, recursive=True)
    
    if found_files:
        # Return the first match (most likely the correct one if filenames are unique)
        with open(found_files[0], "r") as f:
            data = json.load(f)
            data["comparative_analysis"] = extract_comparative_section(filename)
            
            # Resolve preview_url dynamically if missing
            preview_url = data.get("preview_url")
            if not preview_url:
                fname = os.path.basename(found_files[0])
                if fname.endswith(".json"):
                    fname = fname[:-5]
                    
                video_extensions = ['.mp4', '.mov', '.avi', '.mkv']
                
                # If fname already has an extension, try it first
                candidates = []
                if any(fname.lower().endswith(ext) for ext in video_extensions):
                    candidates.append(fname)
                
                # Also try appending extensions just in case
                for ext in video_extensions:
                    if not fname.lower().endswith(ext):
                        candidates.append(fname + ext)

                for video_filename in candidates:
                    likely_paths = [
                        f"media_assets/videos/best/{video_filename}",
                        f"media_assets/videos/worst/{video_filename}",
                        f"media_assets/videos/{video_filename}"
                    ]
                    
                    found = False
                    for p in likely_paths:
                        if os.path.exists(p):
                            preview_url = f"/{p}"
                            found = True
                            break
                    if found: break
                
                if preview_url:
                    data["preview_url"] = preview_url

            return data
            
    # Fallback for exact path match if somehow glob fails or for backward compat
    paths_to_try = [
        os.path.join("results", filename),
        os.path.join("results", f"{filename}.json")
    ]
    
    for path in paths_to_try:
        if os.path.exists(path):
            with open(path, "r") as f:
                data = json.load(f)
                data["comparative_analysis"] = extract_comparative_section(filename)
                return data
                
    raise HTTPException(status_code=404, detail=f"Evaluation not found for {filename}")

@app.post("/settings")
def update_settings(req: SettingsRequest):
    """Updates the API Key"""
    if not req.api_key:
        raise HTTPException(status_code=400, detail="API Key is required")
        
    # 1. Update Process Environment
    os.environ["GEMINI_API_KEY"] = req.api_key
    os.environ["GOOGLE_API_KEY"] = req.api_key # Support both
    
    # 2. Persist to .env
    try:
        update_env_file("GEMINI_API_KEY", req.api_key)
        update_env_file("GOOGLE_API_KEY", req.api_key)
    except Exception as e:
        print(f"Failed to write .env file: {e}")
        
    # 3. Re-initialize Evaluator with explicit key
    global evaluator
    try:
        evaluator = VideoAdEvaluator("config/agents.yaml", api_key=req.api_key)
        print("Evaluator re-initialized with explicit frontend key.")
    except Exception as e:
        print(f"Failed to re-initialize evaluator: {e}")
        raise HTTPException(status_code=500, detail=str(e))
        
    return {"status": "updated", "message": "API Key saved and evaluator re-initialized"}

@app.get("/analysis/comparative")
def get_comparative_analysis():
    """Returns the latest comparative analysis markdown content"""
    # Look for comparative_analysis_all.md or similar
    candidates = glob.glob("results/comparative_analysis*.md")
    if not candidates:
        raise HTTPException(status_code=404, detail="No comparative analysis found")
    
    # Sort by mtime to get the latest
    candidates.sort(key=os.path.getmtime, reverse=True)
    latest_file = candidates[0]
    
    try:
        with open(latest_file, "r") as f:
            content = f.read()
            return {"content": content, "filename": os.path.basename(latest_file)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read analysis: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
