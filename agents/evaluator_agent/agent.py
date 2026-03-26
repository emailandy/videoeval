# agents/evaluator_agent/agent.py
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

# Expose required credentials to ADK loading wrapper
os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "1"
os.environ["GOOGLE_CLOUD_PROJECT"] = "bhi-video-ad-eval"
os.environ["GOOGLE_CLOUD_LOCATION"] = "global"

import json
from vertexai.agent_engines import AdkApp
from google.adk.agents import LlmAgent, Context

# Import existing helpers from the orchestrator
from src.orchestrator import VideoAdEvaluator

# 1. Define Tools / Functions
async def evaluate_video_ad(video_uri: str, user_request: str = "Evaluate this video", context: Context = None) -> str:
    """
    Evaluates a video advertisement using the dynamic rubric flow.
    Args:
        video_uri: The GCS URI of the video to evaluate.
        user_request: Specific instructions or context for evaluation.
        context: Optional ADK execution context for saving artifacts.
    Returns:
        A JSON string containing sub-agent findings and final report synthesis.
    """
    WORKSPACE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
    config_path = os.path.join(WORKSPACE_ROOT, "config/agents.yaml")
    evaluator = VideoAdEvaluator(config_path=config_path)
    import asyncio
    result = await asyncio.to_thread(evaluator.evaluate, video_uri, user_request)
    
    if context:
        from google.genai import types
        await context.save_artifact(
            "evaluation_result.json", 
            artifact=types.Part(text=json.dumps(result, indent=2))
        )
        
    return json.dumps(result, indent=2)

# 2. Define the ADK LlmAgent
# The agent's core responsibility is responding to requests by triggering the tool.
adk_agent = LlmAgent(
    model="gemini-2.5-flash",
    name="VideoAdEvaluatorAgent",
    instruction=(
        "You are an AI Coordinator for Video Ad Evaluations. "
        "When provided with a video URI or request, you MUST use the `evaluate_video_ad` tool "
        "to trigger the evaluation workflow and return its findings. "
        "If a user uploads a file directly to the chat window without providing its string path or GCS URI, "
        "you MUST reply explaining that you need the file's disk path (e.g., `media_assets/videos/...`) "
        "to execute the evaluation tool correctly."
    ),
    tools=[evaluate_video_ad]
)

# 3. Wrap with AdkApp
app = AdkApp(agent=adk_agent)
root_agent = adk_agent

if __name__ == "__main__":
    print("ADK App Defined with Agent:", adk_agent.name)
