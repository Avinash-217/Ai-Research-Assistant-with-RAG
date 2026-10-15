import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Cpu,
  Loader2
} from 'lucide-react';
import { getApiKeys, updateApiKeys, testApiKey } from '../services/api';

const PROVIDERS = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    badge: 'Recommended',
    tagline: 'High speed, long context window, generous free tier',
    model: 'gemini-1.5-flash',
    portalUrl: 'https://aistudio.google.com/app/apikey',
    placeholder: 'AIzaSy...',
    accentColor: 'text-blue-600',
    bgColor: 'bg-blue-50/60',
    borderColor: 'border-blue-200',
  },
  {
    id: 'grok',
    name: 'xAI Grok',
    badge: 'Reasoning',
    tagline: 'Strong academic synthesis and mathematical rigor',
    model: 'grok-beta',
    portalUrl: 'https://console.x.ai/',
    placeholder: 'xai-...',
    accentColor: 'text-neutral-900',
    bgColor: 'bg-neutral-100/70',
    borderColor: 'border-neutral-300',
  },
  {
    id: 'openai',
    name: 'OpenAI / ChatGPT',
    badge: 'Standard',
    tagline: 'GPT-4o Mini / GPT-4o multi-domain benchmark model',
    model: 'gpt-4o-mini',
    portalUrl: 'https://platform.openai.com/api-keys',
    placeholder: 'sk-proj-...',
    accentColor: 'text-emerald-600',
    bgColor: 'bg-emerald-50/60',
    borderColor: 'border-emerald-200',
  },
];

