from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import os
from datetime import datetime
from io import BytesIO
from pypdf import PdfReader
from agents.parser import parse_cv_content

import sys
import asyncio

# Fix for Windows loop (needed for Playwright)
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

app = FastAPI(title="Agentic CV Generator API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve assets directory files (for images) at /images
app.mount("/images", StaticFiles(directory="assets"), name="images")

@app.get("/")
async def root():
    return {"message": "Agentic CV Generator API is running"}

class DiscoverRequest(BaseModel):
    query: str

class GenerateRequest(BaseModel):
    template_id: str # Can be a base64 Data URI or a file path
    query: str

@app.post("/discover")
async def discover_templates_endpoint(request: DiscoverRequest):
    """
    Phase 1: Find 3 trending templates for the user to choose from.
    """
    from agents.discovery import discover_templates
    
    try:
        # Find 3 templates
        images = await discover_templates(request.query)
        
        # Format for frontend
        results = []
        for i, data_uri in enumerate(images):
            # We send the full Data URI as both ID and URL.
            # This makes the frontend stateless regarding image storage.
            results.append({
                "id": data_uri,
                "url": data_uri,
                "title": f"Option {i+1}",
                "description": f"Trending {request.query} Style {i+1}"
            })
            
        return {"templates": results}
    except Exception as e:
        print(f"Discovery failed: {e}")
        return {"error": str(e)}

@app.post("/generate")
async def generate_cv(request: GenerateRequest):
    """
    Phase 2: Generate form from selected template.
    """
    template_data = request.template_id
    
    # 2. Analysis - Extract form structure from the selected template
    from agents.analysis import analyze_screenshot
    
    # If it's not a Data URI, check if it's a legacy fallback path
    if not template_data.startswith("data:"):
        if not os.path.exists(template_data):
             # Try fallbacks
             if os.path.exists("assets/screenshot.png"):
                  template_data = "assets/screenshot.png"
             elif os.path.exists("assets/sample_template.png"):
                  template_data = "assets/sample_template.png"
             else:
                  return {"error": f"Template not found and no fallbacks available."}

    try:
        result = analyze_screenshot(template_data)
        if not result:
            return {"error": "Analysis failed - could not parse the template."}
        
        # Add discovery metadata to result
        result["_meta"] = {
            "discovery": {
                "source": "selected",
                "search_query": request.query,
                # Avoid echoing back the huge base64 string in meta
                "selected_template": "base64_data" if template_data.startswith("data:") else template_data
            },
            "analyzed_at": datetime.now().isoformat()
        }
        
        return result
    except Exception as e:
        return {"error": f"Analysis failed: {str(e)}"}

@app.post("/import-cv")
async def import_cv_endpoint(file: UploadFile = File(...)):
    """
    Import data from existing CV (PDF/Text).
    """
    content = ""
    filename = file.filename.lower()
    
    try:
        file_bytes = await file.read()
        
        if filename.endswith(".pdf"):
            try:
                reader = PdfReader(BytesIO(file_bytes))
                for page in reader.pages:
                    content += page.extract_text() + "\n"
            except Exception as e:
                return {"error": f"PDF parsing failed: {str(e)}"}
        else:
            # Assume text/md
            content = file_bytes.decode("utf-8", errors="ignore")
            
        if not content.strip():
            return {"error": "Could not extract text from file"}
            
        data = parse_cv_content(content)
        if not data:
            return {"error": "Failed to parse CV data"}
            
        return {"resume_data": data}
        
    except Exception as e:
        print(f"Import failed: {e}")
        return {"error": str(e)}

class RefineRequest(BaseModel):
    resume_data: dict
    user_request: str
    image_base64: str | None = None

@app.post("/refine")
async def refine_cv(request: RefineRequest):
    """
    Phase 3: Real-time AI editing of the CV data.
    """
    from agents.editor import refine_resume_data
    
    try:
        updated_data = refine_resume_data(request.resume_data, request.user_request, request.image_base64)
        if not updated_data:
             return {"error": "AI could not process the revision."}
        
        return {"resume_data": updated_data}
    except Exception as e:
        return {"error": f"Refinement failed: {str(e)}"}

class ReorderRequest(BaseModel):
    html: str
    order: list[str]

@app.post("/reorder")
async def reorder_endpoint(request: ReorderRequest):
    """
    Phase 4: AI Layout Reordering
    """
    from agents.layout import reorder_sections_ai
    
    new_html = reorder_sections_ai(request.html, request.order)
    if not new_html:
        return {"error": "Failed to reorder layout"}
        
    return {"html": new_html}

class PdfRequest(BaseModel):
    resume_data: dict
    template_id: str
    html: str | None = None

@app.post("/pdf")
def generate_pdf_endpoint(request: PdfRequest):
    """
    Generate PDF using Sync Playwright (running in threadpool).
    This bypasses asyncio event loop issues on Windows.
    """
    from playwright.sync_api import sync_playwright
    from fastapi.responses import Response
    from fastapi import HTTPException
    
    try:
        html_content = request.html
        if not html_content:
             html_content = "<html><body><h1>Backend: No HTML received</h1></body></html>"

        # SANITIZE HTML: Remove page-break markers before PDF generation
        import re
        # Remove all elements with class containing "page-break-marker" (and their children)
        html_content = re.sub(
            r'<div[^>]*class="[^"]*page-break-marker[^"]*"[^>]*>.*?</div>',
            '',
            html_content,
            flags=re.DOTALL | re.IGNORECASE
        )
        # Also remove any standalone markers without content
        html_content = re.sub(
            r'<div[^>]*class="[^"]*page-break-marker[^"]*"[^>]*/?>',
            '',
            html_content,
            flags=re.IGNORECASE
        )

        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page()
            
            # 'networkidle' can hang if there are open connections (e.g. fonts, analytics, tracking)
            # 'load' is usually sufficient for static content and safer from deadlocks.
            page.set_content(html_content, wait_until="load", timeout=30000)
            page.emulate_media(media="print") 
            
            pdf_bytes = page.pdf(
                format="A4",
                print_background=True,
                margin={"top": "0px", "bottom": "0px", "left": "0px", "right": "0px"}
            )
            browser.close()
            
            return Response(
                content=pdf_bytes, 
                media_type="application/pdf",
                headers={"Content-Disposition": "attachment; filename=resume.pdf"}
            )
            
    except Exception as e:
        print(f"PDF Gen Error: {e}")
        raise HTTPException(status_code=500, detail=f"PDF Generation Failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
