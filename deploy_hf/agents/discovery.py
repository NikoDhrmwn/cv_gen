import os
import shutil
import time
from typing import List
import requests
from duckduckgo_search import DDGS

# Cache to prevent rate limiting
_last_discovery_time = 0
_last_query = ""
_cache_duration = 300  # 5 minutes

async def discover_templates(query: str) -> List[str]:
    """
    Finds 3 distinct trending CV templates for the given query using DuckDuckGo image search API.
    Returns a list of local file paths (e.g., ["template_1.png", "template_2.png", "template_3.png"]).
    Uses caching to prevent rate limiting on repeated requests.
    """
    global _last_discovery_time, _last_query
    
    # Check if we have valid cached templates (less than 5 minutes old) AND matches query
    templates_exist = all(os.path.exists(f"assets/template_{i}.png") for i in range(1, 4))
    time_since_last = time.time() - _last_discovery_time
    same_query = _last_query == query
    
    if templates_exist and time_since_last < _cache_duration and same_query:
        print(f"Using cached templates for '{query}' (age: {int(time_since_last)}s)")
        return ["assets/template_1.png", "assets/template_2.png", "assets/template_3.png"]
    
    current_year = "2025"
    search_query = f"most recommended {query} resume template format {current_year}"
    
    discovered_files = []
    
    def download_image_from_url(url, filename):
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            response = requests.get(url, headers=headers, timeout=10)
            if response.status_code == 200:
                with open(filename, 'wb') as f:
                    f.write(response.content)
                return True
        except Exception as e:
            print(f"Failed to download {url}: {e}")
        return False
    
    try:
        # Clear specific old templates
        for i in range(1, 4):
            if os.path.exists(f"assets/template_{i}.png"):
                os.remove(f"assets/template_{i}.png")
        
        # Use DuckDuckGo search API directly in a separate thread to avoid loop conflicts
        # Simplified query for better results
        search_query = f"{query} resume template modern {current_year}"
        print(f"Searching for: {search_query}")
        
        def _sync_search(q):
            # FAST FAIL POLICY: 1 retry, short timeout.
            # If it fails, fallback immediately rather than hanging user.
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
                    # No sleep needed for fast fail
            print(f"All DDGS attempts failed. Last error: {last_err}")
            return []

        import asyncio
        try:
             loop = asyncio.get_running_loop()
        except RuntimeError:
             loop = asyncio.get_event_loop()
             
        results = await loop.run_in_executor(None, _sync_search, search_query)
            
        print(f"Found {len(results)} results from DuckDuckGo")
        
        print(f"Found {len(results)} image results")
        
        # Download up to 3 images asynchronously (using threads for blocking I/O)
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
            target_filename = f"assets/template_{successful_downloads+1}.png"
            
            # Run blocking download in thread
            # download_image_from_url is blocking, so we await it in executor
            download_success = await loop.run_in_executor(None, download_image_from_url, image_url, target_filename)
            
            if download_success:
                # Verify file size (should be > 10KB for a real template)
                try:
                    import os as os_check
                    # getsize is fast, local IO, acceptable in loop or wrap it too
                    if os_check.path.getsize(target_filename) > 10000:
                        discovered_files.append(target_filename)
                        successful_downloads += 1
                        print(f"  -> Saved as {target_filename}")
                    else:
                        print(f"  -> File too small, skipping")
                        os_check.remove(target_filename)
                except:
                    pass
            else:
                print(f"  -> Failed to download")
                
        print(f"Successfully downloaded {len(discovered_files)} templates from {attempted} attempts")
                
    except Exception as e:
        print(f"Discovery search error: {e}")
        import traceback
        traceback.print_exc()
    
    # Fallback Logic (Runs if search fails OR finds nothing)
    try:
        if not discovered_files or len(discovered_files) < 3:
            print("Using fallback templates to fill gaps.")
            fallback_sources = ["assets/fallback_1.png", "assets/fallback_2.png", "assets/fallback_3.png"]
            sample_source = "assets/sample_template.png"
            
            for i in range(1, 4):
                target = f"assets/template_{i}.png"
                source = fallback_sources[i-1]
                
                if os.path.exists(target) and target in discovered_files:
                    continue
                    
                if os.path.exists(source):
                    shutil.copy(source, target)
                    if target not in discovered_files:
                        discovered_files.append(target)
                elif os.path.exists(sample_source):
                    shutil.copy(sample_source, target)
                    if target not in discovered_files:
                        discovered_files.append(target)
                        
            print(f"Fallback/Fill complete. Available files: {discovered_files}")

    except Exception as e:
         print(f"Fallback generation failed: {e}")
    
    # Update cache timestamp and query after successful discovery
    _last_discovery_time = time.time()
    _last_query = query
         
    return sorted(discovered_files)
