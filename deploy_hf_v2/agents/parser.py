import os
import json
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

def parse_cv_content(content: str) -> dict:
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_API_KEY is not set")
    
    client = genai.Client(api_key=api_key)
    
    prompt = """
    You are an expert CV parser.
    Extract the following information from the provided CV/Resume text into a structured JSON format.
    
    JSON Schema:
    {
      "basics": {
        "name": "Full Name",
        "label": "Job Title",
        "email": "Email",
        "phone": "Phone",
        "location": "Location (City, Country)",
        "summary": "Professional Summary",
        "profiles": [
           { "network": "LinkedIn", "url": "..." },
           { "network": "GitHub", "url": "..." }
        ]
      },
      "work": [
        {
          "company": "Company Name",
          "position": "Job Title",
          "startDate": "Start Date",
          "endDate": "End Date",
          "summary": "Description/Bullets"
        }
      ],
      "education": [
        {
          "institution": "University/School",
          "area": "Degree/Field",
          "startDate": "Start Year",
          "endDate": "End Year"
        }
      ],
      "skills": [
         { "name": "Skill Name", "level": 80 }
      ],
      "languages": [
         { "name": "Language", "level": 100 }
      ]
    }
    
    Rules:
    - If a field is missing, leave it empty or omit.
    - Infer "level" for skills (0-100) if described (e.g. "Basic" -> 40, "Expert" -> 100). Default to 80.
    - Normalize dates to "Month YYYY" or "YYYY" format.
    - Return ONLY valid JSON.
    """

    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash-exp",
            contents=[
                types.Content(
                    role="user",
                    parts=[
                        types.Part.from_text(text=prompt),
                        types.Part.from_text(text=f"CV CONTENT:\n\n{content}")
                    ]
                )
            ]
        )
        
        if not response.text:
            return None
            
        json_str = response.text.replace("```json", "").replace("```", "").strip()
        data = json.loads(json_str)
        return data
        
    except Exception as e:
        print(f"Error parsing CV: {e}")
        return None
