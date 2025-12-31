# CV_GEN [BETA_V0.7]

> **ARCHITECTURAL MANIFESTO:**  
> A AGENTIC SYSTEM FOR GENERATING HYPER-OPTIMIZED RESUMES.  
> NO FLUFF. JUST AI PRECISION.

![Preview](backend/assets/screenshot.png)

---

## // SYSTEM STATUS


> **[TRY IT LIVE](https://cv-gen-eight.vercel.app/)** 

| MODULE | STATUS |
| :--- | :--- |
| **CORE_ENGINE** | `ONLINE` |
| **UI_FRAMEWORK** | `ONLINE` |
| **AGENT_SWARM** | `PARTIAL` |

---

## // FEATURES [OPERATIONAL]

### [01] AGENTIC DISCOVERY
*   **Headless Reconnaissance**: Scours the web for trending resume templates (current Standard).
*   **Auto-Cache**: Persists discoveries to `backend/assets/` to minimize API overhead.
*   **Fallback Protocols**: Robust fallback to local assets if network reconnaissance fails.

### [02] EDITOR
*   **Raw Input**: Direct manipulation of JSON-structured resume data.
*   **Live Preview**: Real-time rendering of changes in a dedicated iframe sandbox.
*   **Smart Layout**: 
    *   **Auto-Binding**: Dynamically maps schema fields (e.g., `fluency` vs `level`) to UI inputs.
    *   **Drag & Drop**: Vertical section reordering.

### [03] AGENTIC REFINEMENT
*   **AI Co-Pilot**: "Fix with AI" button triggered by logic gates (e.g., overflow detection).
*   **Smart PDF Fixer**: Automatically detects content bleeding >1 page and offers to "COMPACT" or "BEAUTIFY" the layout.

---

## // KNOWN ISSUES [BROKEN / UNSTABLE]

> **WARNING**: SYSTEM IS IN BETA. EXPECT ERRORS.

### [ERR_01] PDF GENERATION
*   **Issue**: Print-to-PDF can sometimes strip background graphics depending on browser "Background Graphics" settings.
*   **Workaround**: Ensure "Background Graphics" is CHECKED in your system print dialog if using browser print. Backend PDF generation is the primary stable method.

### [ERR_02] LAYOUT OVERFLOW
*   **Issue**: Extremely verbose descriptions can break the single-page constraints of strict templates.
*   **Mitigation**: Use the new **Smart PDF Fixer** agent (triggered on export) to auto-compact the text.

### [ERR_03] AGENT HALLUCINATIONS
*   **Issue**: Rarely, the Layout Agent might invent CSS classes that don't exist in the base template during "Beautification".
*   **Status**: Monitoring.

### [ERR_04] COMMENT SYSTEM
*   **Issue**: The "Comment/Pin" system is currently disabled while undergoing a React strict-mode refactor. Clicking on the preview does not drop pins.
*   **Status**: Pending Refactor.

---

## // ROADMAP [UPCOMING]

*   **MULTI-PAGE INTELLIGENCE**: Full logic for handling 2+ page resumes with repeating headers and smart section breaks.
*   **FIX COMMENT SYSTEM**: Re-enable pin dropping and context-aware AI fixes on specific resume sections.

---

## // DEPLOYMENT PROTOCOL

### 1. BACKEND INITIALIZATION
```bash
cd backend
python -m venv venv
venv\Scripts\activate   # Windows
# source venv/bin/activate # Unix
pip install -r requirements.txt
python main.py
```
> **PORT**: `8000` (API), `8001` (DOCS)

### 2. FRONTEND INITIALIZATION
```bash
cd frontend
npm install
npm run dev
```
> **PORT**: `3000` (UI)

---

## // FILE STRUCTURE

```
ROOT/
├── backend/
│   ├── agents/      # [BRAIN] AI Logic (Discovery, Editor, Parser)
│   ├── assets/      # [DATA] Cached Images & Templates
│   ├── logs/        # [DEBUG] Error dumps
│   └── tests/       # [QA] Unit tests
└── frontend/
    ├── components/  # [UI] React Bricks
    └── app/         # [CORE] Next.js Routing
```

---

> **MAINTAINER**: Niko  
> **BUILD**: 2025-12-31  
