"use client";

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Terminal, ArrowRight, Loader2, Command, CheckCircle2, ChevronRight, Layout, Upload, Github, Image as ImageIcon, Trash2, XCircle, Sparkles, MessageSquare, Plus, RotateCcw, RotateCw, Download, Columns, Sidebar, Settings, Search, Play, X } from 'lucide-react';
import { TypewriterText } from '@/components/TypewriterText';
import { FullscreenConsoleLoader } from '@/components/FullscreenConsoleLoader';
import { CinematicBuildLoader } from '@/components/CinematicBuildLoader';



const SUBTITLE_VARIANTS = [
  "Build a professional resume in seconds",             // English
  "Crea un currículum profesional en segundos",         // Spanish
  "Erstellen Sie in Sekundenschnelle einen Lebenslauf", // German
  "Créer un CV professionnel en quelques secondes",     // French
  "プロフェッショナルな履歴書を数秒で作成",                 // Japanese
  "Crie um currículo profissional em segundos",         // Portuguese
  "Создайте профессиональное резюме за секунды",        // Russian
  "在几秒钟内制作一份专业的简历"                           // Chinese
];
import html2canvas from 'html2canvas';

// Hooks
import { useAnime, useStaggerAnime, stagger } from '@/hooks/useAnime';

// Dynamic imports
const ResumePreview = dynamic(() => import('@/components/ResumePreview'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-[var(--bg-surface)] animate-pulse" />
});
const FormEditor = dynamic(() => import('@/components/FormEditor'), { ssr: false });
const ChatInterface = dynamic(() => import('@/components/ChatInterface'), { ssr: false });
const CommentSidebar = dynamic(() => import('@/components/CommentSidebar'), { ssr: false });
const LoadingOverlay = dynamic(() => import('@/components/LoadingOverlay'), { ssr: false });
const DocsModal = dynamic(() => import('@/components/DocsModal'), { ssr: false });
const BackgroundAnimation = dynamic(() => import('@/components/BackgroundAnimation'), { ssr: false });


const LOADING_MESSAGES = [
  "Analyzing grid structure...",
  "Extracting typography tokens...",
  "Normalizing color palette...",
  "Detecting sidebar components...",
  "Generating responsive layout...",
  "Compiling CSS variables...",
  "Building form schema...",
  "Optimizing properties...",
  "Validating semantic HTML...",
  "Finalizing template export..."
];

