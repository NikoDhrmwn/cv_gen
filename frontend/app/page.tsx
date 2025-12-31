"use client";

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, ArrowRight, Loader2, Command, CheckCircle2, ChevronRight, Layout, Upload, Github, Image as ImageIcon, Trash2, XCircle, Sparkles, MessageSquare, Plus, RotateCcw, RotateCw, Download, Columns, Sidebar, Settings, Search, Play, X } from 'lucide-react';
import html2canvas from 'html2canvas';

// Dynamic imports
const ResumePreview = dynamic(() => import('@/components/ResumePreview'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-[var(--bg-surface)] animate-pulse" />
});
const FormEditor = dynamic(() => import('@/components/FormEditor'), { ssr: false });
const ChatInterface = dynamic(() => import('@/components/ChatInterface'), { ssr: false });
const CommentSidebar = dynamic(() => import('@/components/CommentSidebar'), { ssr: false });
const LoadingOverlay = dynamic(() => import('@/components/LoadingOverlay'), { ssr: false });

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
  const [step, setStep] = useState<'input' | 'selection' | 'editor'>('input');
  const [result, setResult] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const logsInterval = useRef<NodeJS.Timeout | null>(null);

  const [importing, setImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
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

  // ... (existing saveToHistory)

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
          image_base64: screenshotBase64 // Send snapshot
        })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

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
    setStatus('discovering');
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
      setStep('selection');
      setStatus('idle');
    } catch (e: any) {
      setErrorMsg(e.message || 'Discovery failed');
      setStatus('error');
    }
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

      addLog("Build successful. Starting editor...");
      await new Promise(r => setTimeout(r, 800));

      setResult(data);
      setStep('editor');
      setStatus('success');

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

        {/* INPUT STEP */}
        {step === 'input' && (
          <div className="flex flex-col items-center justify-center flex-1 w-full px-4">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-3xl">
              <h1 className="text-5xl font-black mb-6 tracking-tighter font-mono uppercase text-center leading-none">
                Build_Identity<span className="text-[var(--accent-primary)] animate-pulse">.exe</span>
              </h1>
              <div className="flex items-center gap-4 mb-12 border-l-2 border-[var(--accent-primary)] pl-6 py-2 ml-4">
                <p className="text-[var(--text-muted)] text-lg font-mono">
                  &gt; AI-driven resume generation for modern infrastructure.
                </p>
              </div>

              <div className="relative group">
                {/* Outline removed */}
                <div className="relative bg-[var(--bg-root)] border-2 border-[var(--text-main)] p-0 flex items-center transition-all duration-200 shadow-none hover:shadow-[8px_8px_0px_0px_var(--accent-primary)] hover:-translate-y-1 focus-within:shadow-[8px_8px_0px_0px_var(--accent-primary)] focus-within:-translate-y-1">
                  <div className="w-12 h-14 bg-[var(--text-main)] flex items-center justify-center text-[var(--bg-root)]">
                    <Command size={20} />
                  </div>
                  <input
                    className="bg-transparent border-none outline-none flex-1 text-[var(--text-main)] placeholder-[var(--text-muted)] font-mono text-base h-14 px-4 uppercase"
                    placeholder="> ENTER_ROLE (e.g. DEVOPS ENGINEER)..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleDiscover()}
                    autoFocus
                  />
                  <button onClick={handleDiscover} disabled={!query || status === 'discovering'} className="h-14 px-8 bg-[var(--bg-root)] text-[var(--text-main)] font-bold text-sm border-l-2 border-[var(--text-main)] hover:bg-[var(--text-main)] hover:text-[var(--bg-root)] transition-all disabled:opacity-50 uppercase flex items-center gap-2">
                    {status === 'discovering' ? <Loader2 className="animate-spin" size={18} /> : <span>Execute_</span>}
                  </button>
                </div>
              </div>

              {status === 'discovering' && (
                <div className="mt-8 font-mono text-sm text-[var(--text-muted)] flex items-center justify-center gap-3">
                  <div className="w-3 h-3 bg-[var(--accent-primary)] animate-spin" />
                  <span className="uppercase tracking-widest">&gt; AGENTS_DISPATCHED...</span>
                </div>
              )}
            </motion.div>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {templates.map((t, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} onClick={() => handleSelectTemplate(t.id)} className="group cursor-pointer border-2 border-[var(--border-dim)] hover:border-[var(--text-main)] bg-[var(--bg-card)] hover:shadow-[8px_8px_0px_0px_var(--accent-primary)] hover:-translate-y-1 transition-all duration-200">
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
                </motion.div>
              ))}
            </div>
            {/* Deploy Logs */}
            {status === 'analyzing' && (
              <div className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="w-full max-w-xl bg-black border-2 border-[var(--text-main)] shadow-[8px_8px_0px_0px_var(--accent-primary)] overflow-hidden font-mono text-xs">
                  <div className="bg-[var(--text-main)] px-4 py-3 flex items-center justify-between text-[var(--bg-root)] border-b border-[var(--text-main)]">
                    <div className="flex items-center gap-2">
                      <span className="animate-spin text-[var(--bg-root)]">✜</span>
                      <span className="font-bold uppercase tracking-widest">System_Build.log</span>
                    </div>
                    <span className="animate-pulse font-bold">RUNNING</span>
                  </div>
                  <div className="p-6 h-80 overflow-y-auto bg-black custom-scrollbar flex flex-col justify-end border-t-2 border-[var(--text-main)]">
                    {logs.map((log, i) => (
                      <div key={i} className="mb-1 break-all flex gap-3">
                        <span className="text-[var(--text-muted)] opacity-50 select-none min-w-[80px] text-right">{log.split(']')[0]}]</span>
                        <span className={log.includes("Error") ? "text-[var(--accent-error)]" : "text-[var(--text-main)]"}>{log.split(']')[1] || log}</span>
                      </div>
                    ))}
                    <div className="animate-pulse text-[var(--accent-primary)] mt-2">_</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* EDITOR STEP */}
        {step === 'editor' && result && (
          <div className="flex flex-1 overflow-hidden relative">
            {/* Left: Input */}
            <div className="w-[450px] flex flex-col border-r border-[var(--border-dim)] bg-[var(--bg-surface)] relative">

              {/* Editor Toolbar with Undo/Redo */}
              {/* Editor Toolbar with Undo/Redo */}
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
              {/* Removed Export Button from here */}

              {/* Toolbar for Comments */}
              <div className="h-10 bg-[var(--bg-surface)] border-b border-[var(--border-dim)] flex items-center px-4 gap-4 justify-end">
                {/* 
                // COMMENTS DISABLED FOR BETA V0.9 REFACTOR
                <button
                  onClick={() => { setIsCommentMode(!isCommentMode); setIsCommentSidebarOpen(!isCommentMode); }}
                  className={`flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded transition-colors ${isCommentMode ? 'bg-[var(--accent-primary)] text-[var(--bg-root)] font-bold' : 'text-[var(--text-muted)] hover:bg-[var(--bg-dim)]'}`}
                >
                  <MessageSquare size={12} />
                  {isCommentMode ? 'COMMENT MODE ON' : 'ADD COMMENTS'}
                </button>
                {comments.some(c => !c.resolved) && (
                  <button
                    onClick={handleFixComments}
                    className="flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded bg-[var(--text-main)] text-[var(--bg-root)] hover:opacity-90 font-bold animate-pulse shadow-[2px_2px_0px_0px_var(--accent-primary)]"
                  >
                    <Sparkles size={12} /> FIX ALL ({comments.filter(c => !c.resolved).length})
                  </button>
                )}
                */}
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
        <AnimatePresence>
          {showPhotoDialog && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center">
              <div className="w-full max-w-md bg-[var(--bg-surface)] border border-[var(--border-dim)] rounded-lg p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg flex items-center gap-2"><ImageIcon size={18} /> Profile Photo Missing</h3>
                </div>
                <p className="text-sm text-[var(--text-muted)] mb-6">
                  This template uses a profile picture, but your data doesn't have one. Would you like to upload one or let us find it from your social profiles?
                </p>
                <div className="flex flex-col gap-3">
                  <button onClick={handleAutoFetchPhoto} className="w-full py-2 btn-tech-primary flex items-center justify-center gap-2">
                    <Github size={16} /> Auto-fetch from GitHub
                  </button>
                  <button onClick={handlePhotoUpload} className="w-full py-2 border border-[var(--border-dim)] text-[var(--text-main)] hover:bg-[var(--bg-root)] flex items-center justify-center gap-2 font-mono text-sm">
                    <Upload size={16} /> Upload Image
                  </button>
                  <button onClick={() => setShowPhotoDialog(false)} className="w-full py-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-dim)]">
                    Skip for now
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {errorMsg && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="fixed bottom-6 right-6 px-4 py-3 bg-[var(--bg-surface)] border border-[var(--accent-error)] text-[var(--accent-error)] rounded shadow-lg text-sm font-mono flex items-center gap-3">
              <span>Error: {errorMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Docs Modal */}
      <AnimatePresence>
        {showDocs && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-8" onClick={() => setShowDocs(false)}>
            <div className="w-full max-w-4xl h-full max-h-[85vh] bg-[var(--bg-surface)] border border-[var(--border-dim)] rounded-lg shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-[var(--border-dim)] bg-[var(--bg-root)]">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-6 bg-[var(--accent-primary)] rounded-full"></div>
                  <h3 className="font-bold text-lg font-mono tracking-tight">DOCUMENTATION</h3>
                </div>
                <button onClick={() => setShowDocs(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"><Trash2 className="rotate-45" size={24} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">

                {/* Hero Section */}
                <div className="mb-12 border-b border-[var(--border-dim)] pb-8">
                  <h1 className="text-3xl font-bold mb-3 bg-gradient-to-r from-[var(--text-main)] to-[var(--text-muted)] bg-clip-text text-transparent">AI-Native Resume Engineering</h1>
                  <p className="text-[var(--text-muted)] text-lg leading-relaxed max-w-2xl">
                    An autonomous design engine that discovers, analyzes, and reverse-engineers professional resumes from the open web into type-safe React forms.
                  </p>
                </div>

                {/* Architecture Grid */}
                <div className="mb-12">
                  <h3 className="flex items-center gap-2 font-mono text-sm text-[var(--accent-primary)] mb-6 uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)]"></span> System Architecture
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-5 bg-[var(--bg-root)] border border-[var(--border-dim)] rounded-md hover:border-[var(--accent-primary)] transition-colors group">
                      <div className="flex items-center gap-2 mb-3 text-[var(--accent-primary)]">
                        <Layout size={18} />
                        <h4 className="font-mono font-bold text-xs">PHASE 1: DISCOVERY</h4>
                      </div>
                      <p className="text-xs text-[var(--text-muted)] leading-5">
                        Autonomous browser agents query search engines and portfolio sites to find top-ranking designs for your specific role.
                      </p>
                    </div>
                    <div className="p-5 bg-[var(--bg-root)] border border-[var(--border-dim)] rounded-md hover:border-[var(--accent-primary)] transition-colors group">
                      <div className="flex items-center gap-2 mb-3 text-[var(--accent-secondary)]">
                        <ImageIcon size={18} />
                        <h4 className="font-mono font-bold text-xs">PHASE 2: VISION</h4>
                      </div>
                      <p className="text-xs text-[var(--text-muted)] leading-5">
                        Gemini 3 Flash Preview performs pixel-level analysis to extract layout hierarchy, typography tokens, and component structures.
                      </p>
                    </div>
                    <div className="p-5 bg-[var(--bg-root)] border border-[var(--border-dim)] rounded-md hover:border-[var(--accent-primary)] transition-colors group">
                      <div className="flex items-center gap-2 mb-3 text-[var(--text-main)]">
                        <Terminal size={18} />
                        <h4 className="font-mono font-bold text-xs">PHASE 3: HYDRATION</h4>
                      </div>
                      <p className="text-xs text-[var(--text-muted)] leading-5">
                        The Schema Engine converts visual data into a validation-ready JSON schema, building the UI on the fly.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  {/* Workflow Column */}
                  <section>
                    <h3 className="flex items-center gap-2 font-mono text-sm text-[var(--text-muted)] mb-6 uppercase tracking-wider">
                      <span className="w-2 h-2 rounded-full bg-[var(--text-main)]"></span> Workflow
                    </h3>
                    <div className="space-y-3">
                      {[
                        "Enter target role (e.g. 'Senior DevOps')",
                        "Select a high-quality template",
                        "Edit Personal Details & Experience",
                        "Export as production-ready PDF"
                      ].map((step, i) => (
                        <div key={i} className="flex items-center gap-4 p-3 bg-[var(--border-dim)]/30 rounded border border-transparent hover:border-[var(--border-dim)] transition-colors">
                          <span className="font-mono text-xs text-[var(--text-muted)] w-6 text-right">0{i + 1}</span>
                          <span className="text-sm text-[var(--text-main)]">{step}</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Security & Tips Column */}
                  <section className="space-y-8">
                    <div>
                      <h3 className="flex items-center gap-2 font-mono text-sm text-[var(--text-muted)] mb-6 uppercase tracking-wider">
                        <span className="w-2 h-2 rounded-full bg-[var(--accent-error)]"></span> Security Protocols
                      </h3>
                      <div className="p-4 bg-[var(--bg-root)] border border-[var(--border-dim)] rounded-md">
                        <div className="flex items-center gap-2 mb-2 text-[var(--text-main)]">
                          <CheckCircle2 size={16} className="text-[var(--accent-primary)]" />
                          <span className="text-sm font-bold">Zero-Persistence Data</span>
                        </div>
                        <p className="text-xs text-[var(--text-muted)] mb-4 pl-6">
                          Your personal data exists <strong>only</strong> in your browser's memory. We do not store, log, or persist your CV content on any server.
                        </p>
                        <div className="flex items-center gap-2 mb-2 text-[var(--text-main)]">
                          <CheckCircle2 size={16} className="text-[var(--accent-primary)]" />
                          <span className="text-sm font-bold">Client-Side Export</span>
                        </div>
                        <p className="text-xs text-[var(--text-muted)] pl-6">
                          PDF generation happens instantly via standard browser print APIs, ensuring your document never leaves your control.
                        </p>
                      </div>
                    </div>

                    <div>
                      <h3 className="flex items-center gap-2 font-mono text-sm text-[var(--text-muted)] mb-4 uppercase tracking-wider">
                        <span className="w-2 h-2 rounded-full bg-[var(--accent-secondary)]"></span> Pro Tips
                      </h3>
                      <div className="grid grid-cols-1 gap-3">
                        <div className="p-3 border border-dashed border-[var(--border-mid)] rounded bg-[var(--bg-root)]/50">
                          <h4 className="font-bold text-xs mb-1 text-[var(--text-main)]">⚡ Instant Import</h4>
                          <p className="text-[10px] text-[var(--text-muted)]">Don't start from scratch. Use the <strong>Import CV</strong> button to auto-fill this template with data from your existing PDF.</p>
                        </div>
                        <div className="p-3 border border-dashed border-[var(--border-mid)] rounded bg-[var(--bg-root)]/50">
                          <h4 className="font-bold text-xs mb-1 text-[var(--text-main)]">🎯 Search Specifics</h4>
                          <p className="text-[10px] text-[var(--text-muted)]">For better design matches, search for specific roles (e.g. "Senior React Developer") rather than generic terms.</p>
                        </div>
                        <div className="p-3 border border-dashed border-[var(--border-mid)] rounded bg-[var(--bg-root)]/50">
                          <h4 className="font-bold text-xs mb-1 text-[var(--text-main)]">📸 Auto-Photos</h4>
                          <p className="text-[10px] text-[var(--text-muted)]">Add a <strong>GitHub</strong> link to your profiles section, and we'll automatically fetch your high-res avatar.</p>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>

              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* Export Loading Overlay - System_Build.log Style */}
      <AnimatePresence>
        {isExporting && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl bg-black border-2 border-[var(--text-main)] shadow-[8px_8px_0px_0px_var(--accent-primary)] overflow-hidden font-mono text-xs"
            >
              <div className="bg-[var(--text-main)] px-4 py-3 flex items-center justify-between text-[var(--bg-root)] border-b border-[var(--text-main)]">
                <div className="flex items-center gap-2">
                  <span className="animate-spin text-[var(--bg-root)]">✜</span>
                  <span className="font-bold uppercase tracking-widest">PDF_Export.log</span>
                </div>
                <span className="animate-pulse font-bold">RUNNING</span>
              </div>
              <div className="p-6 h-48 overflow-y-auto bg-black custom-scrollbar flex flex-col justify-end border-t-2 border-[var(--text-main)]">
                <div className="mb-1 break-all flex gap-3">
                  <span className="text-[var(--text-muted)] opacity-50 select-none min-w-[80px] text-right">[00:00:01]</span>
                  <span className="text-[var(--text-main)]">Initializing Chromium renderer...</span>
                </div>
                <div className="mb-1 break-all flex gap-3">
                  <span className="text-[var(--text-muted)] opacity-50 select-none min-w-[80px] text-right">[00:00:02]</span>
                  <span className="text-[var(--text-main)]">Injecting page content...</span>
                </div>
                <div className="mb-1 break-all flex gap-3">
                  <span className="text-[var(--text-muted)] opacity-50 select-none min-w-[80px] text-right">[00:00:03]</span>
                  <span className="text-[var(--accent-primary)]">Generating PDF assets...</span>
                </div>
                <div className="animate-pulse text-[var(--accent-primary)] mt-2">_</div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className={`fixed bottom-8 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-md border shadow-2xl z-[100] flex items-center gap-3 font-mono text-sm max-w-md
                ${toast?.type === 'error' ? 'bg-[#290000] border-[var(--accent-error)] text-[var(--accent-error)]' :
                toast?.type === 'success' ? 'bg-[#001a00] border-[var(--accent-primary)] text-[var(--accent-primary)]' :
                  'bg-[var(--bg-surface)] border-[var(--border-dim)] text-[var(--text-main)]'}`}
          >
            {toast?.type === 'error' ? <XCircle size={18} /> :
              toast?.type === 'success' ? <CheckCircle2 size={18} /> :
                <Sparkles size={18} />}
            <span>{toast?.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </main >
  );
}
