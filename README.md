# BHI GenMedia Tooling

This repository contains tools for evaluating video advertisements using generative AI models (Gemini).

## Project Structure

*   `src/`: Core logic and agent orchestrators.
*   `config/`: Configuration files for agents and evaluation criteria.
*   `media_assets/`: Sample videos and media files for evaluation.
*   `results_frozen/`: Frozen results for regression and performance tracking.
*   `run_evals.sh`: Script to run evaluations on a set of videos.

## Getting Started

1.  Set up the environment:
    ```bash
    source .venv/bin/activate
    ```
2.  Run evaluations:
    ```bash
    ./run_evals.sh
    ```

## Local Development

*   `.scrap/`: Use this folder for local temporary scripts, scratchpads, and debug logs. It is listed in `.gitignore` and will not be pushed to GitHub.
