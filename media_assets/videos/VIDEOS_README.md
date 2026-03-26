python main.py "gs://bhi-video-ad-eval-assets/03_IN_Great_Indian_Agoda_Wedding_Saga-Cha_Cha_Loved_16x9_15s.mp4" | tee >(sed -e '1,/--- Evaluation Complete ---/d' | jq . > results/03.json)


python main.py "gs://bhi-video-ad-eval-assets/10_IN_Middle_class_dream_16x9_15s.mp4" | tee >(sed -e '1,/--- Evaluation Complete ---/d' | jq . > results/10.json)


python main.py "gs://bhi-video-ad-eval-assets/16_IN_Honeymoon_So_Good_(Jacuzzi_Ver_2)_16x9_15s.mp4" | tee >(sed -e '1,/--- Evaluation Complete ---/d' | jq . > results/16.json)


python main.py "gs://bhi-video-ad-eval-assets/17_IN_Honeymoon_So_Good_(Pool_Ver)_16x9_15s.mp4" | tee >(sed -e '1,/--- Evaluation Complete ---/d' | jq . > results/17    .json)


python main.py "gs://bhi-video-ad-eval-assets/18_IN_The_Deals_Moment_16x9_15s.mp4" | tee >(sed -e '1,/--- Evaluation Complete ---/d' | jq . > results/18.json)


python main.py "gs://bhi-video-ad-eval-assets/19_IN_Cousin_Tracker_Activated_16x9_15s.mp4" | tee >(sed -e '1,/--- Evaluation Complete ---/d' | jq . > results/19.json)





Models

publishers/google/models/gemini-3.1-pro-preview
our most powerful agentic and coding model. It features a 1M token context window with the complex multimodal understanding capabilities.


publishers/google/models/gemini-3.1-flash-lite-preview
Designed for high-volume, cost-sensitive traffic, Gemini 3.1 Flash Lite delivers a massive quality leap over previous Lite generations while matching the core performance of Gemini 2.5 Flash.


publishers/google/models/gemini-3-flash-preview
Our agentic workhorse model, bringing near Pro agentic, coding and multimodal intelligence, with more balanced cost and speed.


publishers/google/models/gemini-3-pro-image-preview
Our standard model upgraded for rapid creative workflows with image generation and conversational, multi-turn editing capabilities.


