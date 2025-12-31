import asyncio
import os
import sys
from agents.discovery import run_discovery_agent
from agents.analysis import analyze_screenshot

async def main():
    query = "minimalist product designer resume 2025"
    print(f"--- Phase 1: Discovery ({query}) ---")
    
    # 1. Run Discovery Agent
    # In a real scenario, the agent would return the path or we extract it from history.
    # Our modified discovery.py saves it to 'screenshot.png'.
    
    try:
        await run_discovery_agent(query)
    except Exception as e:
        print(f"Discovery Failed: {e}")
        # Continue to analysis if we have a screenshot (e.g. from manual download)

    screenshot_path = "screenshot.png"
    if not os.path.exists(screenshot_path):
        print("Error: screenshot.png not found. Discovery agent failed to capture.")
        return
    
    print(f"--- Phase 2: Analysis (Vision) ---")
    
    # 2. Run Analysis Agent
    result = analyze_screenshot(screenshot_path)
    
    if result:
        print("\n--- Success! Generated Analysis ---")
        print(result.model_dump_json(indent=2))
        
        # Save to file for inspection
        with open("result.json", "w") as f:
            f.write(result.model_dump_json(indent=2))
    else:
        print("Analysis Failed.")

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    asyncio.run(main())
