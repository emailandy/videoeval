import yaml
import json
import concurrent.futures
from google import genai
from google.genai import types
from google.genai.errors import ClientError
from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception

def _is_retryable_error(e):
    return isinstance(e, ClientError) and e.code == 429

from src.abcds.prompt_generator import prompt_generator
from src.abcds.configuration import Configuration
from src.abcds.long_form_abcd_features import get_long_form_abcd_feature_configs
from src.abcds.shorts_features import get_shorts_feature_configs

class VideoAdEvaluator:
    def __init__(self, config_path: str = "config/agents.yaml"):
        # Load the configuration containing all prompts and model info
        with open(config_path, 'r') as f:
            self.config = yaml.safe_load(f)
        
        # Initialize the Gemini client using Vertex AI
        # self.client = genai.Client(vertexai=True, project="bhi-video-ad-eval", location="us-central1")
        self.client = genai.Client(vertexai=True, project="bhi-video-ad-eval", location="global")
        self.model_id = self.config.get('modelId', 'gemini-2.5-flash')
        
    @retry(wait=wait_exponential(multiplier=2, min=10, max=120), stop=stop_after_attempt(7), retry=retry_if_exception(_is_retryable_error))
    def _generate_content_with_retry(self, model, contents, config=None):
        return self.client.models.generate_content(
            model=model,
            contents=contents,
            config=config,
        )
        
    @retry(wait=wait_exponential(multiplier=2, min=10, max=120), stop=stop_after_attempt(7), retry=retry_if_exception(_is_retryable_error))
    def _generate_content_stream_with_retry(self, model, contents, config=None):
        return self.client.models.generate_content_stream(
            model=model,
            contents=contents,
            config=config,
        )
        
    def _run_context_agent(self, user_request: str) -> dict:
        print("Retrieving evaluation context...")
        context_config = self.config.get('evaluation_context_agent', {})
        prompt = context_config.get('system_prompt', '')
        model_id = context_config.get('model', self.model_id)

        input_text = f"{prompt}\n\nUser Request: {user_request}"
        
        response = self._generate_content_with_retry(
            model=model_id,
            contents=input_text,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )
        
        try:
             return json.loads(response.text)
        except json.JSONDecodeError:
             print("Error: Context agent did not generate valid JSON.")
             return {"error": "Invalid JSON rubric", "raw_response": response.text}
        
    def _run_agent(self, video_uri: str, agent_name: str, agent_config: dict, rubric: dict) -> dict:
        print(f"Running agent: {agent_name}...")
        
        # In a real environment, you'd want to handle video uploading or 
        # ensure the URI is accessible. Here we pass the URI directly.
        video_part = types.Part.from_uri(
            file_uri=video_uri,
            mime_type="video/mp4"
        )
        
        prompt = agent_config.get('system_prompt', '')
        agent_model_id = agent_config.get('model', self.model_id)
        
        # Look for reference image assets
        image_parts = []
        brand_details = agent_config.get("brand_details", {})
        reference_assets = brand_details.get("reference_assets", [])
        for asset_uri in reference_assets:
            img_mime = "image/jpeg"
            if asset_uri.lower().endswith(".png"):
                img_mime = "image/png"
            elif asset_uri.lower().endswith(".webp"):
                img_mime = "image/webp"
            image_parts.append(types.Part.from_uri(file_uri=asset_uri, mime_type=img_mime))
            
        if reference_assets:
             prompt += "\n\nCRITICAL INSTRUCTION: Use the attached images as the absolute source-of-truth for the brand's visual identity (e.g., logos, colors, products), overriding any previous knowledge you may have."

        # Inject the rubric into the prompt
        if agent_name == "abcd_agent":
            # Generate the dynamic ABCD prompt
            abcd_config = Configuration()
            
            brand_details = agent_config.get("brand_details", {})
            abcd_config.set_brand_details(
                brand_name=brand_details.get("brand_name", "the featured brand"),
                brand_variations=brand_details.get("brand_variations", ""),
                products=brand_details.get("products", ""),
                products_categories=brand_details.get("products_categories", ""),
                call_to_actions=brand_details.get("call_to_actions", "")
            )
            
            # Since user mentioned videos are short, we run shorts features
            features = get_shorts_feature_configs()
            
            abcds_prompt_config = prompt_generator.get_abcds_prompt_config(features, abcd_config)
            
            # The prompt_config returns system_instructions AND the prompt questions
            abcd_dynamic_prompt = f"{abcds_prompt_config.system_instructions}\n\n{abcds_prompt_config.prompt}"
            
            full_prompt = (
                f"{prompt}\n\n"
                f"--- DYNAMIC ABCD INSTRUCTIONS ---\n"
                f"{abcd_dynamic_prompt}\n\n"
                f"--- GENERAL EVALUATION RUBRIC (FOR CONTEXT) ---\n"
                f"{json.dumps(rubric, indent=2)}\n\n"
            )
        else:
            full_prompt = (
                f"{prompt}\n\n"
                f"--- GENERAL EVALUATION RUBRIC (FOR CONTEXT) ---\n"
                f"{json.dumps(rubric, indent=2)}\n\n"
                f"CRITICAL INSTRUCTION: You must strictly adhere to the exact JSON output schema "
                f"defined in your specific system prompt. Do not attempt to score or output the "
                f"categories from the general rubric above; use them only as background context."
            )
        
        contents_payload = [video_part] + image_parts + [full_prompt]
        response = self._generate_content_with_retry(
            model=agent_model_id,
            contents=contents_payload,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )
        
        try:
             # The response should be exactly JSON format as requested in the prompt
             return json.loads(response.text)
        except json.JSONDecodeError:
             print(f"Error: {agent_name} did not generate valid JSON.")
             return {"error": "Invalid JSON response", "raw_response": response.text}

    def _find_issue_dict(self, data):
        """Recursively search for a dictionary containing 'issues_log' or 'catastrophic_issue_present'."""
        if isinstance(data, dict):
            if "catastrophic_issue_present" in data or "issues_log" in data:
                return data
            for key, value in data.items():
                found = self._find_issue_dict(value)
                if found is not None:
                    return found
        elif isinstance(data, list):
            for item in data:
                found = self._find_issue_dict(item)
                if found is not None:
                    return found
        return None

    def _calculate_metrics(self, results: dict) -> dict:
        total_weighted_score = 0.0
        total_weight = 0.0
        
        for agent_name, raw_result in results.items():
            result = self._find_issue_dict(raw_result)

            if isinstance(result, dict):
                # Fetch weight from config, default to 1.0
                agent_config = self.config.get('agents', {}).get(agent_name, {})
                weight = float(agent_config.get('weight', 1.0))
                
                # Dynamic score calculation based on issue log if score is not explicitly provided
                if "score_0_to_100" in result:
                    score = float(result.get("score_0_to_100", 0))
                else:
                    score = 100.0
                    if result.get("catastrophic_issue_present"):
                        score = 0.0
                    else:
                        for issue in result.get("issues_log", []):
                            severity = issue.get("severity", "").lower()
                            if severity == "minor":
                                score -= 5
                            elif severity == "moderate":
                                score -= 15
                            elif severity == "major":
                                score -= 30
                            elif severity == "catastrophic":
                                score -= 100
                        score = max(0.0, score)
                
                total_weighted_score += score * weight
                total_weight += weight
                
        final_score = (total_weighted_score / total_weight) if total_weight > 0 else 0.0
        
        return {
            "overall_weighted_score": round(final_score, 2),
            "total_weight_applied": round(total_weight, 2)
        }

    def _run_semantic_deduplication(self, results: dict) -> dict:
        print("Running LLM Semantic Deduplication...")
        dedup_prompt = """You are the Semantic Deduplicator Agent. 
Your task is to review the JSON output of multiple specialized video evaluation agents.
We enforce a strict Prioritization Cascading hierarchy:
- Tier 1 (Technical Foundation): `visual_artifact_checker`, `audio_realism_checker`, `av_sync_checker`
- Tier 2 (Style/Content): `abcd_agent`, `shorts_tv_ad_style`, `content_type_ad_style_creator`, etc.

Rules for Deduplication:
1. Time Rule: Timestamps that intersect or fall within a 2-second buffer are considered overlapping.
2. Semantic Rule: Compare the subject and action. If both issues occur in an overlapping time window and describe the exact same underlying visual or audio defect, they represent a duplication.
3. Prioritization Check: If a Tier 1 technical error and a Tier 2 stylistic error cover the exact same defect, you MUST prioritize the technical severity. Keep the Tier 1 issue and completely REMOVE the redundant Tier 2 issue from its respective agent's `issues_log` or `abcd_features` list.
4. Transparency: You must append a `"deduplications_log"` array to the root of the output JSON. Each entry should describe what was merged (e.g., "Merged abcd_agent stylistic deduction at 0:02-0:05 into visual_artifact_checker technical error").

You will be provided with the raw JSON findings from all agents.
You MUST output a valid JSON object containing the exact same keys as the input, with the duplicate issues removed from Tier 2 agents, and adding a new key `"deduplications_log"` at the root level containing an array of strings detailing the merges.
"""
        try:
            response = self._generate_content_with_retry(
                model="publishers/google/models/gemini-2.5-flash",
                contents=[dedup_prompt, f"RAW AGENT FINDINGS:\n{json.dumps(results, indent=2)}"],
                config=types.GenerateContentConfig(response_mime_type="application/json")
            )
            return json.loads(response.text)
        except Exception as e:
            print(f"Error during deduplication: {e}")
            return results

    def evaluate(self, video_uri: str, user_request: str = "Please evaluate this video ad.") -> dict:
        # 1. Get rubric from EvaluationContextAgent
        rubric = self._run_context_agent(user_request)
        print("Obtained Context Rubric.")
        
        results = {}
        
        # 2. Fan out to all specialized sub-agents in parallel
        agents_config = self.config.get('agents', {})
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
            future_to_agent = {
                executor.submit(self._run_agent, video_uri, agent_name, agent_config, rubric): agent_name
                for agent_name, agent_config in agents_config.items()
            }
            
            for future in concurrent.futures.as_completed(future_to_agent):
                agent_name = future_to_agent[future]
                try:
                    results[agent_name] = future.result()
                except Exception as exc:
                    print(f"Agent {agent_name} generated an exception: {exc}")
                    results[agent_name] = {"error": str(exc)}
            
        # 3. LLM Semantic Deduplication
        deduplicated_results = self._run_semantic_deduplication(results)
            
        # 4. Calculate deterministic math in Python on Deduplicated Results
        calculated_metrics = self._calculate_metrics(deduplicated_results)
            
        # 5. Synthesize results using the Orchestrator
        print(f"Synthesizing final report (Score: {calculated_metrics['overall_weighted_score']})...")
        orchestrator_config = self.config.get('orchestrator', {})
        orchestrator_prompt = orchestrator_config.get('system_prompt', '')
        
        # We pass both calculations and deduplicated findings as context to the orchestrator model
        synthesis_input = f"{orchestrator_prompt}\n\n## User Request:\n{user_request}\n\n## Evaluation Rubric Used:\n{json.dumps(rubric, indent=2)}\n\n## Calculated System Metrics (100% Accurate):\n{json.dumps(calculated_metrics, indent=2)}\n\n## Deduplicated Sub-Agent Findings:\n{json.dumps(deduplicated_results, indent=2)}"
        
        print("\n--- Synthesis Starting ---")
        final_response_stream = self._generate_content_stream_with_retry(
            model=self.model_id,
            contents=synthesis_input,
        )
        
        final_report_text = ""
        for chunk in final_response_stream:
             if chunk.text:
                  print(chunk.text, end="", flush=True)
                  final_report_text += chunk.text
        print("\n--- Synthesis Complete ---")
        
        dedup_log = deduplicated_results.pop("deduplications_log", [])
        
        return {
            "individual_checks": deduplicated_results,
            "deduplications_log": dedup_log,
            "final_report": final_report_text
        }
