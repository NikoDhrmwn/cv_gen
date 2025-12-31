import asyncio
import os
from agents.discovery import discover_templates

# Set up environment variables if needed (assuming .env is loaded by the app or auto-loaded)
from dotenv import load_dotenv
load_dotenv()

async def main():
    print("Starting discovery...")
    try:
        results = await discover_templates("software engineer")
        print("Discovery complete.")
        print(f"Results: {results}")
        
        # Check if they are fallbacks
        is_fallback = False
        for f in results:
            # Fallback logic in discovery.py copies fallback_n.png to template_n.png
            # We can check file size or content, but here we just look at the logs (stdout)
            # discovery.py prints "Using fallback templates to fill gaps." if it falls back.
            pass
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    # Ensure we are in backend dir
    if os.path.basename(os.getcwd()) != "backend":
        print("Please run this from the backend directory")
    else:
        asyncio.run(main())
