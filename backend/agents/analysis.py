import os
import time
import traceback
from pathlib import Path
from dotenv import load_dotenv
from typing import Optional
from google import genai
from google.genai import types

load_dotenv()

MAX_RETRIES = 3
RETRY_DELAY = 2  # seconds

def analyze_screenshot(image_path: str) -> Optional[dict]:
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_API_KEY is not set")
    
    client = genai.Client(api_key=api_key)
    
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image not found at {image_path}")

    with open(image_path, "rb") as f:
        image_bytes = f.read()

    prompt = """
    You are an expert CV/Resume template designer and frontend developer with FULL CREATIVE FREEDOM.
    
    Analyze this CV template image and generate a COMPLETE, PRODUCTION-READY HTML/CSS that replicates its design.
    You have COMPLETE AUTONOMY over the form_schema design - adapt it to match EXACTLY what the CV template needs.
    
    CRITICAL REQUIREMENTS:
    1. Generate complete HTML with inline CSS that visually matches the template
    2. Use Mustache-style placeholders {{variable_name}} for all user-editable content
    3. The HTML must be self-contained (no external dependencies except Google Fonts)
    4. Support print/PDF export with @media print styles
    5. PRIMARY TARGET IS A4 PAPER (210mm width). The layout MUST be preserved at 794px width (A4 @ 96dpi).
    6. DETECT ALL SPECIAL UI ELEMENTS - this is your PRIMARY TASK
    
    CRITICAL PAGINATION & ROBUSTNESS RULES:
    1. MULTI-PAGE READY: Do NOT assume content fits on one page. The template must scale vertically.
       - NEVER use fixed heights (height: 100vh or height: 1000px) for the main container. Use min-height: 100vh.
       - Sidebar background must stretch infinitely (use flexbox or grid with stretch).
    2. PREVENT BAD BREAKS: Add this CSS to your <style>:
       .cv-section, .kn-section { break-inside: avoid; page-break-inside: avoid; }
       h1, h2, h3, h4 { break-after: avoid; page-break-after: avoid; }
    3. NO STRETCHED IMAGES: All user images must have `object-fit: cover` and explicit aspect ratios.
    4. ROBUST LAYOUT: If the content is long, the design must gracefully flow to Page 2 without overlapping or breaking the sidebar.
    
    VISUAL ELEMENT DETECTION - EXTREMELY CRITICAL:
    You MUST carefully analyze the image for ALL types of visual proficiency/rating indicators:
    
    1. DOT RATINGS (●●●●○): Count the EXACT number of dots/circles. Common: 5 dots.
       - These show proficiency as filled vs unfilled dots
       - The form should have a "dots" or "rating" type with appropriate max value
       
    2. PROGRESS BARS (████░░): Continuous horizontal bars showing percentage
       - Use "slider" type with min:0, max:100
       
    3. STAR RATINGS (★★★☆☆): Similar to dots but star-shaped
       - Use "rating" type with min:1, max:5 (or however many stars)
       
    4. PERCENTAGE TEXT (85%): Numeric percentage displayed as text
       - Use "percentage" type
       
    5. SKILL LEVEL TEXT (Expert, Intermediate, Beginner): Text-based proficiency
       - Use "select" type with options array
       
    6. CIRCLE PROGRESS: Circular progress indicators
       - Use "slider" type
    
    LAYOUT DETECTION:
    1. SIDEBAR VS HEADER: Check if the photo/name is inside the colored sidebar or in a white header.
    2. FULL HEIGHT SIDEBAR: If the sidebar color goes from the very top to the very bottom:
       - The ROOT container MUST be a CSS GRID: <div class="cv-container" style="display:grid; grid-template-columns: 30% 70%; min-height:100vh;">
       - The SIDEBAR div MUST be the first child and MUST have id="cv-sidebar": <div id="cv-sidebar" class="sidebar"><!-- SLOT-START: SIDEBAR -->...<!-- SLOT-END: SIDEBAR --></div>
       - The MAIN content div MUST be the second child and MUST have id="cv-main": <div id="cv-main" class="main-content"><!-- SLOT-START: MAIN -->...<!-- SLOT-END: MAIN --></div>
       
       DRAG & DROP COMPATIBILITY (REQUIRED):
       - To allow the user to move sections around, you MUST wrap each section (including its Header) in a specific container.
       - Structure:
         <div class="cv-section" data-section-type="work">
            <h3 class="section-title">Work Experience</h3>
            {{#work}}...{{/work}}
         </div>
       - Do this for ALL sections (Skills, Education, Languages, etc.).
       - This is critical for the "Move Section" feature to work correctly.
       
       - Use linear-gradient background for multi-page PDF support.
    
    IGNORE IRRELEVANT ELEMENTS:
    - Ignore watermarks like "Powered by Platform", "resume.com", "Page 1/1" or any brand logos.
    - Do not include them in the generated HTML.
    - Ignore browser UI elements.
    
    VERY IMPORTANT - CLEAN CONTENT & NO BRANDING:
    - IGNORE WATERMARKS: Do not reproduce text like "qwikresume", "myperfectresume", "zety" or other brand watermarks.
    - SOCIAL PROFILES: You MUST use {{#basics.profiles}}...{{/basics.profiles}} loop.
    - NO INLINE SVG ICONS: Use Unicode or CSS shapes only.
    
    PLACEHOLDER NAMING CONVENTION:
    - {{basics.name}}, {{basics.label}}, {{basics.email}}, {{basics.phone}}, {{basics.location}}, {{basics.summary}}
    - {{basics.image}} - Profile image URL
    - {{#basics.profiles}}...{{/basics.profiles}} - Social links loop (contains {{network}}, {{url}})
    - {{#work}}...{{/work}} - Work experience loop
    - {{#education}}...{{/education}} - Education loop
    - {{#skills}}...{{/skills}} - Skills loop (ALWAYS include {{level}} and {{level_pct}} for visual indicators)
    - {{#languages}}...{{/languages}} - Languages loop (ALWAYS include {{level}} and {{level_pct}})
    - {{#customSections}}...{{/customSections}} - Any additional sections
    
    ===========================================
    FORM SCHEMA GENERATION - YOU HAVE FULL FREEDOM
    ===========================================
    
    The form_schema you generate will be used DIRECTLY to build the editor UI.
    You must design it to PERFECTLY match the CV template's visual requirements.
    
    AVAILABLE FIELD TYPES (use the EXACT type that matches the visual):
    
    1. "text" - Simple text input
    2. "email" - Email input
    3. "tel" - Phone input
    4. "textarea" - Multi-line text
    5. "image" - Image/Photo upload field
       Example for profile photo: {"name": "image", "label": "Profile Picture", "type": "image", "shape": "circle"}
       Example for icon: {"name": "icon", "label": "Section Icon", "type": "image", "shape": "square", "size": "40px"}
       IMPORTANT: Always detect if the template has a profile photo area and create an image field for basics.image
       
    6. "slider" - Range slider (specify min, max, step)
       Example: {"name": "level", "label": "Proficiency", "type": "slider", "min": 0, "max": 100, "step": 5, "showValue": true, "suffix": "%"}
       
    7. "dots" - Dot rating (●●●○○) - CRITICAL for templates with dot indicators
       Example: {"name": "level", "label": "Proficiency", "type": "dots", "maxDots": 5, "filledColor": "#00A8A8", "emptyColor": "#374151"}
       
    8. "stars" - Star rating (★★★☆☆)
       Example: {"name": "rating", "label": "Rating", "type": "stars", "maxStars": 5, "color": "#FFD700"}
       
    9. "rating" - Numeric rating (1-5 scale)
       Example: {"name": "rating", "label": "Rating", "type": "rating", "min": 1, "max": 5}
       
    10. "percentage" - Percentage input with % display
        Example: {"name": "level", "label": "Proficiency", "type": "percentage", "min": 0, "max": 100}
        
    11. "select" - Dropdown selection
        Example: {"name": "level", "label": "Level", "type": "select", "options": ["Native", "Fluent", "Proficient", "Intermediate", "Basic"]}
        
    12. "date" - Date picker
    13. "url" - URL input
    
    14. CUSTOM RENDER CONFIG (MAXIMUM FREEDOM) - For unique/complex UI elements
        When none of the above types match, you can design a CUSTOM UI using the "render" property.
        This gives you COMPLETE FREEDOM to design any input layout.
        
        Example - Custom layout with dots and text:
        {
            "name": "proficiency", 
            "label": "Proficiency Level",
            "render": {
                "type": "container",
                "className": "flex items-center gap-3",
                "children": [
                    {"type": "text-input", "field": "name", "className": "input-tech flex-1"},
                    {"type": "dot-rating", "field": "level", "props": {"count": 5, "filledColor": "#00A8A8"}},
                    {"type": "text-display", "field": "level", "props": {"suffix": "%"}}
                ]
            }
        }
        
        AVAILABLE RENDER TYPES:
        - Layout: "container", "row", "column", "flex", "grid", "group", "spacer"
        - Text: "text-input", "textarea", "number-input", "label"
        - Range: "slider", "range"
        - Symbols: "dot-rating", "star-rating", "heart-rating", "symbol-rating"
        - Progress: "progress-bar", "bar"
        - Selection: "select", "dropdown", "radio-group", "button-group", "segmented"
        - Toggle: "toggle", "switch", "checkbox"
        - Display: "text-display", "value", "badge", "tag"
        
        RENDER PROPS:
        - For dot-rating/star-rating: count, filledSymbol, emptySymbol, filledColor, emptyColor, size
        - For slider: min, max, step, showValue, suffix
        - For select: options (array of strings or {value, label} objects)
        - For progress-bar: backgroundColor, fillColor, height, borderRadius
        - Any element: className, style (CSS object)
        
        AVAILABLE SYMBOLS (use in filledSymbol/emptySymbol):
        "dot" (●), "dot-empty" (○), "star" (★), "star-empty" (☆), "heart" (♥), "heart-empty" (♡),
        "square" (■), "square-empty" (□), "diamond" (◆), "diamond-empty" (◇), "check" (✓), "cross" (✗)
    
    SECTION TYPES (use what matches the CV visual):
    - "array" - Standard list of items (work experience, education)
    - "skill-bars" - Section with progress bars
    - "skill-dots" - Section with dot ratings (●●●○○)
    - "skill-stars" - Section with star ratings
    - "tags" - Compact tag/chip style
    - "text-list" - Simple text items
    - "detailed" - Items with title, subtitle, date, description
    
    Return a JSON object with this structure:
    {
        "html_template": "<!DOCTYPE html>...(complete HTML with {{placeholders}})...",
        "form_schema": {
            "basics": {
                "fields": [
                    {"name": "name", "label": "Full Name", "type": "text", "required": true},
                    {"name": "label", "label": "Job Title", "type": "text", "required": true},
                    {"name": "email", "label": "Email", "type": "email", "required": true},
                    {"name": "phone", "label": "Phone", "type": "tel", "required": false},
                    {"name": "location", "label": "Location", "type": "text", "required": false},
                    {"name": "image", "label": "Profile Picture", "type": "image", "required": false},
                    {"name": "summary", "label": "Professional Summary", "type": "textarea", "required": false}
                ],
                "profiles": [
                    {"network": "LinkedIn", "placeholder": "https://linkedin.com/in/..."},
                    {"network": "GitHub", "placeholder": "https://github.com/..."}
                ]
            },
            "sections": [
                // ADAPT THESE TO MATCH THE TEMPLATE EXACTLY
                // Example for DOT RATING languages section:
                {
                    "id": "languages",
                    "title": "Languages",
                    "type": "skill-dots",  // Use this when you see dot indicators
                    "canAddMore": true,
                    "item_schema": [
                        {"name": "name", "label": "Language", "type": "text"},
                        {"name": "level", "label": "Proficiency", "type": "dots", "maxDots": 5, "filledColor": "#00A8A8", "emptyColor": "#374151"}
                    ],
                    "displayConfig": {
                        "layout": "inline",  // or "stacked"
                        "showLabel": true    // Show "Native", "Fluent", etc. label
                    }
                },
                // Example for PROGRESS BAR skills:
                {
                    "id": "skills",
                    "title": "Skills",
                    "type": "skill-bars",
                    "canAddMore": true,
                    "item_schema": [
                        {"name": "name", "label": "Skill", "type": "text"},
                        {"name": "level", "label": "Proficiency", "type": "slider", "min": 0, "max": 100, "showValue": true, "suffix": "%"}
                    ]
                }
            ]
        },
        "resume_data": {
            "basics": {
                "name": "Your Name",
                "label": "Professional Title",
                "email": "email@example.com",
                "phone": "+1 234 567 890",
                "location": "City, Country",
                "summary": "A brief professional summary...",
                "profiles": [
                    {"network": "LinkedIn", "url": "https://linkedin.com/in/yourprofile"}
                ]
            },
            "work": [...],
            "education": [...],
            "skills": [
                {"name": "Skill 1", "level": 90},  // Include level for visual rendering
                {"name": "Skill 2", "level": 80}
            ],
            "languages": [
                {"name": "English", "level": 100, "proficiency": "Native"},  // Include proficiency label if shown
                {"name": "French", "level": 60, "proficiency": "Proficient"}
            ],
            "customSections": []
        }
    }
    
    HTML GENERATION RULES:
    1. EXACTLY replicate the layout, colors, fonts, and spacing from the template image
    2. Extract and use the EXACT hex colors from the image
    3. If the template has a sidebar, implement it with proper CSS grid with linear-gradient background
    
    4. For PROGRESS BARS:
       <div class="skill-bar" style="background:#374151; height:6px; border-radius:3px;">
         <div class="skill-fill" style="width:{{level_pct}}%; background:#00A8A8; height:100%; border-radius:3px;"></div>
       </div>
       
    5. For DOT RATINGS (CRITICAL - analyze the exact number of dots in the image):
       <div class="dot-rating">
         {{#dotsArray}}
           <span class="dot {{#filled}}filled{{/filled}} {{^filled}}empty{{/filled}}">●</span>
         {{/dotsArray}}
       </div>
       OR use the overlay technique:
       <div class="rating-dots" style="position:relative; display:inline-block;">
         <span style="color:#374151;">●●●●●</span>
         <div style="position:absolute; top:0; left:0; width:{{level_pct}}%; overflow:hidden; color:#00A8A8; white-space:nowrap;">
           <span>●●●●●</span>
         </div>
       </div>
       
    6. For STAR RATINGS:
       <div class="star-rating" style="--rating: {{rating}};">
         <span class="stars-empty">☆☆☆☆☆</span>
         <span class="stars-filled" style="width: calc({{rating}} * 20%);">★★★★★</span>
       </div>
    
    7. Include Google Fonts if needed (via @import in style tag)
    8. MAKE ALL URLS CLICKABLE with proper <a> tags
    9. Email = mailto: links, Phone = tel: links
    10. Profile images: Always use "object-fit: cover;"
    
    CUSTOM SECTIONS - CRITICAL FOR USER FLEXIBILITY:
    You MUST include a {{#customSections}} block in your HTML template that:
    1. Uses the EXACT SAME CSS classes and styling as your other sections (skills, education, work, etc.)
    2. Matches the SAME header style (h2/h3, font-size, color, border, letter-spacing, text-transform)
    3. Uses the SAME item layout (spacing, alignment, typography)
    4. Supports BOTH skill-bar items (with level%) AND text items (title, subtitle, date, description)
    5. Is placed in the appropriate area (sidebar for compact items, main area for detailed items)
    
    Example - Your customSections block should look like your skills/languages sections:
    {{#customSections}}
      <div class="section">
        <!-- USE YOUR EXACT section-title CLASS AND STYLING from other sections -->
        <h2 class="section-title">{{title}}</h2>
        <div class="section-content">
          {{#items}}
            <div class="item">
              <!-- Support for skill-bar style items with level -->
              {{#level}}
                <div class="skill-item">
                  <span class="skill-name">{{name}}</span>
                  <!-- USE YOUR EXACT skill-bar STYLING from skills section -->
                  <div class="skill-bar">
                    <div class="skill-fill" style="width:{{level}}%"></div>
                  </div>
                </div>
              {{/level}}
              <!-- Support for text-based items without level -->
              {{^level}}
                <div class="text-item">
                  {{#title}}<div class="item-title">{{title}}</div>{{/title}}
                  {{#name}}<div class="item-name">{{name}}</div>{{/name}}
                  {{#subtitle}}<div class="item-subtitle">{{subtitle}}</div>{{/subtitle}}
                  {{#date}}<div class="item-date">{{date}}</div>{{/date}}
                  {{#description}}<div class="item-desc">{{description}}</div>{{/description}}
                  {{#summary}}<div class="item-summary">{{summary}}</div>{{/summary}}
                  {{#url}}<a href="{{url}}" class="item-url">{{url}}</a>{{/url}}
                </div>
              {{/level}}
            </div>
          {{/items}}
        </div>
      </div>
    {{/customSections}}
    
    IMPORTANT: The CSS for customSections items MUST be included in your <style> tag!
    Reuse the SAME classes you defined for skills/education/work sections.
    
    PRINT/PDF EXPORT REQUIREMENTS:
    @media print {
      @page { size: A4; margin: 0; }
      html, body { height: 100%; }
      body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .cv-container { display: grid !important; width: 100% !important; min-height: 100%; }
      .sidebar { height: 100%; break-inside: avoid; }
      .section { page-break-inside: avoid; }
      * { box-sizing: border-box; }
    }
    
    CRITICAL REMINDERS:
    - Return ONLY valid JSON. No markdown, no code blocks.
    - DETECT ALL VISUAL ELEMENTS in the template and create matching form fields
    - If you see DOTS (●●●○○) for proficiency, use type "dots" with correct maxDots
    - If you see BARS (████░░), use type "slider" 
    - If you see STARS (★★★☆☆), use type "stars"
    - MATCH THE DATA to the visual: if there are 5 dots and 3 are filled, level should be 60 (3/5 * 100)
    - The form_schema MUST produce an editor that can control ALL visual elements in the CV
    - ALWAYS INCLUDE {{#customSections}} block in the HTML - users WILL add their own sections!
    - Custom sections MUST use the SAME CSS classes and styling as your predefined sections
    """

    # Retry loop for API calls
    response = None
    last_error = None
    
    for attempt in range(MAX_RETRIES):
        try:
            response = client.models.generate_content(
                model="gemini-2.0-flash-exp",
                contents=[
                    types.Content(
                        role="user",
                        parts=[
                            types.Part.from_text(text=prompt),
                            types.Part.from_bytes(data=image_bytes, mime_type="image/png")
                        ]
                    )
                ]
            )
            
            # Check if response has valid text
            if response and response.text:
                break  # Success, exit retry loop
            else:
                print(f"Attempt {attempt + 1}: Empty response, retrying...")
                last_error = "Empty response from Gemini API"
                
        except Exception as e:
            last_error = str(e)
            print(f"Attempt {attempt + 1} failed: {e}")
            
        # Wait before retry (exponential backoff)
        if attempt < MAX_RETRIES - 1:
            time.sleep(RETRY_DELAY * (attempt + 1))
    
    # Check if we got a valid response after all retries
    if not response or not response.text:
        error_msg = f"Failed after {MAX_RETRIES} attempts. Last error: {last_error}"
        print(f"Error: {error_msg}")
        
        # Ensure logs directory exists
        os.makedirs("logs", exist_ok=True)
        
        with open("logs/error.log", "w", encoding="utf-8") as f:
            f.write(error_msg)
            if response:
                f.write(f"\nResponse object: {response}")
                # Check for safety ratings or blocked content
                if hasattr(response, 'candidates') and response.candidates:
                    for candidate in response.candidates:
                        if hasattr(candidate, 'finish_reason'):
                            f.write(f"\nFinish reason: {candidate.finish_reason}")
                        if hasattr(candidate, 'safety_ratings'):
                            f.write(f"\nSafety ratings: {candidate.safety_ratings}")
        return None
    
    # JSON Extraction Logic
    text = response.text
    
    # 1. Clean Markdown Code Blocks
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0]
    elif "```" in text:
        # Match content between ``` ... ```
        import re
        matches = re.findall(r'```(?:json)?(.*?)```', text, re.DOTALL)
        if matches:
            text = matches[0]
            
    # 2. Extract strictly from first { to last }
    start_idx = text.find('{')
    end_idx = text.rfind('}')
    
    if start_idx != -1 and end_idx != -1:
        text = text[start_idx : end_idx + 1]
    
    # 3. Aggressive Cleanup (Fix Common LLM JSON Errors)
    # Remove trailing commas before closing braces/brackets
    import re
    text = re.sub(r',\s*([\]}])', r'\1', text) 
    # Fix missing quotes around keys (simple cases)
    # text = re.sub(r'(\s*)(\w+)(\s*):', r'\1"\2"\3:', text) # Be careful with this one
    
    try:
        import json
        result_json = json.loads(text)
        return result_json
    except Exception as e:
        print(f"Error parsing JSON: {e}")
        
        # Logging
        with open("error_parse.log", "w", encoding="utf-8") as f:
            f.write(f"Error: {e}\n\nCleaned Text:\n{text}\n\nOriginal:\n{response.text}")
            
        # 4. Fallback: Return a Safe Default Schema instead of crashing
        print("Returning SAFE FALLBACK schema due to parsing error.")
        return {
            "html_template": """
                <div class="resume-container">
                    <h1>{{basics.name}}</h1>
                    <h2>{{basics.label}}</h2>
                    <p>{{basics.email}} | {{basics.phone}}</p>
                    <hr/>
                    <div class="section">
                        <h3>Experience</h3>
                        {{#work}}
                        <div class="item">
                            <h4>{{position}} - {{company}}</h4>
                            <p>{{startDate}} - {{endDate}}</p>
                            <p>{{summary}}</p>
                        </div>
                        {{/work}}
                    </div>
                </div>
            """,
            "form_schema": {
                "basics": {
                    "name": {"type": "text", "label": "Full Name"},
                    "label": {"type": "text", "label": "Job Title"}, 
                    "email": {"type": "text", "label": "Email"},
                    "phone": {"type": "text", "label": "Phone"}
                },
                "work": {
                    "type": "array",
                    "label": "Work Experience",
                    "items": {
                        "company": {"type": "text", "label": "Company"},
                        "position": {"type": "text", "label": "Position"},
                        "startDate": {"type": "text", "label": "Start Date"},
                        "endDate": {"type": "text", "label": "End Date"},
                        "summary": {"type": "textarea", "label": "Description"}
                    }
                }
            },
            "resume_data": {
                "basics": { "name": "Your Name", "label": "Professional Title" },
                "work": []
            }
        }

if __name__ == "__main__":
    path = "template_1.png"
    if os.path.exists(path):
        result = analyze_screenshot(path)
        if result:
            import json
            print(json.dumps(result, indent=2))
    else:
        print("No template_1.png found to test.")
