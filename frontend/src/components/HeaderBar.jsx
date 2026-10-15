import React from 'react';
import { FileText, UploadCloud, Layers, Key } from 'lucide-react';

export default function HeaderBar({
  documents,
  activeDocument,
  onOpenLibrary,
  onOpenUpload,
  onOpenApiKeys,
}) {
  return (
    <header className="w-full max-w-[1720px] mx-auto px-6 pt-4 pb-2 flex items-center justify-between text-xs text-neutral-300">
      {/* Brand & Active Scope */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white font-medium shadow-sm">
          <Layers className="w-4 h-4 text-purple-400" />
          <span className="tracking-tight text-sm font-semibold">AI Research Assistant</span>
          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">
            RAG v1.0
          </span>
        </div>

        {/* Active Document Indicator */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-neutral-300">
          <FileText className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-neutral-400">Active Document:</span>
          <span className="text-white font-medium truncate max-w-[260px]">
            {activeDocument?.title || "No document loaded"}
          </span>
        </div>
      </div>

      {/* Right Controls: Document Library & Upload */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenApiKeys}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all font-medium text-xs shadow-sm cursor-pointer hover:border-amber-400/50"
          title="Configure API keys for Gemini, Grok, and ChatGPT"
        >
          <Key className="w-3.5 h-3.5 text-amber-400" />
          <span>API Keys</span>
        </button>

        <button
          onClick={onOpenLibrary}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all font-medium text-xs shadow-sm cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5 text-purple-300" />
          <span>Library ({documents?.length || 0})</span>
        </button>

        <button
          onClick={onOpenUpload}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white text-black hover:bg-neutral-200 transition-all font-medium text-xs shadow-sm cursor-pointer"
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>Upload Paper</span>
        </button>
      </div>
    </header>
  );
}
