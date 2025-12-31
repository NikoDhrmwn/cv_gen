from google import genai
from google.genai import types
import os
import json
import traceback
from dotenv import load_dotenv

load_dotenv()

def refine_resume_data(current_data: dict, user_request: str, image_base64: str = None) -> dict:
    """
    Uses Gemini to modify the resume data based on a user's natural language request.
    Supports visual context via screenshots.
    """
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_API_KEY is not set")
    
    client = genai.Client(api_key=api_key)

    # CRITICAL FIX: Do not use f-strings with JSON content as curly braces conflict
    prompt_intro = f"""
    You are an expert Resume Editor AI. Your task is to modify the provided CV/Resume JSON data based on the User's Request.

    USER REQUEST:
    "{user_request}"

    INSTRUCTIONS:
    1. **ANALYZE & PLAN**: First, think about the best way to structure the resume. Does the user's request fit into standard sections?
    2. **SCHEMA AWARENESS**:
       - Standard Sections: 'basics', 'work', 'education', 'skills', 'languages', 'projects', 'certificates', 'awards', 'interests', 'references'.
       - **ALWAYS** use these standard sections if the content fits (e.g., use 'languages' for Language skills, NOT a custom "Spoken Languages" section).
       - **ONLY** use 'customSections' for truly unique content that doesn't fit standard schemas (e.g. "Speaking Engagements", "Patents").
    3. **CREATIVE FREEDOM**: You have full control to rewrite text, split bullet points, or merge them to make the CV look professional.
    4. **VISUAL CONTEXT**: If an image is provided, use it to infer layout needs (e.g. "it looks empty" -> add more detailed descriptions).
    5. **LAYOUT & BALANCE (CRITICAL)**:
       - **Maximize Page 1**: Keep the layout dense. Only move content to Page 2 if it absolutely doesn't fit.
       - **FILL GAPS**: If Page 1 ends up with empty space, you are AUTHORIZED to generate *new, relevant, high-quality* bullet points for the most recent job or expand the summary/profile to visual fill the page.
       - **Split Lists**: You can split long lists (like Skills) across pages if necessary, but prefer keeping them together on Page 1 if possible.
    6. **OUTPUT**: Return ONLY the valid JSON of the updated resume data.
       - Include a `_reasoning` field at the root level explaining your changes briefly.
    
    CURRENT RESUME DATA (JSON):
    """
    
    full_prompt = prompt_intro + "\n" + json.dumps(current_data, indent=2)

    contents = []
    
    # Add Image if available
    if image_base64:
        # Assuming base64 string doesn't have the header "data:image/png;base64," or we strip it
        if "base64," in image_base64:
             image_base64 = image_base64.split("base64,")[1]
             
        contents.append(types.Content(
            role="user",
            parts=[
                types.Part.from_bytes(data=image_base64, mime_type="image/png"),
                types.Part.from_text(text=full_prompt)
            ]
        ))
    else:
        contents.append(types.Content(
            role="user",
            parts=[types.Part.from_text(text=full_prompt)]
        ))

    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash-exp", # Better visual reasoning
            contents=contents,
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )
        
        if response.text:
            try:
                # Clean up if model adds markdown despite instructions
                text = response.text.replace("```json", "").replace("```", "").strip()
                return json.loads(text)
            except json.JSONDecodeError:
                print(f"JSON Decode Error. Raw text: {response.text}")
                return None
        return None

    except Exception as e:
        print(f"Editor Agent Error: {e}")
        traceback.print_exc()
        return None
