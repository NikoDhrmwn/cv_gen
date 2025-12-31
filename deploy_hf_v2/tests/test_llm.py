from browser_use import ChatGoogle
import asyncio
import os
from dotenv import load_dotenv
from langchain_core.messages import HumanMessage

load_dotenv()

async def test_llm():
    print("Testing LLM connection...")
    try:
        if not os.getenv("GOOGLE_API_KEY"):
            print("WARNING: GOOGLE_API_KEY not found in environment.")
        
        llm = ChatGoogle(model='gemini-1.5-flash')
        print(f"LLM initialized: {llm}")
        
        # Test simple invocation
        response = await llm.ainvoke([HumanMessage(content="Hello, answer with 'OK' if you can hear me.")])
        print(f"LLM Response: {response.content}")
        
    except Exception as e:
        print(f"LLM Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_llm())
