from google import genai
from google.genai import types
import os
from dotenv import load_dotenv

load_dotenv()

def reorder_sections_ai(html: str, order: list[str]) -> str:
    """
    Uses Gemini to strictly reorder the HTML sections based on the provided ID list.
    """
    api_key = os.getenv("GOOGLE_API_KEY")
    client = genai.Client(api_key=api_key)

    prompt = f"""
    You are an expert HTML Layout Engineer.
    
    TASK: Rearrange the HTML sections in the provided code to match the EXACT order specified below.
    
    TARGET ORDER (List of ID/Type substrings):
    {order}
    
    INSTRUCTIONS:
    1. Identify the 'Main Content' and 'Sidebar' containers in the HTML.
    2. Move the HTML blocks corresponding to the requested sections into the correct visual order.
    3. Ensure you move the ENTIRE block (including headers, wrappers, and mustache loops like {{{{ #work }}}}...{{{{ /work }}}}).
    4. DO NOT Change the CSS or styling.
    5. DO NOT Add new content or change text. ONLY REORDER.
    6. If a section ID from the list is missing in the HTML, ignore it.
    7. Return ONLY the full valid HTML string.
    
    HTML CODE:
    {html}
    """

    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash-exp",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="text/plain"
            )
        )
        
        if response.text:
            clean_html = response.text.replace("```html", "").replace("```", "").strip()
            return clean_html
            
    except Exception as e:
        print(f"Layout Agent Error: {e}")
        return None
    
    return None
