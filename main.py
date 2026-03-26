import json
import sys
from src.orchestrator import VideoAdEvaluator

def main():
    # Allow passing a video URI as the first command line argument
    video_uri = sys.argv[1] if len(sys.argv) > 1 else "gs://bhi-video-ad-eval-assets/19_IN_Cousin_Tracker_Activated_16x9_15s.mp4"
    user_request = sys.argv[2] if len(sys.argv) > 2 else "Conduct a ruthless, evidence-based audit of this video looking for absolute numerical scores (0-100) across structural, technical, and message criteria."
    print(f"Starting evaluation for {video_uri}")
    print(f"User Request: {user_request}")
    
    evaluator = VideoAdEvaluator("config/agents.yaml")
    results = evaluator.evaluate(video_uri, user_request=user_request)
    
    print("\n--- Evaluation Complete ---")
    print(json.dumps(results, indent=2))

if __name__ == "__main__":
    main()
