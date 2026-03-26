import subprocess
import sys
import time

def run_with_backoff(command, max_retries=4, base_delay=5):
    for attempt in range(max_retries + 1):
        try:
            # Run the command, capturing both stdout and stderr
            result = subprocess.run(
                command, 
                check=True, 
                stdout=subprocess.PIPE, 
                stderr=subprocess.PIPE, 
                text=True
            )
            # If successful, print exactly what the underlying script would have
            sys.stdout.write(result.stdout)
            sys.stderr.write(result.stderr)
            return True
            
        except subprocess.CalledProcessError as e:
            # Check stderr to see if it contains a 429 or deadline error from the python script
            error_output = e.stderr + e.stdout
            
            # Identify API limits
            if "429" in error_output or "deadline" in error_output.lower() or "exhausted" in error_output.lower():
                if attempt < max_retries:
                    sleep_time = base_delay * (2 ** attempt)
                    sys.stderr.write(f"\n[Wrapper] API Quota or Deadline hit. Retrying in {sleep_time} seconds (Attempt {attempt+1}/{max_retries})...\n")
                    time.sleep(sleep_time)
                    continue
            
            # If it's not a quota error, or we ran out of retries, fail hard and pass the error up
            sys.stderr.write(f"\n[Wrapper] Command failed after {attempt} retries.\n")
            sys.stdout.write(e.stdout)
            sys.stderr.write(e.stderr)
            return False
            
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python run_with_backoff.py <command>")
        sys.exit(1)
        
    cmd_to_run = sys.argv[1:]
    success = run_with_backoff(cmd_to_run)
    if not success:
        sys.exit(1)
