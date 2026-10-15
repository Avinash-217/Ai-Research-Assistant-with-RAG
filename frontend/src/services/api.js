/**
 * API Client for AI Research Assistant
 */

const API_BASE = '/api';

export async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return { status: 'error', message: err.message };
  }
}

export async function getDocuments() {
  const res = await fetch(`${API_BASE}/documents`);
  if (!res.ok) throw new Error(`Failed to fetch documents: HTTP ${res.status}`);
  return await res.json();
}

export async function getDocumentDetails(docId) {
  const res = await fetch(`${API_BASE}/documents/${docId}`);
  if (!res.ok) throw new Error(`Failed to fetch document details: HTTP ${res.status}`);
  return await res.json();
}

export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/documents/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Upload failed: HTTP ${res.status}`);
  }
  return await res.json();
}

export async function deleteDocument(docId) {
  const res = await fetch(`${API_BASE}/documents/${docId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`Failed to delete document: HTTP ${res.status}`);
  return await res.json();
}

export async function sendChatQuery({ question, sessionId, documentIds, mode, topK }) {
  const res = await fetch(`${API_BASE}/chat/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question,
      session_id: sessionId,
      document_ids: documentIds,
      mode: mode || 'rag',
      top_k: topK || 5,
    }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Chat query failed: HTTP ${res.status}`);
  }
  return await res.json();
}

export async function getChatSessions() {
  const res = await fetch(`${API_BASE}/chat/sessions`);
  if (!res.ok) throw new Error(`Failed to fetch sessions: HTTP ${res.status}`);
  return await res.json();
}

export async function getComparisonMatrix(documentIds) {
  const res = await fetch(`${API_BASE}/features/matrix`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ document_ids: documentIds }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Matrix generation failed: HTTP ${res.status}`);
  }
  return await res.json();
}

export async function getLiteratureReview(documentIds, focusTopic = '') {
  const res = await fetch(`${API_BASE}/features/lit-review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ document_ids: documentIds, focus_topic: focusTopic }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Literature review generation failed: HTTP ${res.status}`);
  }
  return await res.json();
}

export async function runEvaluationSuite(testSuiteName = 'Standard RAG Benchmark') {
  const res = await fetch(`${API_BASE}/eval/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ test_suite_name: testSuiteName }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Evaluation run failed: HTTP ${res.status}`);
  }
  return await res.json();
}

export async function getEvaluationRuns() {
  const res = await fetch(`${API_BASE}/eval/runs`);
  if (!res.ok) throw new Error(`Failed to fetch eval runs: HTTP ${res.status}`);
  return await res.json();
}

export async function sendChatQueryStream({
  question,
  sessionId,
  documentIds,
  mode,
  topK,
  onToken,
  onDone,
  onError,
}) {
  try {
    const res = await fetch(`${API_BASE}/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        session_id: sessionId,
        document_ids: documentIds,
        mode: mode || 'rag',
        top_k: topK || 5,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `Stream failed: HTTP ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() || '';

      for (const part of parts) {
        const line = part.trim();
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'token') {
              if (onToken) onToken(data.token);
            } else if (data.type === 'done') {
              if (onDone) onDone(data);
            }
          } catch (e) {
            console.error('Error parsing SSE block', e);
          }
        }
      }
    }
  } catch (err) {
    if (onError) onError(err);
    else throw err;
  }
}

export async function getApiKeys() {
  const res = await fetch(`${API_BASE}/settings/keys`);
  if (!res.ok) throw new Error(`Failed to fetch API keys: HTTP ${res.status}`);
  return await res.json();
}

export async function updateApiKeys(keysData) {
  const res = await fetch(`${API_BASE}/settings/keys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(keysData),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Failed to update API keys: HTTP ${res.status}`);
  }
  return await res.json();
}

export async function testApiKey(provider, apiKey) {
  const res = await fetch(`${API_BASE}/settings/keys/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, api_key: apiKey }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Validation call failed: HTTP ${res.status}`);
  }
  return await res.json();
}

