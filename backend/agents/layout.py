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

    # Convert order list to a clean string representation
    order_str = "\n".join([f"- {item}" for item in order])

    prompt = f"""
    You are a strict HTML Layout Preserver algorithm.
    
    INPUT: 
    1. A full HTML document containing a Resume/CV template.
    2. A target order list for the sections (e.g., 'work', 'education', 'skills').
    
    YOUR TASK:
    - Reorder the HTML content blocks (Sections) within the 'main' or 'sidebar' containers to match the target order.
    - Return the COMPLETE, VALID HTML with no missing tags.
    
    CRITICAL RULES (VIOLATION = FAILURE):
    1. PRESERVE ALL `<style>`, `<head>`, `<script>`, and CSS classes EXACTLY. Do not strip them.
    2. PRESERVE ALL Mustache/Handlebars syntax EXACTLY. 
       - `{{{{#section}}}}` must remain `{{{{#section}}}}`.
       - `{{{{variable}}}}` must remain `{{{{variable}}}}`.
       - DO NOT escape them (e.g. do NOT change `{{{{` to `&lcub;`).
    3. ONLY move the section blocks. A section block typically includes:
       - The section header (e.g. `<h3>Work</h3>`)
       - The Mustache loop (e.g. `{{{{#work}}}}...{{{{/work}}}}`)
       - The wrapper `<div>` if present.
    4. If a section from the list is NOT found, ignore it.
    5. If a section is found but not in the list, keep it where it is (or move it to bottom if implied).
       (Better: Keep static content in place, only swap the requested movable blocks).
    
    TARGET ORDER:
    {order_str}
    
    HTML CODE:
    {html}
    
    RESPONSE FORMAT:
    Return ONLY the raw HTML string. No markdown formatting (no ```html).
    """

    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash-exp",
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.0, # Deterministic behavior
                response_mime_type="text/plain"
            )
        )
        
        if response.text:
            clean_html = response.text.replace("```html", "").replace("```", "").strip()
            # Simple validation: Check if basic tags exist
            if "</html>" not in clean_html[-20:]: 
                # Sometimes models cut off. If so, return original to be safe.
                print("Layout Agent Error: Result truncated.")
                return None
            return clean_html
            
    except Exception as e:
        print(f"Layout Agent Error: {e}")
        return None
    
    return None
