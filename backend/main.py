from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import os
from datetime import datetime
from io import BytesIO
from pypdf import PdfReader
from agents.parser import parse_cv_content
from agents.chat_manager import get_chat_manager
import uuid

import sys
import asyncio

# Fix for Windows loop (needed for Playwright)
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

app = FastAPI(title="Agentic CV Generator API")

# Initialize Chat Manager for conversation history
chat_manager = get_chat_manager()

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
    template_id: str # e.g., "template_1.png"
    query: str

@app.post("/discover")
async def discover_templates_endpoint(request: DiscoverRequest):
    """
    Phase 1: Find 3 trending templates for the user to choose from.
    """
    from agents.discovery import discover_templates
    
    try:
        # Find 3 templates
        files = await discover_templates(request.query)
        
        # Format for frontend
        results = []
        import time
        ts = int(time.time())
        for i, filename in enumerate(files):
            # Filename comes as 'assets/template_1.png', we need just 'template_1.png' for the URL
            basename = os.path.basename(filename)
            results.append({
                "id": filename, 
                "url": f"http://localhost:8000/images/{basename}?t={ts}",
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
    # Create new session for this CV generation
    session_id = str(uuid.uuid4())
    chat_manager.create_session(session_id)
    
    # Record user's initial request
    chat_manager.add_message(
        session_id,
        role='user',
        content=f"Generate CV for role: {request.query}",
        message_type='build',
        metadata={'template_id': request.template_id, 'query': request.query}
    )
    
    screenshot_path = request.template_id
    
    # 2. Analysis - Extract form structure from the selected template
    from agents.analysis import analyze_screenshot
    
    # Verify screenshot exists
    if not os.path.exists(screenshot_path):
        # Fallback if specific ID missing
        if os.path.exists("assets/screenshot.png"):
             screenshot_path = "assets/screenshot.png"
        elif os.path.exists("assets/sample_template.png"):
             screenshot_path = "assets/sample_template.png"
        else:
             return {"error": f"Template {screenshot_path} not found and no fallbacks available."}

    try:
        result = analyze_screenshot(screenshot_path)
        if not result:
            return {"error": "Analysis failed - could not parse the template."}
        
        # Record builder agent response in chat history
        chat_manager.add_message(
            session_id,
            role='assistant',
            content="Successfully analyzed template and generated CV structure",
            message_type='build',
            metadata={
                'template_analyzed': screenshot_path,
                'sections_created': list(result.get('form_schema', {}).get('sections', [])) if result.get('form_schema') else []
            }
        )
        
        # Add discovery metadata to result
        result["_meta"] = {
            "discovery": {
                "source": "selected",
                "search_query": request.query,
                "selected_template": request.template_id
            },
            "analyzed_at": datetime.now().isoformat(),
            "session_id": session_id  # Add session ID to response
        }
        
        return result
    except Exception as e:
        return {"error": f"Analysis failed: {str(e)}"}

@app.post("/generate-upload")
async def generate_cv_upload(file: UploadFile = File(...), query: str = "Resumé"):
    """
    Phase 2 (Variant): Generate form from UPLOADED template (Image/PDF).
    """
    # Create new session
    session_id = str(uuid.uuid4())
    chat_manager.create_session(session_id)
    
    # Record user upload action
    chat_manager.add_message(
        session_id,
        role='user',
        content=f"Uploaded custom template: {file.filename}",
        message_type='build',
        metadata={'filename': file.filename, 'query': query}
    )
    
    try:
        # Save uploaded file
        filename = f"upload_{int(datetime.now().timestamp())}_{file.filename}"
        filepath = os.path.join("assets", filename)
        
        with open(filepath, "wb") as f:
            f.write(await file.read())
            
        screenshot_path = filepath
        
        # 2. Analysis - Extract form structure
        from agents.analysis import analyze_screenshot
        
        result = analyze_screenshot(screenshot_path)
        if not result:
            return {"error": "Analysis failed - could not parse the uploaded template."}
        
        # Record builder agent response
        chat_manager.add_message(
            session_id,
            role='assistant',
            content="Successfully analyzed uploaded template",
            message_type='build',
            metadata={'template_saved': filepath}
        )
        
        # Add metadata
        result["_meta"] = {
            "discovery": {
                "source": "upload",
                "search_query": query,
                "selected_template": filename
            },
            "analyzed_at": datetime.now().isoformat(),
            "session_id": session_id
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
    session_id: str | None = None  # Add session ID for chat history

@app.post("/refine")
async def refine_cv(request: RefineRequest):
    """
    Phase 3: Real-time AI editing of the CV data with full conversation context.
    """
    from agents.editor import refine_resume_data
    
    # Get or create session
    session_id = request.session_id or str(uuid.uuid4())
    if session_id not in chat_manager.sessions:
        chat_manager.create_session(session_id)
    
    # Record user's edit request
    chat_manager.add_message(
        session_id,
        role='user',
        content=request.user_request,
        message_type='edit'
    )
    
    try:
        # Get chat history for context
        chat_context = chat_manager.format_for_prompt(session_id, max_messages=15)
        
        updated_data = refine_resume_data(
            request.resume_data,
            request.user_request,
            request.image_base64,
            chat_context=chat_context  # Pass chat history
        )
        if not updated_data:
             return {"error": "AI could not process the revision."}
        
        # Record agent's response
        chat_manager.add_message(
            session_id,
            role='assistant',
            content=updated_data.get('_reasoning', 'Applied changes to CV'),
            message_type='edit'
        )
        
        return {"resume_data": updated_data, "session_id": session_id}
    except Exception as e:
        return {"error": f"Refinement failed: {str(e)}"}

class ReorderRequest(BaseModel):
    html: str
    order: list[str]
    session_id: str | None = None  # Add session ID

@app.post("/reorder")
async def reorder_endpoint(request: ReorderRequest):
    """
    Phase 4: AI Layout Reordering
    """
    from agents.layout import reorder_sections_ai
    
    # Get or create session
    session_id = request.session_id or str(uuid.uuid4())
    if session_id not in chat_manager.sessions:
        chat_manager.create_session(session_id)
    
    # Record user's rearrangement action
    chat_manager.add_message(
        session_id,
        role='user',
        content=f"Rearranged sections to new order: {', '.join(request.order[:5])}{'...' if len(request.order) > 5 else ''}",
        message_type='rearrange',
        metadata={'new_order': request.order}
    )
    
    new_html = reorder_sections_ai(request.html, request.order)
    if not new_html:
        return {"error": "Failed to reorder layout"}
    
    # Record successful reorder
    chat_manager.add_message(
        session_id,
        role='assistant',
        content="Successfully rearranged CV sections",
        message_type='rearrange'
    )
        
    return {"html": new_html, "session_id": session_id}

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