export default function ApiKeysModal({ isOpen, onClose, onKeysUpdated }) {
  const [keysConfig, setKeysConfig] = useState(null);
  const [geminiKey, setGeminiKey] = useState('');
  const [grokKey, setGrokKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [activeProvider, setActiveProvider] = useState('fallback');

  const [showKeys, setShowKeys] = useState({ gemini: false, grok: false, openai: false });
  const [testingStatus, setTestingStatus] = useState({});
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  useEffect(() => {
    if (!isOpen) return;
    loadKeys();
  }, [isOpen]);

  const loadKeys = async () => {
    try {
      const data = await getApiKeys();
      setKeysConfig(data);
      if (data.gemini?.masked_key) setGeminiKey(data.gemini.masked_key);
      if (data.grok?.masked_key) setGrokKey(data.grok.masked_key);
      if (data.openai?.masked_key) setOpenaiKey(data.openai.masked_key);
      if (data.active_provider) setActiveProvider(data.active_provider);
    } catch (err) {
      console.warn('Could not load existing keys:', err);
    }
  };

  if (!isOpen) return null;

  const toggleShow = (provider) => {
    setShowKeys((prev) => ({ ...prev, [provider]: !prev[provider] }));
  };

  const handleTestKey = async (provider) => {
    const keyMap = { gemini: geminiKey, grok: grokKey, openai: openaiKey };
    const rawKey = keyMap[provider];

    setTestingStatus((prev) => ({ ...prev, [provider]: { loading: true } }));
    try {
      const res = await testApiKey(provider, rawKey);
      if (res.success) {
        setTestingStatus((prev) => ({
          ...prev,
          [provider]: { loading: false, success: true, message: res.message },
        }));
      } else {
        setTestingStatus((prev) => ({
          ...prev,
          [provider]: { loading: false, error: res.error },
        }));
      }
    } catch (err) {
      setTestingStatus((prev) => ({
        ...prev,
        [provider]: { loading: false, error: err.message },
      }));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback({ type: '', message: '' });

    try {
      const res = await updateApiKeys({
        gemini_api_key: geminiKey,
        grok_api_key: grokKey,
        openai_api_key: openaiKey,
        active_provider: activeProvider,
      });

      setFeedback({ type: 'success', message: 'API keys and active model updated successfully!' });
      if (onKeysUpdated) onKeysUpdated(res.config);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save API keys.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-[24px] shadow-2xl border border-neutral-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900">AI Model API Keys</h3>
              <p className="text-xs text-neutral-500">
                Connect your personal API keys for Gemini, Grok, or OpenAI to power custom synthesis
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

        {/* Feedback Alert */}
        {feedback.message && (
          <div
            className={`mx-6 mt-4 p-3 rounded-xl text-xs flex items-center gap-2 border ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Body Content */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Active Model Selector Pill */}
          <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200">
            <label className="block text-xs font-semibold text-neutral-800 mb-2">
              Default Active Inference Provider
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'gemini', label: 'Gemini' },
                { id: 'grok', label: 'Grok' },
                { id: 'openai', label: 'OpenAI' },
                { id: 'fallback', label: 'Rule Engine' },
              ].map((prov) => (
                <button
                  type="button"
                  key={prov.id}
                  onClick={() => setActiveProvider(prov.id)}
                  className={`py-2 px-3 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer ${
                    activeProvider === prov.id
                      ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm font-semibold'
                      : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  {prov.label}
                </button>
              ))}
            </div>
          </div>

          {/* Provider Input Cards */}
          {PROVIDERS.map((prov) => {
            const val = prov.id === 'gemini' ? geminiKey : prov.id === 'grok' ? grokKey : openaiKey;
            const setVal = prov.id === 'gemini' ? setGeminiKey : prov.id === 'grok' ? setGrokKey : setOpenaiKey;
            const testResult = testingStatus[prov.id];
            const isConfigured = keysConfig?.[prov.id]?.configured;

            return (
              <div
                key={prov.id}
                className="p-4 rounded-2xl border border-neutral-200/90 bg-white hover:border-neutral-300 transition-all shadow-sm"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-neutral-900">{prov.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 border border-neutral-200">
                      {prov.model}
                    </span>
                    {isConfigured && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                        Configured
                      </span>
                    )}
                  </div>

                  <a
                    href={prov.portalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[11px] text-purple-600 hover:text-purple-800 transition-colors font-medium"
                  >
                    <span>Get Key</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <p className="text-[11px] text-neutral-500 mb-2.5">{prov.tagline}</p>

                {/* Input & Action Row */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative flex items-center">
                    <input
                      type={showKeys[prov.id] ? 'text' : 'password'}
                      value={val}
                      onChange={(e) => setVal(e.target.value)}
                      placeholder={prov.placeholder}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-mono text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-purple-500 focus:bg-white transition-all pr-8"
                    />
                    <button
                      type="button"
                      onClick={() => toggleShow(prov.id)}
                      className="absolute right-2.5 text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
                    >
                      {showKeys[prov.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleTestKey(prov.id)}
                    disabled={testResult?.loading || !val}
                    className="px-3 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-medium transition-colors disabled:opacity-40 shrink-0 cursor-pointer flex items-center gap-1.5"
                  >
                    {testResult?.loading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <span>Test</span>
                    )}
                  </button>
                </div>

                {/* Test Feedback */}
                {testResult?.success && (
                  <div className="mt-2 text-[11px] text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{testResult.message}</span>
                  </div>
                )}
                {testResult?.error && (
                  <div className="mt-2 text-[11px] text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{testResult.error}</span>
                  </div>
                )}
              </div>
            );
          })}

          {/* Privacy Notice */}
          <div className="flex items-start gap-2 p-3 rounded-xl bg-neutral-50 text-[11px] text-neutral-500 border border-neutral-200">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              Your API keys are stored locally on your own machine in the backend environment. They are never transmitted to third parties or logged in telemetry.
            </span>
          </div>

          {/* Modal Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full border border-neutral-200 text-neutral-700 hover:bg-neutral-100 transition-colors text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-full bg-neutral-900 hover:bg-black text-white text-xs font-semibold shadow transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>Save & Apply Keys</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
