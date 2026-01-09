import os
import shutil
import time
import base64
from typing import List
import requests
from duckduckgo_search import DDGS

async def discover_templates(query: str) -> List[str]:
    """
    Finds 3 distinct trending CV templates for the given query using DuckDuckGo image search API.
    Returns a list of base64 data URIs.
    """
    current_year = "2025"
    
    discovered_images = []
    
    def download_image_as_base64(url):
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            response = requests.get(url, headers=headers, timeout=10)
            if response.status_code == 200:
                content = response.content
                if len(content) > 10000: # Min 10KB
                    mime_type = response.headers.get("Content-Type", "").split(";")[0]
                    if not mime_type or "image" not in mime_type:
                        # Fallback simple detection
                        if content.startswith(b"\x89PNG\r\n\x1a\n"):
                            mime_type = "image/png"
                        elif content.startswith(b"\xff\xd8"):
                            mime_type = "image/jpeg"
                        elif content.startswith(b"RIFF") and content[8:12] == b"WEBP":
                            mime_type = "image/webp"
                        else:
                            mime_type = "image/png" # Default fallback

                    b64 = base64.b64encode(content).decode('utf-8')
                    return f"data:{mime_type};base64,{b64}"
        except Exception as e:
            print(f"Failed to download {url}: {e}")
        return None
    
    try:
        # Use DuckDuckGo search API directly in a separate thread to avoid loop conflicts
        search_query = f"{query} resume template modern {current_year}"
        print(f"Searching for: {search_query}")
        
        def _sync_search(q):
            # FAST FAIL POLICY: 1 retry, short timeout.
            max_retries = 2
            last_err = None
            for attempt in range(max_retries):
                try:
                    # Timeout 8s (fast)
                    with DDGS(timeout=8) as ddgs:
                        return list(ddgs.images(
                            keywords=q,
                            region='wt-wt',
                            safesearch='moderate',
                            max_results=50 
                        ))
                except Exception as e:
                    last_err = e
                    print(f"DDGS Sync Error (Attempt {attempt+1}/{max_retries}): {e}")
            print(f"All DDGS attempts failed. Last error: {last_err}")
            return []

        import asyncio
        try:
             loop = asyncio.get_running_loop()
        except RuntimeError:
             loop = asyncio.get_event_loop()
             
        results = await loop.run_in_executor(None, _sync_search, search_query)
            
        print(f"Found {len(results)} results from DuckDuckGo")
        
        # Download up to 3 images asynchronously
        successful_downloads = 0
        attempted = 0
        
        for result in results:
            if successful_downloads >= 3:
                break
            
            attempted += 1
            image_url = result.get('image')
            if not image_url:
                continue
            
            # Skip small images or thumbnails
            if 'thumb' in image_url.lower() or 'icon' in image_url.lower():
                continue
                
            print(f"[{attempted}/{len(results)}] Downloading: {image_url[:80]}...")
            
            # Run blocking download in thread
            data_uri = await loop.run_in_executor(None, download_image_as_base64, image_url)
            
            if data_uri:
                discovered_images.append(data_uri)
                successful_downloads += 1
                print(f"  -> Downloaded successfully")
            else:
                print(f"  -> Failed to download or too small")
                
        print(f"Successfully downloaded {len(discovered_images)} templates from {attempted} attempts")
                
    except Exception as e:
        print(f"Discovery search error: {e}")
        import traceback
        traceback.print_exc()
    
    # Fallback Logic (Runs if search fails OR finds nothing)
    try:
        if not discovered_images or len(discovered_images) < 3:
            print("Using fallback templates to fill gaps.")
            fallback_sources = ["assets/fallback_1.png", "assets/fallback_2.png", "assets/fallback_3.png"]
            sample_source = "assets/sample_template.png"
            
            for i in range(3):
                if i < len(discovered_images):
                    continue

                source = fallback_sources[i] if i < len(fallback_sources) else sample_source

                if os.path.exists(source):
                     with open(source, "rb") as f:
                        content = f.read()
                        b64 = base64.b64encode(content).decode('utf-8')
                        # Simplistic mime detection for local files
                        ext = os.path.splitext(source)[1][1:]
                        if ext == "jpg": ext = "jpeg"
                        discovered_images.append(f"data:image/{ext};base64,{b64}")
                        
            print(f"Fallback/Fill complete. Total images: {len(discovered_images)}")

    except Exception as e:
         print(f"Fallback generation failed: {e}")
         import traceback
         traceback.print_exc()
    
    return discovered_images
