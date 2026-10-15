import React, { useState, useRef } from 'react';
import {
  X,
  FileText,
  UploadCloud,
  Trash2,
  CheckCircle2,
  AlertCircle,
  File,
  Eye,
  CheckSquare,
  Square,
  Sparkles
} from 'lucide-react';
import { uploadDocument, deleteDocument } from '../services/api';

export default function DocumentLibraryModal({
  isOpen,
  onClose,
  documents,
  activeDocument,
  onSelectActiveDoc,
  onRefreshDocs,
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const fileInputRef = useRef(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError('');
    setUploadSuccess('');

    try {
      const res = await uploadDocument(file);
      setUploadSuccess(`Uploaded "${res.title}" successfully (${res.page_count} pages).`);
      if (onRefreshDocs) onRefreshDocs();
      if (onSelectActiveDoc) onSelectActiveDoc(res);
    } catch (err) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (docId, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this document from the library?')) return;
    try {
      await deleteDocument(docId);
      if (onRefreshDocs) onRefreshDocs();
    } catch (err) {
      alert(err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-[24px] shadow-2xl border border-neutral-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900">Document Library</h3>
              <p className="text-xs text-neutral-500">
                Manage your research papers (PDF, DOCX, TXT) with automatic chunking and OCR
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-200 text-neutral-500 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Upload Drop Zone */}
        <div className="p-6 border-b border-neutral-200 bg-neutral-50/50">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-neutral-300 hover:border-purple-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-white group"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".pdf,.docx,.txt"
              className="hidden"
            />
            <UploadCloud className="w-8 h-8 mx-auto text-neutral-400 group-hover:text-purple-600 transition-colors mb-2" />
            <p className="text-xs font-semibold text-neutral-800">
              Click or drag papers here to ingest (PDF, DOCX, TXT)
            </p>
            <p className="text-[11px] text-neutral-400 mt-1">
              Supports native text extraction and OCR for scanned documents (up to 25MB)
            </p>
          </div>

          {uploading && (
            <div className="mt-3 text-xs text-purple-700 flex items-center gap-2 font-medium">
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>Processing document, extracting text, generating embeddings...</span>
            </div>
          )}

          {uploadSuccess && (
            <div className="mt-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{uploadSuccess}</span>
            </div>
          )}

          {uploadError && (
            <div className="mt-3 text-xs text-red-700 bg-red-50 border border-red-200 p-2.5 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}
        </div>

        {/* Documents List */}
        <div className="flex-1 overflow-auto p-6 space-y-2.5">
          <div className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
            Loaded Papers ({documents?.length || 0})
          </div>

          {documents && documents.length > 0 ? (
            documents.map((doc) => {
              const isActive = activeDocument?.id === doc.id;
              return (
                <div
                  key={doc.id}
                  onClick={() => onSelectActiveDoc(doc)}
                  className={`p-3.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                    isActive
                      ? 'bg-purple-50/70 border-purple-300 shadow-xs'
                      : 'bg-white border-neutral-200 hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <File className={`w-5 h-5 ${isActive ? 'text-purple-600' : 'text-neutral-400'}`} />
                    <div>
                      <div className="text-xs font-bold text-neutral-900">{doc.title}</div>
                      <div className="text-[10px] text-neutral-500 flex items-center gap-2 mt-0.5 font-mono">
                        <span>{doc.page_count} pages</span>
                        <span>•</span>
                        <span>{(doc.file_size / (1024 * 1024)).toFixed(2)} MB</span>
                        {doc.ocr_applied && (
                          <>
                            <span>•</span>
                            <span className="text-amber-600 font-sans font-semibold">OCR Ingested</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isActive ? (
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-purple-600 text-white">
                        Active In Reader
                      </span>
                    ) : (
                      <button
                        onClick={() => onSelectActiveDoc(doc)}
                        className="text-xs text-neutral-500 hover:text-neutral-900 px-2 py-1 rounded"
                      >
                        Set Active
                      </button>
                    )}

                    <button
                      onClick={(e) => handleDelete(doc.id, e)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-neutral-400 hover:text-red-600 transition-colors"
                      title="Delete paper"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-10 text-neutral-400 text-xs">
              No documents in library yet. Upload a PDF above to begin research.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
