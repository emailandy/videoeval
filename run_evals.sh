#!/bin/bash

# --- Configuration ---
# Set the maximum number of parallel jobs
MAX_JOBS=6

# Create the results directory if it doesn't exist
mkdir -p results

# --- File list ---
# List of video files to process.
# Using an array makes it easier to manage.
declare -a FILES=(
  "03_IN_Great_Indian_Agoda_Wedding_Saga-Cha_Cha_Loved_16x9_15s.mp4"
  "10_IN_Middle_class_dream_16x9_15s.mp4"
  "16_IN_Honeymoon_So_Good_(Jacuzzi_Ver_2)_16x9_15s.mp4"
  "17_IN_Honeymoon_So_Good_(Pool_Ver)_16x9_15s.mp4"
  "18_IN_The_Deals_Moment_16x9_15s.mp4"
  "19_IN_Cousin_Tracker_Activated_16x9_15s.mp4"
)

# --- Define the processing function ---
# This function contains the logic for processing a single file.
# We define it once and call it for each file.
process_file() {
  local filename="$1"
  # Extract the base number (e.g., "03") from the filename
  local base_id=$(echo "$filename" | cut -d'_' -f1)
  
  echo "Starting processing for $filename (ID: $base_id)..."
  
  python run_with_backoff.py python main.py "gs://bhi-video-ad-eval-assets/$filename" \
    | sed -e "1,/--- Evaluation Complete ---/d" \
    | jq . > "results/$base_id.json"
    
  echo "Finished processing for $filename."
}

# --- Export the function so xargs can use it ---
export -f process_file

# --- Run the jobs in parallel using xargs ---
# printf will print each item from the FILES array on a new line.
# xargs will take these lines and run the process_file function for each one,
# respecting the maximum number of parallel jobs (-P $MAX_JOBS).
printf "%s\n" "${FILES[@]}" | xargs -I {} -P "$MAX_JOBS" bash -c 'process_file "{}"'

echo "All jobs have been completed."
echo "Generating comparative analysis..."
python compare_results.py
