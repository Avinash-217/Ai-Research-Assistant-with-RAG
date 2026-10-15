import React, { useState } from 'react';
import {
  MoreHorizontal,
  LayoutGrid,
  Sparkles,
  ExternalLink,
  Code2,
  Image as ImageIcon,
  BookOpen,
  FileText,
  Table,
  BarChart3,
  Globe,
  Quote,
  CheckCircle2,
  Trash2,
  ChevronRight
} from 'lucide-react';

export default function RightNotesPanel({
  activeDocument,
  chatMessages,
  onOpenActionModal,
  onOpenCitation,
  activeTab,
  setActiveTab,
  onCardOpen,
}) {
  const [showActionMenu, setShowActionMenu] = useState(false);

  // Initial synthetic cards matching the reference image
  const defaultCards = [
    {
      id: 'card-1',
      type: 'text',
      title: 'Metaphors and visual images that help explain consciousness',
      subtitle: '',
      hasOpenBtn: true,
      tag: 'Metaphor',
      page: 1,
      passage: 'Metaphors and visual images that help explain consciousness rely on phenomenal qualia rather than reductive physical state mappings.'
    },
    {
      id: 'card-2',
      type: 'text',
      title: 'Key philosophical arguments for property dualism (pp. 5-8)',
      subtitle: '',
      hasOpenBtn: false,
      tag: 'Philosophy',
      page: 5,
      passage: 'Property dualism asserts that although consciousness arises alongside neurobiological activity, subjective experiential states cannot be reduced to physical configurations.'
    },
    {
      id: 'card-3',
      type: 'text',
      title: "Synthesis: AI's effect on human memory (Summary of p. 12)",
      subtitle: 'Core point: Over-reliance risks weakening natural recall.',
      hasOpenBtn: true,
      tag: 'Memory',
      page: 12,
      passage: 'Over-reliance on external cognitive retrieval risks weakening intrinsic episodic recall mechanisms.'
    },
    {
      id: 'card-4',
      type: 'media',
      title: 'Room Metaphor for Qualia Architecture',
      imageUrl: '/metaphor_room.jpg',
      tag: 'Visual',
      page: 1
    },
    {
      id: 'card-5',
      type: 'code',
      title: 'Entity Extraction Pipeline',
      codeSnippet: `import spacy
pdf_analysis = pdf_analysis.extract_key_concepts(section=1)
pdf_analysis.extract((
    section=)
)
results = {
    "metaphors": 15,
    "key_philosophers": ["Chalmers", "Descartes"]
}`,
      tag: 'Code',
      page: 1
    }
  ];

  return (
    <div className="w-full lg:w-[52%] h-[88vh] glass-panel rounded-[28px] shadow-2xl flex flex-col overflow-hidden border border-white/60 relative">
      {/* 1. Header with Notes title, Navigation Tabs, and Group Action */}
      <div className="px-7 pt-5 pb-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-6">
          <h2 className="text-3xl font-extrabold tracking-tight text-neutral-900 font-sans">
            Notes
          </h2>

          {/* Filter Tabs matching reference: All, Highlights, Links, Media */}
          <nav className="flex items-center gap-4 text-xs font-medium text-neutral-500">
            {['All', 'Highlights', 'Links', 'Media'].map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-1 transition-colors relative cursor-pointer ${
                    isActive ? 'text-neutral-900 font-semibold' : 'hover:text-neutral-700'
                  }`}
                >
                  {tab}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-neutral-900 rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Group Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenActionModal('matrix')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 hover:bg-white text-neutral-800 text-xs font-medium border border-neutral-200/80 shadow-sm transition-all cursor-pointer"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-neutral-600" />
            <span>Group</span>
          </button>
        </div>
      </div>

      {/* 2. Bento Grid / Dynamic Notes Feed */}
      <div className="flex-1 overflow-y-auto px-7 py-4 pb-24">
        {/* If chat queries have been run, show live research answers first */}
        {chatMessages && chatMessages.length > 0 && (
          <div className="mb-6 space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-600">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>Grounded Research Analysis</span>
            </div>

            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className="bg-white rounded-[22px] p-5 shadow-sm border border-neutral-200/90 text-neutral-800 text-xs leading-relaxed transition-all"
              >
                <div className="flex items-center justify-between pb-2 border-b border-neutral-100 mb-2">
                  <span className="font-semibold text-neutral-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                    Query: "{msg.question || msg.role}"
                  </span>
                  <span className="text-[10px] font-mono text-neutral-400">
                    {new Date(msg.created_at || Date.now()).toLocaleTimeString()}
                  </span>
                </div>

                <div className="prose prose-sm max-w-none text-neutral-800 text-xs leading-relaxed whitespace-pre-line">
                  {msg.content}
                </div>

                {/* Inline Citations List */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-neutral-100 flex flex-wrap gap-2 items-center">
                    <span className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider">
                      Verified Sources:
                    </span>
                    {msg.citations.map((c, i) => (
                      <button
                        key={i}
                        onClick={() => onOpenCitation && onOpenCitation(c)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 text-[10px] font-medium transition-colors cursor-pointer"
                        title={c.passage}
                      >
                        <Quote className="w-2.5 h-2.5 text-blue-500" />
                        <span className="truncate max-w-[130px] font-semibold">{c.source_title}</span>
                        <span>p. {c.page_number}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Bento Grid matching reference layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Metaphors Note */}
          {(activeTab === 'All' || activeTab === 'Highlights') && (
            <div className="bg-white rounded-[20px] p-5 shadow-sm border border-neutral-200/70 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <span className="text-neutral-400">
                  <MoreHorizontal className="w-4 h-4 cursor-pointer hover:text-neutral-700" />
                </span>
              </div>
              <p className="text-sm font-semibold text-neutral-900 mt-2 mb-6 leading-snug">
                Metaphors and visual images that help explain consciousness
              </p>
              <div className="flex justify-center">
                <button
                  onClick={() => onCardOpen && onCardOpen(defaultCards[0])}
                  className="px-6 py-1.5 rounded-full bg-neutral-100/90 hover:bg-neutral-200 text-neutral-800 text-xs font-medium transition-colors cursor-pointer"
                >
                  Open
                </button>
              </div>
            </div>
          )}

          {/* Card 2: Property Dualism Note */}
          {(activeTab === 'All' || activeTab === 'Highlights') && (
            <div className="bg-white rounded-[20px] p-5 shadow-sm border border-neutral-200/70 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <span className="text-neutral-400">
                  <MoreHorizontal className="w-4 h-4 cursor-pointer hover:text-neutral-700" />
                </span>
              </div>
              <p className="text-sm font-semibold text-neutral-900 mt-2 mb-4 leading-snug">
                Key philosophical arguments for property dualism (pp. 5-8)
              </p>
              <div className="h-4"></div>
            </div>
          )}

          {/* Card 3: Synthesis Memory Note */}
          {(activeTab === 'All' || activeTab === 'Highlights') && (
            <div className="bg-white rounded-[20px] p-5 shadow-sm border border-neutral-200/70 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <span className="text-neutral-400">
                  <MoreHorizontal className="w-4 h-4 cursor-pointer hover:text-neutral-700" />
                </span>
              </div>
              <div className="mt-2 mb-4">
                <h4 className="text-sm font-semibold text-neutral-900 leading-snug">
                  Synthesis: AI's effect on human memory (Summary of p. 12)
                </h4>
                <p className="text-xs text-neutral-600 mt-2 leading-relaxed">
                  Core point: Over-reliance risks weakening natural recall.
                </p>
              </div>
              <div className="flex justify-center">
                <button
                  onClick={() => onCardOpen && onCardOpen(defaultCards[2])}
                  className="px-6 py-1.5 rounded-full bg-neutral-100/90 hover:bg-neutral-200 text-neutral-800 text-xs font-medium transition-colors cursor-pointer"
                >
                  Open
                </button>
              </div>
            </div>
          )}

          {/* Card 4: Media Room Visual Card */}
          {(activeTab === 'All' || activeTab === 'Media') && (
            <div className="bg-white rounded-[20px] overflow-hidden shadow-sm border border-neutral-200/70 group hover:shadow-md transition-shadow relative">
              <div className="h-44 w-full overflow-hidden bg-neutral-100 relative">
                <img
                  src="/metaphor_room.jpg"
                  alt="Metaphor visual room"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute bottom-2 left-2 p-1.5 rounded-md bg-black/60 text-white backdrop-blur-sm">
                  <ImageIcon className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          )}

          {/* Card 5: Jet-Black Code Card */}
          {(activeTab === 'All' || activeTab === 'Links') && (
            <div className="bg-[#0A0A0C] text-neutral-200 rounded-[20px] p-5 shadow-sm border border-neutral-800 flex flex-col font-mono text-[11px] hover:shadow-md transition-shadow md:col-span-1">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-800 text-[10px] text-neutral-400 font-sans uppercase tracking-wider">
                <span>CODE</span>
                <Code2 className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <pre className="mt-2.5 overflow-x-auto text-[11px] leading-relaxed text-neutral-300">
                <code>{`import spacy
pdf_analysis = pdf_analysis.extract_key_concepts(section=1)
pdf_analysis.extract((
    section=)
)
results = {
    "metaphors": 15,
    "key_philosophers": ["Chalmers", "Descartes"]
}`}</code>
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* 3. Floating Attribution Pill Note */}
      <div className="absolute bottom-16 left-0 right-0 flex justify-center pointer-events-none">
        <div className="glass-pill px-4 py-1.5 rounded-full text-xs text-neutral-700 shadow-md flex items-center gap-1.5 border border-white/80 pointer-events-auto">
          <Sparkles className="w-3 h-3 text-purple-600" />
          <span>Notes generated by AI analysis of [{activeDocument?.title || 'The Science and Philosophy of Consciousness'}]</span>
        </div>
      </div>

      {/* 4. Bottom Floating Pitch-Black Actions Trigger */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center">
        <div className="relative">
          <button
            onClick={() => setShowActionMenu(!showActionMenu)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-black text-white hover:bg-neutral-800 transition-all font-medium text-xs shadow-xl cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Actions</span>
          </button>

          {/* Quick Actions Popup Menu */}
          {showActionMenu && (
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-64 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-neutral-200 p-2 text-xs text-neutral-800 space-y-1 z-30 animate-in fade-in zoom-in-95 duration-150">
              <button
                onClick={() => {
                  setShowActionMenu(false);
                  onOpenActionModal('matrix');
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-neutral-100 transition-colors cursor-pointer text-left font-medium"
              >
                <Table className="w-4 h-4 text-purple-600" />
                <span>Research Comparison Matrix</span>
              </button>

              <button
                onClick={() => {
                  setShowActionMenu(false);
                  onOpenActionModal('lit_review');
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-neutral-100 transition-colors cursor-pointer text-left font-medium"
              >
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span>Generate Literature Review</span>
              </button>

              <button
                onClick={() => {
                  setShowActionMenu(false);
                  onOpenActionModal('web_search');
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-neutral-100 transition-colors cursor-pointer text-left font-medium"
              >
                <Globe className="w-4 h-4 text-emerald-600" />
                <span>Web Research Mode</span>
              </button>

              <button
                onClick={() => {
                  setShowActionMenu(false);
                  onOpenActionModal('evaluation');
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-neutral-100 transition-colors cursor-pointer text-left font-medium"
              >
                <BarChart3 className="w-4 h-4 text-amber-600" />
                <span>RAG Evaluation Dashboard</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
