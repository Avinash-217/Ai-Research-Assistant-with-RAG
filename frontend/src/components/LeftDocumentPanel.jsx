import React, { useState, useEffect, useRef } from 'react';
import {
  Compass,
  ChevronDown,
  Share2,
  ZoomIn,
  ZoomOut,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  Mic,
  MicOff,
  Plus,
  Send,
  Sparkles,
  Check,
  FileText,
  Eye,
  BookOpen,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { getDocumentDetails } from '../services/api';

const AVAILABLE_MODELS = [
  { id: 'grok-6', name: 'Grok', version: '6.0', badge: 'Reasoning', desc: 'xAI high-reasoning synthesis' },
  { id: 'gpt-4o', name: 'GPT-4o', version: 'Omni', badge: 'Multimodal', desc: 'OpenAI multi-domain research model' },
  { id: 'claude-35', name: 'Claude', version: '3.5', badge: 'Detailed', desc: 'Anthropic deep academic writing' },
  { id: 'gemini-15', name: 'Gemini', version: '1.5 Flash', badge: 'Fast', desc: 'Google low-latency research engine' },
  { id: 'ollama-llama', name: 'Ollama', version: '3.2', badge: 'Local', desc: 'On-device private inference' },
  { id: 'fallback', name: 'Rule Engine', version: 'v1.0', badge: 'Deterministic', desc: 'Zero-hallucination grounded RAG' },
];

export default function LeftDocumentPanel({
  activeDocument,
  onAnalyzeSection,
  onSelectHighlight,
  activeHighlightId,
  isAnalyzing,
}) {
  const [docDetails, setDocDetails] = useState(null);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [viewMode, setViewMode] = useState('pdf'); // 'pdf' | 'reader'
  const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[0]);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [queryInput, setQueryInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const iframeRef = useRef(null);
  const speechRecognitionRef = useRef(null);
  const modelMenuRef = useRef(null);

  // Close model menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (modelMenuRef.current && !modelMenuRef.current.contains(event.target)) {
        setShowModelDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch real document details & pages whenever active document changes
  useEffect(() => {
    if (!activeDocument?.id) return;

    let isMounted = true;
    async function fetchDoc() {
      setLoadingDoc(true);
      setCurrentPage(1);

      try {
        const details = await getDocumentDetails(activeDocument.id);
        if (isMounted) {
          setDocDetails(details);
          // Default to PDF view if uploaded document is a PDF, otherwise Reader view
          if (details.file_url && (details.filename?.endsWith('.pdf') || details.mime_type === 'application/pdf')) {
            setViewMode('pdf');
          } else {
            setViewMode('reader');
          }
        }
      } catch (err) {
        console.warn('Could not fetch parsed document details, using available activeDocument metadata:', err);
        if (isMounted) {
          setDocDetails({
            ...activeDocument,
            pages: activeDocument.pages || [],
            file_url: activeDocument.file_url || null,
          });
          if (activeDocument.file_url) setViewMode('pdf');
        }
      } finally {
        if (isMounted) setLoadingDoc(false);
      }
    }

    fetchDoc();
    return () => { isMounted = false; };
  }, [activeDocument?.id]);

  // Speech Recognition setup
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((res) => res[0].transcript)
          .join('');
        setQueryInput(transcript);
      };

      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      speechRecognitionRef.current = recognition;
    }
  }, []);

  const totalPages = Math.max(1, docDetails?.pages?.length || docDetails?.page_count || activeDocument?.page_count || 1);
  const currentDocPage = docDetails?.pages?.find((p) => p.page_number === currentPage) || docDetails?.pages?.[currentPage - 1];
  const fileUrl = docDetails?.file_url || activeDocument?.file_url;

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleToggleVoice = () => {
    if (!speechRecognitionRef.current) {
      showToast('Voice dictation not supported in this browser.');
      return;
    }
    if (isListening) {
      speechRecognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        speechRecognitionRef.current.start();
        setIsListening(true);
        showToast('Listening... Speak now');
      } catch (err) {
        setIsListening(false);
      }
    }
  };

  const handleShare = async () => {
    const docTitle = activeDocument?.title || 'Research Document';
    const shareText = `Check out "${docTitle}" on AI Research Assistant`;
    const shareUrl = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title: docTitle, text: shareText, url: shareUrl });
        return;
      } catch (err) {
        // Fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      setCopiedLink(true);
      showToast('Link copied to clipboard!');
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (err) {
      showToast('Could not copy link');
    }
  };

  const handleDownload = () => {
    if (fileUrl) {
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = docDetails?.filename || activeDocument?.filename || `${activeDocument?.title || 'document'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Downloading document...');
    } else if (docDetails?.pages?.length) {
      const fullText = docDetails.pages.map((p) => `--- PAGE ${p.page_number} ---\n\n${p.text}`).join('\n\n');
      const blob = new Blob([fullText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${activeDocument?.title || 'document'}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('Downloading extracted text...');
    } else {
      showToast('No file available to download');
    }
  };

  const handlePrint = () => {
    if (viewMode === 'pdf' && fileUrl) {
      window.open(fileUrl, '_blank')?.print();
    } else {
      window.print();
    }
  };

  const handleSendQuery = (e) => {
    e?.preventDefault();
    if (!queryInput.trim() || isAnalyzing) return;
    onAnalyzeSection(queryInput, {
      page: currentPage,
      pageText: currentDocPage?.text || '',
    });
    setQueryInput('');
  };

  const handleParagraphClick = (paraText) => {
    if (!paraText?.trim()) return;
    if (onSelectHighlight) {
      onSelectHighlight({
        id: `hl-${currentPage}-${Date.now()}`,
        page: currentPage,
        text: paraText.trim(),
        title: activeDocument?.title || 'Research Document',
      });
    }
    setQueryInput(`Analyze this passage: "${paraText.trim().slice(0, 90)}..."`);
  };

  return (
    <div className="w-full lg:w-[48%] h-[88vh] bg-white rounded-[28px] shadow-2xl flex flex-col overflow-hidden border border-neutral-200/60 transition-all relative">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-1.5 rounded-full bg-neutral-900/95 text-white text-xs shadow-lg backdrop-blur border border-white/10 animate-in fade-in duration-150">
          {toastMessage}
        </div>
      )}

      {/* 1. Header with Grok Model Selector, View Switcher & Share */}
      <div className="px-6 pt-5 pb-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5" ref={modelMenuRef}>
          {/* Model Selector Dropdown Trigger */}
          <button
            onClick={() => setShowModelDropdown(!showModelDropdown)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0A0A0A] text-white shadow-sm hover:opacity-90 transition-opacity cursor-pointer"
            title="Select AI Reasoning Model"
          >
            <Compass className="w-4 h-4 text-purple-400" />
            <span className="font-semibold text-xs tracking-tight">{selectedModel.name}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-300 font-mono">
              {selectedModel.version}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${showModelDropdown ? 'rotate-180' : ''}`} />
          </button>

          {/* Model Popover Dropdown */}
          {showModelDropdown && (
            <div className="absolute top-16 left-6 z-50 w-64 bg-white rounded-2xl shadow-2xl border border-neutral-200 py-2 animate-in fade-in duration-150">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                Select Inference Model
              </div>
              {AVAILABLE_MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => {
                    setSelectedModel(model);
                    setShowModelDropdown(false);
                    showToast(`Switched model to ${model.name} (${model.version})`);
                  }}
                  className={`w-full text-left px-3.5 py-2 flex items-center justify-between hover:bg-neutral-100 transition-colors cursor-pointer ${
                    selectedModel.id === model.id ? 'bg-purple-50/70 text-purple-900' : 'text-neutral-800'
                  }`}
                >
                  <div>
                    <div className="font-medium text-xs flex items-center gap-1.5">
                      <span>{model.name}</span>
                      <span className="text-[10px] px-1 rounded bg-neutral-200/70 text-neutral-700 font-mono">
                        {model.version}
                      </span>
                    </div>
                    <div className="text-[10px] text-neutral-500 mt-0.5">{model.desc}</div>
                  </div>
                  {selectedModel.id === model.id && <Check className="w-4 h-4 text-purple-600 shrink-0" />}
                </button>
              ))}
            </div>
          )}

          {/* View Mode Toggle (PDF vs Reader) */}
          <div className="flex items-center p-0.5 rounded-full bg-neutral-100 border border-neutral-200/80 text-[11px]">
            <button
              onClick={() => setViewMode('pdf')}
              disabled={!fileUrl}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-medium transition-all cursor-pointer ${
                viewMode === 'pdf' ? 'bg-white shadow-sm text-neutral-900 font-semibold' : 'text-neutral-500 hover:text-neutral-800 disabled:opacity-40'
              }`}
              title="View original uploaded PDF file"
            >
              <Eye className="w-3 h-3" />
              <span>Original PDF</span>
            </button>
            <button
              onClick={() => setViewMode('reader')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-medium transition-all cursor-pointer ${
                viewMode === 'reader' ? 'bg-white shadow-sm text-neutral-900 font-semibold' : 'text-neutral-500 hover:text-neutral-800'
              }`}
              title="View structured interactive reader text"
            >
              <BookOpen className="w-3 h-3" />
              <span>Reader View</span>
            </button>
          </div>
        </div>

        {/* Share Button */}
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900 transition-colors font-medium px-2 py-1 cursor-pointer"
          title="Share document link"
        >
          {copiedLink ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-emerald-600 font-semibold">Copied!</span>
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </>
          )}
        </button>
      </div>

      {/* 2. Document Title & Metadata Badges */}
      <div className="px-6 pb-3 shrink-0 flex items-center justify-between gap-4">
        <h1 className="text-xl font-bold tracking-tight text-neutral-900 leading-snug line-clamp-1">
          {activeDocument?.title || 'No document loaded'}
        </h1>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 border border-neutral-200">
            {activeDocument?.mime_type?.includes('pdf') ? 'PDF' : activeDocument?.filename?.split('.').pop() || 'DOC'}
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
            {totalPages} Pages
          </span>
        </div>
      </div>

      {/* 3. Document Frame (Toolbar + Canvas Scroll Area) */}
      <div className="mx-6 flex-1 bg-neutral-100 rounded-2xl border border-neutral-200/80 flex flex-col overflow-hidden shadow-inner relative">
        {/* PDF / Reader Dark Toolbar */}
        <div className="h-9 bg-[#1E2228] text-neutral-300 px-3 flex items-center justify-between text-xs shrink-0 select-none">
          {/* Page Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1 hover:text-white disabled:opacity-30 transition-colors cursor-pointer"
              title="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[11px] text-neutral-200 tracking-wider">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1 hover:text-white disabled:opacity-30 transition-colors cursor-pointer"
              title="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Zoom, Download, Print Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setZoomLevel((z) => Math.max(50, z - 10))}
              className="p-1 hover:text-white transition-colors cursor-pointer"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(100)}
              className="text-[10px] font-mono text-neutral-300 hover:text-white cursor-pointer px-1 py-0.5 rounded hover:bg-white/10"
              title="Reset Zoom to 100%"
            >
              {zoomLevel}%
            </button>
            <button
              onClick={() => setZoomLevel((z) => Math.min(180, z + 10))}
              className="p-1 hover:text-white transition-colors cursor-pointer"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <div className="w-[1px] h-3.5 bg-neutral-700"></div>
            <button
              onClick={handleDownload}
              className="p-1 hover:text-white transition-colors cursor-pointer"
              title="Download Document"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handlePrint}
              className="p-1 hover:text-white transition-colors cursor-pointer"
              title="Print Document"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative bg-neutral-200/60 flex items-center justify-center">
          {loadingDoc ? (
            <div className="flex flex-col items-center justify-center gap-3 text-neutral-500">
              <Loader2 className="w-7 h-7 animate-spin text-purple-600" />
              <span className="text-xs font-medium">Extracting and loading document pages...</span>
            </div>
          ) : viewMode === 'pdf' && fileUrl ? (
            <div className="w-full h-full relative bg-neutral-900">
              <iframe
                ref={iframeRef}
                src={`${fileUrl}#page=${currentPage}&zoom=${zoomLevel}`}
                className="w-full h-full border-0"
                title={activeDocument?.title || 'Document PDF Preview'}
              />
            </div>
          ) : (
            /* Interactive Reader View Canvas */
            <div className="w-full h-full overflow-y-auto p-4 flex justify-center">
              <div
                style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
                className="w-full max-w-[640px] bg-white rounded-lg shadow-md p-7 transition-transform duration-150 text-neutral-800 font-sans leading-relaxed text-xs select-text my-2 border border-neutral-300/80"
              >
                {/* Paper Page Header */}
                <div className="pb-3 border-b border-neutral-200 mb-4 flex items-center justify-between text-neutral-400 text-[10px] font-mono">
                  <span className="truncate max-w-[380px] font-semibold text-neutral-700">
                    {activeDocument?.title}
                  </span>
                  <span>Page {currentPage} of {totalPages}</span>
                </div>

                {/* Real Extracted Page Content */}
                {currentDocPage?.text?.trim() ? (
                  <div className="space-y-3">
                    {currentDocPage.text
                      .split(/\n\s*\n/)
                      .filter((para) => para.trim().length > 0)
                      .map((paragraph, idx) => {
                        const isHeading = paragraph.length < 80 && (paragraph.includes(':') || paragraph.toUpperCase() === paragraph);
                        const isQuestion = /^\d+[\.\)]/.test(paragraph.trim());

                        return (
                          <div
                            key={idx}
                            onClick={() => handleParagraphClick(paragraph)}
                            className={`p-2 rounded transition-all cursor-pointer group ${
                              isHeading
                                ? 'font-bold text-neutral-900 text-sm border-l-2 border-purple-500 pl-2.5 bg-purple-50/30'
                                : isQuestion
                                ? 'bg-amber-50/60 border border-amber-200/70 text-neutral-900 font-medium hover:bg-amber-100/70'
                                : 'hover:bg-neutral-100/80'
                            }`}
                            title="Click passage to analyze with RAG"
                          >
                            <p className="whitespace-pre-line leading-relaxed">{paragraph.trim()}</p>
                            <div className="hidden group-hover:flex items-center gap-1 text-[10px] text-purple-600 mt-1 font-sans">
                              <Sparkles className="w-3 h-3" />
                              <span>Click to analyze this passage</span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="py-16 text-center text-neutral-400">
                    <p className="text-xs mb-3">No machine-readable text found on Page {currentPage}.</p>
                    {fileUrl && (
                      <button
                        onClick={() => setViewMode('pdf')}
                        className="px-3 py-1.5 rounded-full bg-neutral-900 text-white text-xs hover:bg-neutral-800 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Switch to Original PDF View</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Bottom Floating Prompt Bar with Working Voice & Submit */}
      <div className="px-6 py-4 shrink-0">
        <form
          onSubmit={handleSendQuery}
          className="w-full flex items-center bg-[#F3F4F6] rounded-full px-4 py-2 border border-neutral-200/90 shadow-sm focus-within:border-neutral-900 focus-within:ring-1 focus-within:ring-neutral-900 transition-all"
        >
          {/* Microphone Voice Dictation */}
          <button
            type="button"
            onClick={handleToggleVoice}
            className={`p-1 rounded-full transition-colors cursor-pointer ${
              isListening ? 'text-rose-600 bg-rose-100 animate-pulse' : 'text-neutral-500 hover:text-neutral-800'
            }`}
            title={isListening ? 'Stop listening' : 'Speak query via microphone'}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Divider */}
          <div className="w-[1px] h-4 bg-neutral-300 mx-2.5"></div>

          {/* Input text */}
          <input
            type="text"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder={`Analyze this section (Page ${currentPage})...`}
            className="flex-1 bg-transparent border-none outline-none text-xs text-neutral-900 placeholder:text-neutral-400 font-sans"
          />

          {/* Action Button */}
          <button
            type="submit"
            disabled={isAnalyzing || !queryInput.trim()}
            className="p-1.5 rounded-full bg-neutral-800 hover:bg-black text-white disabled:opacity-40 transition-all ml-1 cursor-pointer"
            title="Analyze section"
          >
            {isAnalyzing ? (
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
            ) : queryInput.trim() ? (
              <Send className="w-3.5 h-3.5" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