export default function Home() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'idle' | 'discovering' | 'analyzing' | 'success' | 'error'>('idle');
  const [discoveryFound, setDiscoveryFound] = useState(false); // New state for loader
  const [loaderInitialRect, setLoaderInitialRect] = useState<{ top: number, left: number, width: number, height: number } | null>(null);
  const [step, setStep] = useState<'input' | 'selection' | 'editor'>('input');
  const [prevStep, setPrevStep] = useState<string>('input');
  const [result, setResult] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const logsInterval = useRef<NodeJS.Timeout | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null); // Track session for chat history

  const [importing, setImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [showDocs, setShowDocs] = useState(false);

  // Refs
  // Refs
  const inputRef = useRef<HTMLDivElement>(null); // For morphing animation
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resumePreviewRef = useRef<HTMLIFrameElement>(null); // Ref for screenshotting

  // Toast State
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // History State
  const [history, setHistory] = useState<any[]>([]);
  const [future, setFuture] = useState<any[]>([]);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [isAgentWorking, setIsAgentWorking] = useState(false);

  // Comment State
  const [comments, setComments] = useState<any[]>([]);
  const [isCommentMode, setIsCommentMode] = useState(false);
  const [isCommentSidebarOpen, setIsCommentSidebarOpen] = useState(false);

  // Input Step Animation
  const { ref: inputContainerRef } = useAnime<HTMLDivElement>({
    opacity: [0, 1],
    translateY: [10, 0],
    duration: 600,
    easing: 'easeOutExpo',
    delay: 100
  }, [step === 'input']); // Trigger when entering input step

  // Selection Template Animation
  const templatesContainerRef = useStaggerAnime<HTMLDivElement>({
    opacity: [0, 1],
    translateY: [20, 0],
    duration: 400,
    easing: 'easeOutQuad',
    delay: stagger(100)
  }, [step === 'selection', templates]);


  // Photo Dialog Animation
  const [isPhotoDialogMounted, setIsPhotoDialogMounted] = useState(false);
  useEffect(() => {
    if (showPhotoDialog) setIsPhotoDialogMounted(true);
  }, [showPhotoDialog]);

  const { ref: photoDialogRef } = useAnime<HTMLDivElement>({
    opacity: showPhotoDialog ? [0, 1] : [1, 0],
    scale: showPhotoDialog ? [0.95, 1] : [1, 0.95],
    duration: 200,
    easing: 'easeOutQuad',
    onComplete: () => {
      if (!showPhotoDialog) setIsPhotoDialogMounted(false);
    }
  }, [showPhotoDialog]);


  const saveToHistory = (currentState: any) => {
    setHistory(prev => {
      const newHistory = [...prev, JSON.parse(JSON.stringify(currentState))];
      return newHistory.length > 50 ? newHistory.slice(1) : newHistory;
    });
    setFuture([]);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setFuture(prev => [result, ...prev]);
    setHistory(prev => prev.slice(0, -1));
    setResult(previous);
  };

  const handleRedo = () => {
    if (future.length === 0) return;
    const next = future[0];
    setHistory(prev => [...prev, result]);
    setFuture(prev => prev.slice(1));
    setResult(next);
  };

  const handleRevert = (snapshot: any) => {
    if (!snapshot) return;
    saveToHistory(result); // Save current before reverting
    setResult(snapshot);
    showToast("Reverted to previous state", "info");
  };

  const handleAgentEdit = async (prompt: string) => {
    if (!result?.resume_data) return;

    setIsAgentWorking(true);
    saveToHistory(result); // Save current state before edit

    // Screenshot Capture
    let screenshotBase64 = null;
    if (resumePreviewRef.current?.contentDocument?.body) {
      try {
        // We need to capture the resume page inside the iframe
        const body = resumePreviewRef.current.contentDocument.body;
        const canvas = await html2canvas(body as HTMLElement, {
          scale: 0.8, // Slightly lower scale to speed up and reduce size
          useCORS: true,
          logging: false
        });
        screenshotBase64 = canvas.toDataURL('image/png', 0.8);
      } catch (err) {
        console.error("Screenshot failed:", err);
        // Allow to proceed without screenshot
      }
    }

    // Add pending log
    const newLogId = Date.now().toString();
    const snapshotBeforeEdit = JSON.parse(JSON.stringify(result)); // Deep copy for rollback

    setChatHistory(prev => [{
      id: newLogId,
      prompt: prompt,
      timestamp: new Date(),
      status: 'info', // pending
      snapshot: snapshotBeforeEdit
    }, ...prev]);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${API_URL}/refine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resume_data: result.resume_data,
          user_request: prompt,
          image_base64: screenshotBase64, // Send snapshot
          session_id: sessionId // Pass session ID for context
        })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Update session_id if returned
      if (data.session_id) {
        setSessionId(data.session_id);
      }

      if (data.resume_data) {
        // Deep compare check
        const isDifferent = JSON.stringify(data.resume_data) !== JSON.stringify(result.resume_data);

        if (isDifferent) {
          setResult({ ...result, resume_data: data.resume_data });
          showToast("Changes applied successfully", "success");

          // Update log status
          setChatHistory(prev => prev.map(item =>
            item.id === newLogId ? { ...item, status: 'success' } : item
          ));
        } else {
          showToast("Agent made no changes", "info");
          // Update log status
          setChatHistory(prev => prev.map(item =>
            item.id === newLogId ? { ...item, status: 'error' } : item
          ));
        }
      } else {
        showToast("Agent made no changes", "info");
        setChatHistory(prev => prev.map(item =>
          item.id === newLogId ? { ...item, status: 'error' } : item
        ));
      }
    } catch (e) {
      console.error(e);
      const errMsg = (e as Error).message || "Unknown error occurred";
      setErrorMsg(errMsg);
      showToast(`Agent failed: ${errMsg}`, "error");

      setChatHistory(prev => prev.map(item =>
        item.id === newLogId ? { ...item, status: 'error' } : item
      ));
    } finally {
      setIsAgentWorking(false);
    }
  };

  // --- COMMENT HANDLERS ---
  const handleAddComment = (x: number, y: number, text: string, context: any) => {
    setComments(prev => {
      // Prevent duplicate clicks at almost same location (spatial debounce)
      const duplicate = prev.find(c =>
        Math.abs(c.x - x) < 5 &&
        Math.abs(c.y - y) < 5 &&
        (Date.now() - parseInt(c.id.split('-')[0] || '0')) < 2000 // Within 2 seconds
      );
      if (duplicate) return prev;

      const newComment = {
        id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 5),
        x,
        y,
        text: text || "New comment",
        context,
        resolved: false,
        section: context.section
      };
      return [...prev, newComment];
    });
    setIsCommentSidebarOpen(true); // Open sidebar to let user type
  };

  const handleResolveComment = (id: string) => {
    setComments(prev => prev.map(c => c.id === id ? { ...c, resolved: true } : c));
  };

  const handleDeleteComment = (id: string) => {
    setComments(prev => prev.filter(c => c.id !== id));
  };


  const handleFixComments = () => {
    // Gather unresolved comments
    const openComments = comments.filter(c => !c.resolved);
    if (openComments.length === 0) {
      showToast("No open comments to fix.", "info");
      return;
    }

    // Construct prompt
    let prompt = "Please fix the following issues marked by the user on the CV:\n";
    openComments.forEach((c, i) => {
      prompt += `${i + 1}. On section '${c.section || 'General'}': "${c.text}" (Context: "${c.context?.text?.substring(0, 50)}...")\n`;
    });

    // Trigger Agent
    handleAgentEdit(prompt);
  };

  // Listen for preview clicks from iframe
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data.type === 'PREVIEW_CLICK') {
        const { x, y, textContext, sectionId } = e.data;
        // Add a draft comment or empty one with context
        handleAddComment(x, y, "", { text: textContext, section: sectionId });
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Sync comment mode state to iframe
  useEffect(() => {
    if (resumePreviewRef.current?.contentWindow) {
      resumePreviewRef.current.contentWindow.postMessage({
        type: 'TOGGLE_COMMENTING',
        enabled: isCommentMode
      }, '*');
    }
  }, [isCommentMode]);


  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [...prev.slice(-12), `[${timestamp}] ${msg}`]);
  };

  const startLogStream = () => {
    setLogs([]);
    addLog("Initializing build agent...");
    let msgIndex = 0;

    logsInterval.current = setInterval(() => {
      const msg = LOADING_MESSAGES[msgIndex % LOADING_MESSAGES.length];
      addLog(msg);
      msgIndex++;
    }, 800);
  };

  const stopLogStream = () => {
    if (logsInterval.current) clearInterval(logsInterval.current);
  };

  const handleDiscover = async () => {
    if (!query) return;

    // Capture initial rect for morph animation
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setLoaderInitialRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      });
    }

    setStatus('discovering');
    setDiscoveryFound(false);
    setErrorMsg('');

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${API_URL}/discover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setTemplates(data.templates || []);
      // Don't switch step yet, signal the loader that data is ready
      setDiscoveryFound(true);

    } catch (e: any) {
      setErrorMsg(e.message || 'Discovery failed');
      setStatus('error');
    }
  };

  const handleBuildTransitionComplete = () => {
    setStep('editor');
    setStatus('idle');
  };

  const handleDiscoveryComplete = () => {
    if (status === 'error') {
      setStatus('idle');
      // Stay on 'input' step to allow retrying
    } else {
      setStep('selection');
      setStatus('idle');
    }
    setDiscoveryFound(false);
  };

  const handleSelectTemplate = async (templateId: string) => {
    setStatus('analyzing');
    startLogStream();

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${API_URL}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, template_id: templateId })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      addLog("Build successful. Finalizing...");

      // Extract and store session_id
      if (data._meta?.session_id) {
        setSessionId(data._meta.session_id);
      }

      setResult(data);
      // Wait a moment before triggering exit animation
      await new Promise(r => setTimeout(r, 600));

      setStatus('success'); // Triggers CinematicBuildLoader exit animation

      // Check if photo is needed
      checkForMissingPhoto(data);

    } catch (e: any) {
      setErrorMsg(e.message || 'Analysis failed');
      setStatus('error');
      addLog(`Error: ${e.message}`);
    } finally {
      stopLogStream();
    }
  };

  const checkForMissingPhoto = (data: any) => {
    // Check if Schema defines 'image' but data.basics.image is missing
    const hasImageInSchema = data.form_schema?.basics?.fields?.some((f: any) => f.name === 'image' || f.type === 'image');
    const hasImageInData = data.resume_data?.basics?.image;

    if (hasImageInSchema && !hasImageInData) {
      setShowPhotoDialog(true);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // If we're already in the editor step, this is an import into existing CV
    if (step === 'editor' && result) {
      // Use the existing import flow
      const formData = new FormData();
      formData.append('file', file);
      setImporting(true);

      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const res = await fetch(`${API_URL}/import-cv`, {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (data.error) {
          setErrorMsg(data.error);
          setImporting(false);
          return;
        }

        if (data.resume_data && result) {
          const newData = {
            ...result,
            resume_data: { ...result.resume_data, ...data.resume_data }
          };
          setResult(newData);
          setErrorMsg('');

          // Verify photo again after import
          checkForMissingPhoto(newData);
        }
      } catch (err: any) {
        setErrorMsg("Import failed: " + err.message);
      } finally {
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
      return;
    }

    // Otherwise, we're building a NEW CV from uploaded CV/resume
    // Show loading screen
    setStatus('analyzing');
    startLogStream();

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      // Step 1: Extract text from uploaded CV
      const formData = new FormData();
      formData.append('file', file);

      const importRes = await fetch(`${API_URL}/import-cv`, {
        method: 'POST',
        body: formData
      });
      const importData = await importRes.json();

      if (importData.error) {
        throw new Error(importData.error);
      }

      addLog("CV content extracted successfully");

      // Step 2: Use the upload-generate endpoint with the CV as a "custom template"
      // This will build the form structure based on an uploaded file
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('query', 'Resume');

      const genRes = await fetch(`${API_URL}/generate-upload`, {
        method: 'POST',
        body: uploadFormData
      });

      const genData = await genRes.json();
      if (genData.error) throw new Error(genData.error);

      addLog("Form structure generated from CV");

      // Step 3: Merge the extracted data with the generated structure
      if (genData && importData.resume_data) {
        genData.resume_data = {
          ...genData.resume_data,
          ...importData.resume_data
        };
      }

      // Extract and store session_id
      if (genData._meta?.session_id) {
        setSessionId(genData._meta.session_id);
      }

      setResult(genData);
      await new Promise(r => setTimeout(r, 600));

      setStatus('success');
      checkForMissingPhoto(genData);

    } catch (err: any) {
      setErrorMsg("CV upload failed: " + err.message);
      setStatus('error');
      addLog(`Error: ${err.message}`);
    } finally {
      stopLogStream();
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAutoFetchPhoto = () => {
    // Try to find github in profiles
    const profiles = result?.resume_data?.basics?.profiles || [];
    const githubProfile = profiles.find((p: any) =>
      p.network?.toLowerCase().includes('github') ||
      p.url?.toLowerCase().includes('github.com')
    );

    if (githubProfile) {
      // Extract username
      const urlParts = githubProfile.url.split('/');
      const username = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2]; // handle trailing slash
      if (username) {
        const photoUrl = `https://github.com/${username}.png`;
        // Update state
        setResult({
          ...result,
          resume_data: {
            ...result.resume_data,
            basics: { ...result.resume_data.basics, image: photoUrl }
          }
        });
        setShowPhotoDialog(false);
        return;
      }
    }

    setErrorMsg("Could not find a GitHub profile to fetch image from.");
  };

  const handlePhotoUpload = () => {
    // Create a temporary file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          setResult({
            ...result,
            resume_data: {
              ...result.resume_data,
              basics: { ...result.resume_data.basics, image: ev.target?.result }
            }
          });
          setShowPhotoDialog(false);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const templateUploadRef = useRef<HTMLInputElement>(null);

  const handleTemplateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset UI
    setStatus('analyzing');
    startLogStream();

    // Create FormData
    const formData = new FormData();
    formData.append('file', file);
    formData.append('query', query || 'Custom Template');

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${API_URL}/generate-upload`, {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      addLog("Template analysis successful. Finalizing...");

      // Extract and store session_id
      if (data._meta?.session_id) {
        setSessionId(data._meta.session_id);
      }

      setResult(data);
      await new Promise(r => setTimeout(r, 600));

      setStatus('success');
      checkForMissingPhoto(data);

    } catch (e: any) {
      setErrorMsg(e.message || 'Template upload failed');
      setStatus('error');
      addLog(`Error: ${e.message}`);
    } finally {
      stopLogStream();
      if (templateUploadRef.current) templateUploadRef.current.value = '';
    }
  };

  useEffect(() => {
    return () => stopLogStream();
  }, []);

  // Listen for overload messages
  useEffect(() => {
    const handleMessage = async (e: MessageEvent) => {
      if (e.data.type === 'OVERFLOW_RESULT') {
        if (e.data.isOverflowing) {
          // AUTO-FIX: No prompt. Just fix it and export.
          showToast("Content overflows A4. Auto-fixing layout...", "info");
          await handleAgentEdit("The CV is overflowing. Auto-rebalance for a 2-Page Layout: \n\n1. PRIORITIZE FILLING PAGE 1: Keep as many sections on Page 1 as possible. Only move the *last* section that causes overflow. \n2. NO GAPS: If Page 1 has empty space at the bottom, you MUST write more content (add bullet points to Experience, expand Summary) to fill it. \n3. DO NOT leave Page 1 half-empty. It must look fully populated. \n4. Page 2 should contain only what strictly doesn't fit.");
          // CRITICAL: Wait for React to re-render the preview iframe with the fix
          await new Promise(resolve => setTimeout(resolve, 2000));
          // After fix, export. performExport handles isExporting state.
          await performExport();
        } else {
          // No overflow, just export directly.
          await performExport();
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [result]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to close modals
      if (e.key === 'Escape') {
        if (showDocs) setShowDocs(false);
        if (showPhotoDialog) setShowPhotoDialog(false);
      }

      // Undo/Redo
      // Check for Ctrl (Windows/Linux) or Meta (Mac)
      if ((e.ctrlKey || e.metaKey) && !isAgentWorking) {
        if (e.key === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            handleRedo();
          } else {
            handleUndo();
          }
        } else if (e.key === 'y') {
          e.preventDefault();
          handleRedo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDocs, showPhotoDialog, isAgentWorking, history, future, result]);

  const performExport = async () => {
    try {
      const id = result?.template_id || 'brutalist-v1';

      // Get rendered HTML from the iframe to ensure WYSIWYG (includes AI layout fixes)
      let htmlContent = '';
      try {
        if (resumePreviewRef.current?.contentDocument) {
          htmlContent = resumePreviewRef.current.contentDocument.documentElement.outerHTML;
        }
      } catch (e) {
        console.warn("Could not extract HTML from iframe", e);
      }

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_URL}/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resume_data: result.resume_data,
          template_id: id,
          html: htmlContent
        })
      });

      if (!response.ok) throw new Error('PDF Generation failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resume-${result.resume_data.basics?.name || 'export'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast("PDF Exported successfully", "success");
    } catch (e: any) {
      showToast("Export failed: " + e.message, "error");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!result?.resume_data) return;
    setIsExporting(true);

    // Check overflow first
    if (resumePreviewRef.current?.contentWindow) {
      resumePreviewRef.current.contentWindow.postMessage({ type: 'CHECK_OVERFLOW' }, '*');
      // The event listener will trigger performExport or Agent fix
    } else {
      performExport();
    }
  };

  return (
    <main className="min-h-screen flex flex-col">
      {/* Navbar */}
      <nav className="h-16 border-b-2 border-[var(--text-main)] flex items-center px-6 justify-between bg-[var(--bg-root)] z-10">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-[var(--text-main)] flex items-center justify-center">
            <span className="text-[var(--bg-root)] font-bold text-xs">AI</span>
          </div>
          <span className="font-bold tracking-tighter text-xl font-mono uppercase">CV_GEN</span>
          <span className="px-2 py-0.5 border border-[var(--text-muted)] text-[10px] text-[var(--text-muted)] font-mono uppercase">BETA</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-[var(--text-muted)] font-mono uppercase">
          {step === 'editor' && (
            <button
              onClick={handleDownloadPDF}
              disabled={isExporting}
              className="bg-[var(--text-main)] text-[var(--bg-root)] text-[10px] font-bold font-mono px-3 py-1.5 uppercase border-2 border-[var(--text-main)] hover:bg-[var(--bg-root)] hover:text-[var(--text-main)] disabled:opacity-50 transition-all flex items-center gap-2 shadow-[2px_2px_0px_0px_var(--accent-primary)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"
            >
              {isExporting ? <Loader2 className="animate-spin" size={10} /> : <Download size={10} strokeWidth={3} />}
              EXPORT_PDF
            </button>
          )}
          <button onClick={() => setShowDocs(true)} className="hover:text-[var(--text-main)] hover:underline decoration-2 underline-offset-4 transition-all font-bold">Docs</button>
        </div>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf,.txt,.md" />
      </nav>

      <div className="flex-1 flex flex-col relative overflow-hidden">

        {/* FULLSCREEN LOADER */}
        {(status === 'discovering' || (status === 'error' && step === 'input' && errorMsg)) && (
          <FullscreenConsoleLoader
            isReady={discoveryFound}
            onComplete={handleDiscoveryComplete}
            error={status === 'error' ? errorMsg : undefined}
            initialRect={loaderInitialRect}
          />
        )}

        {/* INPUT STEP */}
        {step === 'input' && (
          <div className="flex flex-col items-center justify-center flex-1 w-full px-4 relative">
            <BackgroundAnimation />
            <div ref={inputContainerRef} className="w-full max-w-3xl z-10 relative">
              <h1 className="text-5xl font-black mb-6 tracking-tighter font-mono uppercase text-center leading-none">
                Agentic_CV<span className="text-[var(--accent-primary)] animate-pulse">_Generator</span>
              </h1>

              <div className="flex justify-center mb-12">
                <div className="flex items-center gap-4 border border-[var(--border-dim)] bg-black/80 backdrop-blur-sm px-6 py-3 min-w-[320px] justify-center">
                  <div className="w-2 h-2 bg-[var(--accent-primary)] animate-pulse" />
                  <p className="text-[var(--text-muted)] text-sm font-mono tracking-wide uppercase min-h-[20px]">
                    <TypewriterText
                      texts={SUBTITLE_VARIANTS}
                      pauseDuration={20000}
                      typoProbability={0.1}
                    />
                  </p>
                </div>
              </div>

              <div className="relative group">
                <div ref={inputRef} className="relative bg-black/80 backdrop-blur-md border border-[var(--text-main)] p-0 flex items-center transition-all duration-200 shadow-none hover:shadow-[8px_8px_0px_0px_var(--accent-primary)] hover:-translate-y-1 hover:-translate-x-1 focus-within:shadow-[8px_8px_0px_0px_var(--accent-primary)] focus-within:-translate-y-1 focus-within:-translate-x-1">
                  <div className="w-16 h-16 flex items-center justify-center text-[var(--accent-primary)] border-r border-[var(--text-main)] font-mono text-2xl font-bold select-none">
                    &gt;
                  </div>
                  <input
                    className="bg-transparent border-none outline-none flex-1 text-[var(--accent-primary)] placeholder-[var(--text-dim)] font-mono text-lg h-16 px-6 uppercase tracking-wider"
                    placeholder="ENTER_ROLE (e.g. DEVOPS ENGINEER)..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleDiscover()}
                    autoFocus
                  />
                  <button
                    onClick={handleDiscover}
                    disabled={!query.trim() || status !== 'idle'}
                    className="h-16 px-8 font-mono font-bold text-[var(--text-main)] hover:bg-[var(--accent-primary)] hover:text-[var(--bg-root)] transition-all uppercase tracking-widest text-sm flex items-center gap-2 border-l border-[var(--text-main)] disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-[var(--text-main)]"
                  >
                    {status === 'discovering' ? <Loader2 className="animate-spin" /> : <span>[ EXECUTE ]</span>}
                  </button>
                </div>
              </div>

              {/* Upload CV Button - accepts any file type */}
              <div className="flex justify-center mt-6">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt,.md,image/*"
                />
                <button
                  onClick={handleImportClick}
                  disabled={status !== 'idle'}
                  className="text-[var(--text-main)] hover:text-[var(--accent-primary)] text-xs font-mono uppercase tracking-widest border-2 border-[var(--text-main)] hover:border-[var(--accent-primary)] transition-all duration-200 flex items-center gap-2 px-6 py-3 bg-[var(--bg-root)] hover:bg-[var(--bg-surface)] disabled:opacity-50 hover:shadow-[4px_4px_0px_0px_var(--accent-primary)] hover:-translate-x-[2px] hover:-translate-y-[2px] active:shadow-none active:translate-x-0 active:translate-y-0"
                >
                  <Upload size={16} className="stroke-[2.5]" />
                  UPLOAD_YOUR_CV
                </button>
              </div>

            </div>
            {status === 'discovering' && (
              <div className="mt-8 font-mono text-sm text-[var(--text-muted)] flex items-center justify-center gap-3">
                <div className="w-3 h-3 bg-[var(--accent-primary)] animate-spin" />
                <span className="uppercase tracking-widest">&gt; AGENTS_DISPATCHED...</span>
              </div>
            )}
            {/* Cinematic Build Loader for CV uploads */}
            {(status === 'analyzing' || status === 'success') && step === 'input' && (
              <CinematicBuildLoader
                status={status}
                logs={logs}
                onComplete={handleBuildTransitionComplete}
              />
            )}
          </div>
        )}

        {/* SELECTION STEP */}
        {step === 'selection' && (
          <div className="flex flex-col flex-1 p-8">
            <div className="mb-8 flex items-center justify-between border-b-2 border-[var(--text-main)] pb-4">
              <div>
                <h2 className="text-3xl font-black uppercase font-mono tracking-tighter">Select_Template</h2>
                <p className="text-[var(--text-muted)] mt-1 font-mono text-xs uppercase">&gt; {templates.length} candidates identified for query: &quot;{query}&quot;</p>
              </div>
              <button onClick={() => setStep('input')} className="text-[var(--text-muted)] hover:text-[var(--text-main)] text-sm font-bold font-mono border-2 border-transparent hover:border-[var(--text-main)] px-4 py-2 uppercase transition-all">&lt; Return_to_Search</button>
            </div>
            <div ref={templatesContainerRef} className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {templates.map((t, i) => (
                <div key={i} onClick={() => handleSelectTemplate(t.id)} className="group cursor-pointer border-2 border-[var(--border-dim)] hover:border-[var(--text-main)] bg-[var(--bg-card)] hover:shadow-[8px_8px_0px_0px_var(--accent-primary)] hover:-translate-y-1 transition-all duration-200 opacity-0 transform translate-y-4">
                  <div className="aspect-[3/4] bg-[var(--bg-root)] relative border-b-2 border-[var(--border-dim)]">
                    <img src={t.url} className="w-full h-full object-cover object-top opacity-80 group-hover:opacity-100 transition-all duration-500" alt="preview" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[1px]">
                      <span className="px-6 py-3 bg-[var(--text-main)] text-[var(--bg-root)] text-sm font-mono font-bold uppercase border-2 border-white shadow-[4px_4px_0px_0px_var(--accent-primary)]">INITIATE_BUILD</span>
                    </div>
                  </div>
                  <div className="p-4 bg-[var(--bg-surface)]">
                    <h3 className="font-bold text-sm mb-1 font-mono uppercase tracking-tight truncate">{t.title}</h3>
                    <p className="text-xs text-[var(--text-muted)] font-mono line-clamp-2">{t.description}</p>
                  </div>
                </div>
              ))}
            </div>
            {/* Deploy Logs / Cinematic Build Loader */}
            {(status === 'analyzing' || status === 'success') && (
              <CinematicBuildLoader
                status={status}
                logs={logs}
                onComplete={handleBuildTransitionComplete}
              />
            )}
          </div>
        )}

        {/* EDITOR STEP */}
        {step === 'editor' && result && (
          <div className="flex flex-1 overflow-hidden relative">
            {/* Left: Input */}
            <div className="w-[450px] flex flex-col border-r border-[var(--border-dim)] bg-[var(--bg-surface)] relative">

              {/* Editor Toolbar with Undo/Redo */}
              <div className="h-12 border-b-2 border-[var(--border-dim)] flex items-center px-4 justify-between bg-[var(--bg-root)] z-10 shrink-0">
                <div className="flex items-center gap-4">
                  <span className="font-mono text-xs font-bold text-[var(--text-main)] flex items-center gap-2 uppercase tracking-tight">
                    EDITOR_V1
                  </span>
                  <div className="h-4 w-0.5 bg-[var(--border-dim)]" />
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleUndo}
                      disabled={history.length === 0 || isAgentWorking}
                      className="p-1.5 hover:bg-[var(--text-main)] hover:text-[var(--bg-root)] disabled:opacity-30 transition-colors text-[var(--text-muted)] border border-transparent hover:border-[var(--text-main)]"
                      title="Undo (Ctrl+Z)"
                    >
                      <RotateCcw size={14} strokeWidth={2.5} />
                    </button>
                    <button
                      onClick={handleRedo}
                      disabled={future.length === 0 || isAgentWorking}
                      className="p-1.5 hover:bg-[var(--text-main)] hover:text-[var(--bg-root)] disabled:opacity-30 transition-colors text-[var(--text-muted)] border border-transparent hover:border-[var(--text-main)]"
                      title="Redo (Ctrl+Y)"
                    >
                      <RotateCw size={14} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button onClick={handleImportClick} disabled={importing} className="flex items-center gap-1 text-[10px] font-mono font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] disabled:opacity-50 uppercase hover:underline">
                    {importing ? <Loader2 className="animate-spin" size={10} /> : <Upload size={10} />}
                    {importing ? 'IMPORTING...' : 'IMPORT_CV'}
                  </button>
                  <button onClick={() => setStep('selection')} className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-main)] font-mono font-bold uppercase hover:underline">
                    CHANGE_TEMPLATE
                  </button>
                </div>
              </div>

              {/* Agent Working Overlay */}
              {isAgentWorking && (
                <LoadingOverlay
                  message="AGENT_ACTIVE"
                  subMessage={undefined} // Let it cycle
                />
              )}

              <div className="flex-1 overflow-y-auto">
                <FormEditor
                  data={result}
                  onChange={(newData) => {
                    saveToHistory(result);
                    setResult(newData);
                  }}
                  disabled={isAgentWorking}
                />
              </div>
            </div>

            {/* Right: Preview */}
            <div className="flex-1 bg-[var(--bg-root)] flex flex-col relative">

              {/* Toolbar for Comments */}
              <div className="h-10 bg-[var(--bg-surface)] border-b border-[var(--border-dim)] flex items-center px-4 gap-4 justify-end">
              </div>

              <div className="flex-1 overflow-hidden p-8 bg-[var(--bg-dim)] flex items-center justify-center relative">
                <div className="w-full h-full overflow-y-auto custom-scrollbar flex justify-center">
                  <ResumePreview
                    ref={resumePreviewRef}
                    initialData={result}
                    enableCommenting={isCommentMode}
                    comments={comments}
                    onAddComment={handleAddComment}
                  />
                </div>
              </div>
            </div>

            <CommentSidebar
              isOpen={isCommentSidebarOpen}
              onClose={() => setIsCommentSidebarOpen(false)}
              comments={comments}
              onResolve={handleResolveComment}
              onDelete={handleDeleteComment}
              onAddComment={(text) => {
                // Update the last added comment (which was just created with empty text)
                if (comments.length > 0) {
                  const lastId = comments[comments.length - 1].id;
                  setComments(prev => prev.map(c => c.id === lastId ? { ...c, text } : c));
                }
              }}
            />

            <ChatInterface
              onSend={handleAgentEdit}
              isProcessing={isAgentWorking}
              history={chatHistory}
              onRevert={handleRevert}
              sidebarOpen={isCommentSidebarOpen}
            />
          </div>
        )}

        {/* Photo Logic Dialog */}
        {(showPhotoDialog || isPhotoDialogMounted) && (
          <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center transition-opacity" style={{ opacity: showPhotoDialog ? 1 : 0, display: isPhotoDialogMounted ? 'flex' : 'none' }}>
            <div
              ref={photoDialogRef}
              className="w-full max-w-md bg-[var(--bg-surface)] border border-[var(--border-dim)] rounded-lg p-6 shadow-2xl origin-center"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg flex items-center gap-2"><ImageIcon size={18} /> Profile Photo Missing</h3>
                <button onClick={() => setShowPhotoDialog(false)}>
                  <XCircle size={20} className="text-[var(--text-muted)] hover:text-[var(--accent-error)]" />
                </button>
              </div>
              <p className="text-sm text-[var(--text-muted)] mb-6">
                This template looks best with a profile picture, but your CV does not have one. Would you like to upload one, or have our agent fetch one from your GitHub?
              </p>

              <div className="space-y-3">
                <button
                  onClick={handleAutoFetchPhoto}
                  className="w-full flex items-center justify-center gap-3 py-3 border border-[var(--border-dim)] hover:border-[var(--text-main)] hover:bg-[var(--bg-root)] transition-all font-mono text-sm"
                >
                  <Github size={16} />
                  Auto-Fetch from GitHub
                </button>
                <button
                  onClick={handlePhotoUpload}
                  className="w-full flex items-center justify-center gap-3 py-3 bg-[var(--text-main)] text-[var(--bg-root)] font-bold hover:opacity-90 transition-all font-mono text-sm"
                >
                  <Upload size={16} />
                  Upload from Device
                </button>
                <button
                  onClick={() => setShowPhotoDialog(false)}
                  className="w-full text-center text-xs text-[var(--text-muted)] hover:underline mt-2"
                >
                  Skip (I will add it later)
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      <DocsModal
        isOpen={showDocs}
        onClose={() => setShowDocs(false)}
      />

      {/* Toast */}

      {
        toast && (
          <div className={`fixed top-4 right-4 z-[100] border-2 px-4 py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-in slide-in-from-right-full fade-in duration-300 font-mono text-sm font-bold flex items-center gap-2 ${toast.type === 'success' ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] text-black' :
            toast.type === 'error' ? 'bg-[var(--accent-error)] border-[var(--accent-error)] text-white' :
              'bg-[var(--bg-surface)] border-[var(--text-main)] text-[var(--text-main)]'
            }`}>
            {toast.type === 'success' && <CheckCircle2 size={16} />}
            {toast.type === 'error' && <XCircle size={16} />}
            {toast.message}
          </div>
        )
      }

    </main >
  );
}
