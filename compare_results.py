import argparse
import json
import os
import re
from google import genai

def extract_overall_score(final_report_text):
    """Extracts the numerical score from the final report string."""
    # Matches variations like **Overall System Score:** **65.0 / 100**, **System Overall Weighted Score: 87.5 / 100**, or **Overall System Metric Score:** **98.33 / 100**
    match = re.search(r'Overall.*?Score.*?([\d\.]+)', final_report_text, re.IGNORECASE)
    if match:
        return float(match.group(1))
    return 0.0

def generate_comparative_analysis(ranked_videos, output_filename="results/comparative_analysis.md"):
    """Sends the formatted leaderboard to Gemini and saves the output."""
    if not ranked_videos:
        print("No videos to compare.")
        return

    print("\n--- Generating Comparative Analysis via Gemini ---")
    
    # Construct the payload
    payload = "Here is the ranked leaderboard of video ad evaluations:\n\n"
    for i, v in enumerate(ranked_videos, 1):
        payload += f"Rank {i}: {v['filename']}\n"
        payload += f"Overall Score: {v['score']} / 100\n"
        payload += f"Total Technical Issues Found: {v['issues_count']}\n"
        payload += f"Executive Summary Snippet:\n{v['report_snippet']}\n\n"
        
    system_prompt = """You are the ComparativeAnalysisAgent for a Video Ad Evaluation system.
Below is a ranked leaderboard of video ad evaluations along with their scores and an extracted executive summary of their technical flaws/strengths. 

Your Task:
Write a comprehensive, text-based comparative explanation. For each video in the list (ordered from best to worst), write a 1-2 paragraph analysis explaining exactly why it placed where it did relative to the others. 

Be highly specific: 
- For the top-ranked videos, mention what specific flaws (e.g., A/V sync errors, visual artifacts) it managed to avoid that the lower-ranked videos suffered from.
- For the bottom-ranked videos, highlight exactly what technical failures dragged their score down compared to the winners. 
- Do not just summarize the individual video independent of the others; every paragraph must compare the asset to its peers in this specific list."""

    try:
        client = genai.Client(vertexai=True, project="bhi-video-ad-eval", location="global")
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=f"{system_prompt}\n\n{payload}",
        )
        
        analysis_text = response.text
        
        # Save to markdown output
        with open(output_filename, "w") as f:
            f.write(analysis_text)
            
        print(f"Success. Comparative analysis saved to: {output_filename}")
        
    except Exception as e:
        print(f"Failed to generate comparative analysis from Gemini: {e}")

def process_results(files):
    videos = []
    
    # 1. Extraction: Parse all JSON files
    for filepath in files:
        if not os.path.exists(filepath):
            print(f"Warning: File not found: {filepath}")
            continue
            
        with open(filepath, 'r') as f:
            try:
                data = json.load(f)
                report = data.get("final_report", "")
                
                score = extract_overall_score(report)
                
                # Count issues as a quick proxy for errors
                issues = 0
                for checker, details in data.get("individual_checks", {}).items():
                    if isinstance(details, dict):
                        issues += len(details.get("issues_log", []))
                    
                videos.append({
                    "filename": os.path.basename(filepath),
                    "score": score,
                    "issues_count": issues,
                    "report_snippet": report[:400] + "..." # Truncate for the LLM digest
                })
            except Exception as e:
                print(f"Error parsing {filepath}: {e}")

    # 2. Ranking: Sort by score descending
    ranked_videos = sorted(videos, key=lambda x: x["score"], reverse=True)
    
    return ranked_videos

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Analyze and compare video evaluation JSON results.")
    parser.add_argument(
        'folder', 
        nargs='?', 
        default='results',
        help="Target folder containing JSON files. Defaults to 'results'."
    )
    parser.add_argument(
        'files', 
        nargs='?', 
        help="Optional space-separated string of specific files to analyze (e.g., '16 18 20'). If omitted, all JSONs in the folder are analyzed."
    )
    
    args = parser.parse_args()
    
    folder = args.folder
    files_to_process = []
    
    if args.files:
        # User defined specific files
        file_list = args.files.split()
        for f in file_list:
            json_target = f if f.endswith('.json') else f"{f}.json"
            filepath = os.path.join(folder, json_target)
            if os.path.isfile(filepath):
                files_to_process.append(filepath)
            else:
                print(f"Warning: Could not find file {filepath}")
    else:
        # Analyze all files in the folder
        if os.path.isdir(folder):
            for filename in os.listdir(folder):
                if filename.endswith(".json"):
                    files_to_process.append(os.path.join(folder, filename))
        else:
            print(f"Error: Directory '{folder}' not found.")
                    
    # Remove duplicates while preserving order
    files_to_process = list(dict.fromkeys(files_to_process))

    if not files_to_process:
        print("No valid JSON files found to process.")
        exit(1)

    ranked = process_results(files_to_process)
    print("Leaderboard:")
    for i, v in enumerate(ranked, 1):
        print(f"{i}. {v['filename']} - Score: {v['score']} (Issues: {v['issues_count']})")
        
    # Kick off the LLM comparison
    if args.files:
        file_list = args.files.split()
        suffix = "_".join([f.replace('.json', '') for f in file_list])
        out_name = f"comparative_analysis_{suffix}.md"
    else:
        out_name = "comparative_analysis_all.md"
        
    out_path = os.path.join(folder, out_name)
    generate_comparative_analysis(ranked, out_path)
