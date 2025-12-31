import asyncio
from duckduckgo_search import DDGS

async def test_search():
    query = "Backend Developer resume template modern 2025"
    print(f"Testing search for: {query}")
    
    try:
        with DDGS() as ddgs:
            results = list(ddgs.images(
                keywords=query,
                region='wt-wt',
                safesearch='moderate',
                type_image='photo',
                max_results=10
            ))
            print(f"Success! Found {len(results)} results.")
            for i, r in enumerate(results[:3]):
                print(f"Result {i+1}: {r.get('image')}")
                
    except Exception as e:
        print(f"Error during search: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_search())
