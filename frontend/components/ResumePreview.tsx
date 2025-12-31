"use client";

import { useMemo, useRef, useEffect, useState, forwardRef } from "react";
import Mustache from 'mustache';
import { Download, FileText, Maximize2, Check } from 'lucide-react';

interface ResumePreviewProps {
  initialData?: any;
  showPreviewOnly?: boolean;
  enableCommenting?: boolean;
  comments?: any[];
  onAddComment?: (x: number, y: number, text: string, context: any) => void;
}

const ResumePreview = forwardRef<HTMLIFrameElement, ResumePreviewProps>(({ initialData, showPreviewOnly = false, enableCommenting = false, comments = [], onAddComment }, ref) => {
  // Use internal ref if external one not provided, or merge them. 
  // Simpler: Just use the forwarded ref. If parent doesn't provide one, it might break hooks depending on it.
  // We'll use useImperativeHandle or just fallback to internal.

  // Actually, standard pattern:
  const internalRef = useRef<HTMLIFrameElement>(null);

  // We need to keep internalRef for our own usage (postMessage), and expose it to parent.
  // We can use useImperativeHandle to expose the DOM node? Or just sync refs.
  // Syncing refs is easiest.

  // Actually simpler: Let's assume parent ALWAYS passes a ref if they want access. 
  // But if page.tsx renders it without ref sometimes? Ref optional.

  // Robust Manual Ref Sync:
  useEffect(() => {
    if (!ref) return;
    if (typeof ref === 'function') {
      ref(internalRef.current);
    } else {
      (ref as React.MutableRefObject<HTMLIFrameElement | null>).current = internalRef.current;
    }
  }, [ref, internalRef.current]);


  const [isReady, setIsReady] = useState(false);

  // Generate the raw HTML from template + data
  const rawHtml = useMemo(() => {
    if (!initialData) return '<div style="padding:40px;color:#888;text-align:center;font-family:monospace;">NO_DATA_STREAM</div>';

    let template = initialData.html_template;
    const resumeData = initialData.resume_data || {};

    if (!template) {
      return createFallbackHTML(resumeData);
    }

    // Force rich text fields to be unescaped (triple braces)
    // We replace {{summary}}, {{basics.summary}}, {{description}}, etc. with triple braces.
    // Regex explanation:
    // {{2}(?!{)       -> Match {{ but not {{{
    // \s*             -> Optional whitespace
    // (?![#\/\^])     -> Negative lookahead: ensure it's NOT a block helper (#), close (/), or invert (^)
    // ([\w\.]*        -> Match any word chars or dots (the prefix)
    // (?:summary|description)) -> Match literal summary or description
    // \s*             -> Optional whitespace
    // }{2}(?!})       -> Match }} but not }}}
    template = template.replace(/{{2}(?!{)\s*(?![#\/\^])([\w\.]*(?:summary|description))\s*}{2}(?!})/g, '{{{$1}}}');

    // Inject customSections rendering if not already present
    if (!template.includes('{{#customSections}}') && !template.includes('{{ #customSections }}')) {

      // Try to find existing section CSS class from the template to match styling
      // Look for patterns like class="section", class="cv-section", class="skill-section"
      const sectionClassMatch = template.match(/class=["']([^"']*section[^"']*)["']/i);
      const sectionClass = sectionClassMatch ? sectionClassMatch[1].split(' ')[0] : 'section';

      // Try to find section title/heading pattern
      const sectionTitleMatch = template.match(/class=["']([^"']*section-title[^"']*)["']/i)
        || template.match(/class=["']([^"']*heading[^"']*)["']/i);
      const titleClass = sectionTitleMatch ? sectionTitleMatch[1] : 'section-title';

      // Try to find item class pattern
      const itemMatch = template.match(/class=["']([^"']*item[^"']*)["']/i);
      const itemClass = itemMatch ? itemMatch[1].split(' ')[0] : 'item';

      // Check if template uses sidebar layout (to place custom sections appropriately)
      const hasSidebar = template.includes('sidebar') || template.includes('grid-template-columns');

      // Build customSections HTML that reuses existing CSS classes
      const customSectionsHtml = `
        {{#customSections}}
        <div class="${sectionClass} custom-section" style="margin-top: 20px; padding: 0 15px;">
          <h2 class="${titleClass}" style="font-size: inherit; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid currentColor; padding-bottom: 8px; margin-bottom: 15px; margin-top: 0;">{{title}}</h2>
          <div class="custom-items">
            {{#items}}
            <div class="${itemClass} custom-item" style="margin-bottom: 12px;">
              {{#level}}
              <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 6px;">
                <span style="flex: 1;">{{name}}</span>
                <div style="width: 80px; height: 6px; background: rgba(128,128,128,0.3); border-radius: 3px; overflow: hidden; flex-shrink: 0;">
                  <div style="width: {{level}}%; height: 100%; background: currentColor; border-radius: 3px;"></div>
                </div>
              </div>
              {{/level}}
              {{^level}}
              <div style="margin-bottom: 8px;">
                <div style="font-weight: 600; font-size: 1em;">{{itemTitle}}{{name}}</div>
                <div style="opacity: 0.8; font-size: 0.9em;">{{subtitle}}</div>
                <div style="opacity: 0.6; font-size: 0.85em; font-style: italic;">{{date}}</div>
                <div style="opacity: 0.6; font-size: 0.85em; font-style: italic;">{{date}}</div>
                <div style="margin: 6px 0 0 0; opacity: 0.85; font-size: 0.9em; line-height: 1.4;">{{{description}}}{{{summary}}}</div>
                {{#url}}<a href="{{url}}" style="color: inherit; opacity: 0.8; font-size: 0.85em; display: block; margin-top: 4px;">{{url}}</a>{{/url}}
              </div>
              {{/level}}
            </div>
            {{/items}}
          </div>
        </div>
        {{/customSections}}
      `;

      // Simple injection logic - find a good spot and inject
      // Prefer main content area, avoid sidebar
      let injected = false;

      // Try to inject before </main>
      if (!injected && template.includes('</main>')) {
        template = template.replace('</main>', customSectionsHtml + '</main>');
        injected = true;
      }

      // Try to inject before </body>
      if (!injected && template.includes('</body>')) {
        template = template.replace('</body>', customSectionsHtml + '</body>');
        injected = true;
      }

      // Fallback: append at end
      if (!injected) {
        template = template + customSectionsHtml;
      }
    }

    const basics = resumeData.basics || {};

    // Normalize data helper (e.g. converting 1-5 ratings to percentages)
    const normalizeLevel = (item: any) => {
      if (item.level !== undefined) {
        let lvl = parseInt(item.level);
        if (isNaN(lvl)) return item;

        // Auto-detect scale and normalize percentages
        let pct = lvl;
        let max = 100;
        let dotsCount = 5; // Default to 5 dots if ambiguous

        if (lvl <= 5) {
          pct = lvl * 20;
          max = 5;
          dotsCount = 5;
        } else if (lvl <= 10) {
          pct = lvl * 10;
          max = 10;
          dotsCount = 10; // Use 10 dots if likely on 10-point scale
        } else {
          // It's a percentage (0-100)
          max = 100;
          dotsCount = 5; // Default visual representation for % is 5 dots
        }

        // Generate dots array for templating
        // Calculate how many dots should be filled based on percentage
        const fillCount = Math.round((pct / 100) * dotsCount);
        const dotsArray = Array.from({ length: dotsCount }).map((_, i) => ({
          filled: i < fillCount
        }));

        return { ...item, level_pct: pct, level: lvl, dotsArray };
      }
      return item;
    };

    const renderData = {
      ...resumeData,
      basics: {
        ...basics,
        location: typeof basics.location === 'string' ? basics.location : basics.location?.address || '',
        profiles: basics.profiles || []
      },
      work: (resumeData.work || []).map(normalizeLevel),
      education: (resumeData.education || []).map(normalizeLevel),
      skills: (resumeData.skills || []).map(normalizeLevel),
      languages: (resumeData.languages || []).map(normalizeLevel),
      customSections: (resumeData.customSections || []).map((section: any) => ({
        ...section,
        items: (section.items || []).map((item: any) => ({
          ...normalizeLevel(item),
          // Copy 'title' to 'itemTitle' to avoid Mustache scope conflict with section.title
          itemTitle: item.title || ''
        }))
      }))
    };

    try {
      return Mustache.render(template, renderData);
    } catch (e) {
      return simpleReplace(template, renderData);
    }
  }, [initialData]);

  // Inject the "Live Morph" script into the HTML
  const finalHtml = useMemo(() => {
    // We add a script that handles 'update' messages to morph the DOM
    const morphScript = `
      <style>
        * { transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
        .typing-effect {
            animation: typeIn 0.5s ease-out forwards;
        }
        @keyframes typeIn {
            from { opacity: 0; transform: translateY(5px); }
            to { opacity: 1; transform: translateY(0); }
        }

        /* Comment Highlighting */
        .comment-highlight {
            outline: 2px solid #00A8A8 !important;
            cursor: crosshair !important;
            background: rgba(0, 168, 168, 0.1);
        }

        /* FORCE TEXT WRAPPING (Fix for Quill HTML Overflow) */
        p, li, h1, h2, h3, h4, h5, h6, span, div {
            overflow-wrap: break-word;
            word-wrap: break-word;
            max-width: 100%;
        }
        /* Handle lists specifically to ensure they stay inside */
        ul, ol {
            max-width: 100%;
            padding-left: 1.5em; /* Restore list indentation which might be lost */
        }
        /* Reset margins for Quill paragraphs to prevent vertical expansion */
        .custom-item p, .section p, .item p {
            margin-top: 0.2em;
            margin-bottom: 0.2em;
        }

        /* PRINT STYLES */
        @media print {
            @page {
                margin: 0;
            }
            body {
                margin: 0;
                padding: 0;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            section, .section, .item, .job, .education-item, div[class*="item"] {
                break-inside: avoid;
                page-break-inside: avoid;
            }
            h1, h2, h3, h4, h5, h6 {
                break-after: avoid;
                page-break-after: avoid;
            }
        }

        /* PAGED PREVIEW SIMULATION (Screen Only) */
        @media screen {
            body {
                background: #525659;
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 20px 0;
            }
            html {
                 height: auto;
                 min-height: 100%;
            }
            body > * {
                 max-width: 210mm !important; 
            }
            
            /* Visual Page Breaks - JS will inject these now */
            
            /* Better Page Sheet Look */
            body > div:first-child { 
                min-height: 297mm;
                background: white;
                box-shadow: 0 0 10px rgba(0,0,0,0.5);
                margin-bottom: 20px;
                position: relative; 
            }
        }
      </style>
      <script>
        // --- COMMENTING LOGIC ---
        let commentingEnabled = false;

        window.addEventListener('message', (e) => {
             if (e.data.type === 'TOGGLE_COMMENTING') {
                 commentingEnabled = e.data.enabled;
                 document.body.style.cursor = commentingEnabled ? 'crosshair' : 'default';
             }
        });

        document.addEventListener('mouseover', (e) => {
            if (!commentingEnabled) return;
            const target = e.target;
            // Highlight block-level elements or meaningful text containers
            if (target.tagName === 'P' || target.tagName === 'H1' || target.tagName === 'H2' || target.tagName === 'H3' || target.tagName === 'DIV' || target.tagName === 'SPAN') {
                 target.classList.add('comment-highlight');
                 
                 // Remove from others
                 document.querySelectorAll('.comment-highlight').forEach(el => {
                     if (el !== target) el.classList.remove('comment-highlight');
                 });
            }
        });

        document.addEventListener('mouseout', (e) => {
             if (e.target.classList.contains('comment-highlight')) {
                 e.target.classList.remove('comment-highlight');
             }
        });

        let lastClickTime = 0;
        document.addEventListener('click', (e) => {
            if (!commentingEnabled) return;
            
            // Debounce (prevent double firing)
            const now = Date.now();
            if (now - lastClickTime < 500) return;
            lastClickTime = now;

            e.preventDefault();
            e.stopPropagation();

            const target = e.target;
            
            // Get clean text context (limit length)
            const textContext = target.innerText.substring(0, 100).replace(/\s+/g, ' ').trim();
            
            // Attempt to find nearest section ID with stricter logic
            let sectionSearch = target;
            let sectionId = 'general'; // Default to general instead of unknown
            
            // Walk up limited levels to avoid matching the entire body
            let levels = 0;
            while(sectionSearch && sectionSearch !== document.body && levels < 5) {
                 const classList = sectionSearch.classList ? Array.from(sectionSearch.classList).join(' ').toLowerCase() : '';
                 const tagName = sectionSearch.tagName;
                 const text = sectionSearch.innerText?.toLowerCase() || '';
                 
                 // Priority 1: Semantic Attributes/Classes (if added by agent/parser)
                 if (classList.includes('education') || sectionSearch.id?.includes('education')) { sectionId = 'education'; break; }
                 if (classList.includes('work') || classList.includes('experience') || sectionSearch.id?.includes('work')) { sectionId = 'work'; break; }
                 if (classList.includes('skill') || sectionSearch.id?.includes('skill')) { sectionId = 'skills'; break; }
                 if (classList.includes('header') || classList.includes('profile') || tagName === 'H1') { sectionId = 'basics'; break; }

                 // Priority 2: Section Titles (H2) nearby
                 // If we are INSIDE a section, there is likely an H2 preceding us
                 
                 levels++;
                 sectionSearch = sectionSearch.parentElement;
            }
            
            // Fallback: If still general, check if it looks like contact info
            if (sectionId === 'general') {
                const lowerText = textContext.toLowerCase();
                if (lowerText.includes('@') || lowerText.match(/\d{3}/)) sectionId = 'basics';
                else if (target.tagName === 'H1') sectionId = 'basics';
            }

            window.parent.postMessage({
                type: 'PREVIEW_CLICK',
                x: e.clientX,
                y: e.clientY,
                textContext: textContext,
                sectionId: sectionId
            }, '*');
        });

        // --- OVERFLOW DETECTION ---
        window.addEventListener('message', (e) => {
            if (e.data.type === 'CHECK_OVERFLOW') {
                const docHeight = document.body.scrollHeight;
                const A4_HEIGHT_PX = 1122; // approx 297mm at 96dpi
                const isOverflowing = docHeight > A4_HEIGHT_PX + 20; // 20px tolerance
                
                window.parent.postMessage({
                    type: 'OVERFLOW_RESULT',
                    isOverflowing: isOverflowing,
                    docHeight: docHeight
                }, '*');
            }
        });

        // --- PAGINATION & MORPH ---
        function applyPaginationFix() {
            // ... (existing implementation)
            const A4_HEIGHT_MM = 297;
            const MMA_PX = 3.7795275591; 
            const PAGE_HEIGHT_PX = A4_HEIGHT_MM * MMA_PX; // ~1122px
            
            // Clean up old markers
            document.querySelectorAll('.page-break-marker, .page-break-label, .print-spacer').forEach(el => el.remove());

            // 1. Add Visual Markers for Preview
            const docHeight = document.body.scrollHeight;
            const numPages = Math.ceil(docHeight / PAGE_HEIGHT_PX);
            
            for (let i = 1; i < numPages; i++) {
                const top = i * PAGE_HEIGHT_PX;
                
                const marker = document.createElement('div');
                marker.className = 'page-break-marker';
                marker.style.top = top + 'px';
                document.body.appendChild(marker);
                
                const label = document.createElement('div');
                label.className = 'page-break-label';
                label.style.top = (top - 20) + 'px';
                label.innerText = 'PAGE ' + i + ' END / ' + (i+1) + ' START';
                document.body.appendChild(label);
            }

            // 2. Aggressive Content Splitting
            // Select large blocks but also smaller items
            const elements = document.querySelectorAll('section, .section, .item, .job, .education-item, div[class*="item"]');
            
            elements.forEach(el => {
                // We calculate position relative to the main container (usually body > div:first-child)
                // But simplified: use offsetTop (relative to nearest positioned ancestor)
                
                // Find absolute top roughly
                let absoluteTop = 0;
                let ref = el;
                while(ref && ref !== document.body) {
                    absoluteTop += ref.offsetTop;
                    ref = ref.offsetParent;
                }
                
                const height = el.getBoundingClientRect().height;
                const absoluteBottom = absoluteTop + height;
                
                const startPage = Math.floor(absoluteTop / PAGE_HEIGHT_PX);
                const endPage = Math.floor(absoluteBottom / PAGE_HEIGHT_PX);
                
                if (startPage !== endPage) {
                    // It crosses a line!
                    const pageLimit = (startPage + 1) * PAGE_HEIGHT_PX;
                    const overlap = absoluteBottom - pageLimit;

                    // Decision: Push ONLY if it's smaller than a page (avoid infinite loops for giant blocks)
                    // AND if the overlap is significant (> 20px)
                    if (height < PAGE_HEIGHT_PX && overlap > 20) {
                         const distanceToNextPage = pageLimit - absoluteTop;
                         
                         const spacer = document.createElement('div');
                         spacer.className = 'print-spacer';
                         spacer.style.height = (distanceToNextPage + 30) + 'px'; // +30px buffer
                         spacer.style.width = '100%';
                         spacer.style.breakBefore = 'always'; /* Help print engine too */
                         
                         el.parentNode.insertBefore(spacer, el);
                    }
                }
            });
        }


        // Run on load and whenever content changes
        window.addEventListener('load', () => setTimeout(applyPaginationFix, 1000));
        window.addEventListener('resize', () => setTimeout(applyPaginationFix, 500));

        window.addEventListener('message', (event) => {
            if (typeof event.data !== 'string') return;
            
            const newHtml = event.data;
            const parser = new DOMParser();
            const newDoc = parser.parseFromString(newHtml, 'text/html');
            
            // Simple Morph Implementation
            function morph(oldNode, newNode) {
                if (oldNode.nodeType !== newNode.nodeType) {
                    oldNode.replaceWith(newNode.cloneNode(true));
                    return;
                }
                
                // Text Nodes
                if (oldNode.nodeType === 3) {
                    if (oldNode.textContent !== newNode.textContent) {
                        oldNode.textContent = newNode.textContent;
                        if (oldNode.parentNode) {
                             oldNode.parentNode.classList.add('typing-effect');
                             setTimeout(() => oldNode.parentNode.classList.remove('typing-effect'), 500);
                        }
                    }
                    return;
                }

                // Element Nodes
                if (oldNode.nodeType === 1) {
                    if (oldNode.tagName !== newNode.tagName) {
                        oldNode.replaceWith(newNode.cloneNode(true));
                         return;
                    }
                    
                    // Update Attributes
                    Array.from(newNode.attributes).forEach(attr => {
                        oldNode.setAttribute(attr.name, attr.value);
                    });

                    // Recurse children
                    const oldChildren = Array.from(oldNode.childNodes);
                    const newChildren = Array.from(newNode.childNodes);
                    
                    for (let i = 0; i < Math.max(oldChildren.length, newChildren.length); i++) {
                        if (!oldChildren[i]) {
                             oldNode.appendChild(newChildren[i].cloneNode(true));
                            // Animate entry
                            if (oldNode.lastChild.classList) {
                                oldNode.lastChild.classList.add('typing-effect');
                            }
                        } else if (!newChildren[i]) {
                            // Remove old
                            oldChildren[i].remove();
                        } else {
                            morph(oldChildren[i], newChildren[i]);
                        }
                    }
                }
            }

            // Start Morphing from Body
            morph(document.body, newDoc.body);
            // Also head styles if any changed, but mostly body
        });

        // Intercept all link clicks to open in new tab
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (link) {
                e.preventDefault();
                let href = link.getAttribute('href');
                if (href) {
                     // Fix missing protocol
                    if (!href.startsWith('http://') && !href.startsWith('https://') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
                        href = 'https://' + href;
                    }
                    window.open(href, '_blank');
                }
            }
        });
      </script>
    `;
    return rawHtml + morphScript;
  }, [rawHtml]);

  // Initial Load & Updates
  useEffect(() => {
    if (!internalRef.current) return;

    if (!isReady) {
      // First render: Direct write
      return;
    }

    // Send comment mode toggle
    internalRef.current.contentWindow?.postMessage({
      type: 'TOGGLE_COMMENTING',
      enabled: enableCommenting
    }, '*');

    // Subsequent updates: Post Message
    internalRef.current.contentWindow?.postMessage(rawHtml, '*');
  }, [rawHtml, isReady, enableCommenting]);

  // Listen for messages from iframe
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data.type === 'PREVIEW_CLICK' && onAddComment) {
        onAddComment(e.data.x, e.data.y, '', { text: e.data.textContext, section: e.data.sectionId });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onAddComment]);

  const handleIframeLoad = () => {
    // Give the injected script a moment to parse and initialize event listeners
    setTimeout(() => setIsReady(true), 100);
  };

  const exportToPDF = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(rawHtml);
      printWindow.document.close();
      printWindow.document.fonts.ready.then(() => {
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
        }, 1000);
      });
    }
  };

  const [initialContent, setInitialContent] = useState<string>('');

  // Set initial content only once when data first becomes available
  useEffect(() => {
    if (finalHtml && !initialContent) {
      setInitialContent(finalHtml);
    }
  }, [finalHtml, initialContent]);

  return (
    <div className="h-full flex flex-col bg-[var(--bg-root)]">


      {/* Preview Canvas */}
      <div className="flex-1 flex justify-center overflow-auto p-8 relative">
        <div className="bg-white shadow-2xl relative transition-all duration-300 ease-in-out" style={{ width: '210mm', minHeight: '297mm' }}>
          {initialContent && (
            <>
              <iframe
                ref={internalRef}
                srcDoc={initialContent}
                onLoad={handleIframeLoad}
                className="w-full h-full border-0 absolute inset-0"
                title="Resume Preview"
                sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-modals allow-scripts"
              />

              {/* Comment Pins Overlay */}
              {comments.map(c => (
                <div
                  key={c.id}
                  className="absolute w-6 h-6 -ml-3 -mt-3 bg-[var(--accent-primary)] rounded-full border-2 border-[var(--bg-root)] shadow-md flex items-center justify-center text-[10px] font-bold text-[var(--bg-root)] pointer-events-none z-20 animate-in fade-in zoom-in"
                  style={{ left: c.x, top: c.y }}
                >
                  {c.resolved ? <Check size={12} /> : '!'}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
});

ResumePreview.displayName = 'ResumePreview';
export default ResumePreview;

// Simple fallback replacement if Mustache fails
function simpleReplace(template: string, data: any): string {
  let result = template;
  try {
    const basics = data.basics || {};
    result = result.replace(/\{\{basics\.name\}\}/g, basics.name || 'Your Name');
    result = result.replace(/\{\{basics\.label\}\}/g, basics.label || '');
    result = result.replace(/\{\{basics\.email\}\}/g, basics.email || '');
    result = result.replace(/\{\{basics\.phone\}\}/g, basics.phone || '');
    result = result.replace(/\{\{basics\.location\}\}/g, typeof basics.location === 'string' ? basics.location : basics.location?.address || '');
    result = result.replace(/\{\{basics\.summary\}\}/g, basics.summary || '');
  } catch (e) { }
  return result;
}

function createFallbackHTML(resumeData: any): string {
  // Minimalist, 'Inter' based fallback
  const basics = resumeData.basics || {};
  const work = resumeData.work || [];
  const education = resumeData.education || [];
  const skills = resumeData.skills || [];

  return `
<!DOCTYPE html>
<html>
<head>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; padding: 40px; color: #111; line-height: 1.5; font-size: 13px; }
    h1 { font-size: 24px; font-weight: 700; margin-bottom: 4px; letter-spacing: -0.5px; }
    h2 { font-size: 14px; font-weight: 600; text-transform: uppercase; border-bottom: 1px solid #111; padding-bottom: 6px; margin: 24px 0 12px 0; letter-spacing: 0.05em; }
    .meta { color: #555; font-size: 12px; margin-bottom: 20px; }
    .job { margin-bottom: 16px; }
    .job-head { display: flex; justify-content: space-between; font-weight: 600; }
    .job-sub { display: flex; justify-content: space-between; color: #555; font-size: 12px; margin-bottom: 4px; }
    .skills { display: flex; flex-wrap: wrap; gap: 6px; }
    .skill { background: #eee; padding: 2px 8px; border-radius: 2px; font-size: 11px; font-weight: 500; }
    a { color: #111; text-decoration: underline; }
    @page { size: A4; margin: 0; }
  </style>
</head>
<body>
  <h1>${basics.name || 'Your Name'}</h1>
  <div class="meta">
    ${basics.label || ''} • ${basics.email || ''} • ${basics.phone || ''} • ${basics.location || ''}
  </div>
  
  ${basics.summary ? `<p style="margin-bottom: 24px;">${basics.summary}</p>` : ''}

  ${work.length ? `<h2>Experience</h2>` : ''}
  ${work.map((j: any) => `
    <div class="job">
      <div class="job-head"><span>${j.company}</span><span>${j.startDate} - ${j.endDate}</span></div>
      <div class="job-sub"><span>${j.position}</span></div>
      <p>${j.summary}</p>
    </div>
  `).join('')}

  ${education.length ? `<h2>Education</h2>` : ''}
  ${education.map((e: any) => `
    <div class="job">
       <div class="job-head"><span>${e.institution}</span><span>${e.startDate}</span></div>
       <div>${e.area}</div>
    </div>
  `).join('')}

  ${skills.length ? `<h2>Skills</h2><div class="skills">${skills.map((s: any) => `<span class="skill">${s.name}</span>`).join('')}</div>` : ''}
</body>
</html>
  `;
}
