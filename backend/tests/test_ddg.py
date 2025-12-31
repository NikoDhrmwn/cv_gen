from duckduckgo_search import DDGS

try:
    print("Testing DDGS search...")
    with DDGS() as ddgs:
        results = list(ddgs.images(
            keywords="software engineer resume template 2025",
            region='wt-wt',
            safesearch='moderate',
            max_results=3
        ))
    
    print(f"Found {len(results)} results")
    for i, r in enumerate(results):
        print(f"{i+1}. {r.get('image', 'NO IMAGE URL')[:80]}")
        
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
