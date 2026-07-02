const API = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    try {
      const json = JSON.parse(text) as { message?: string; error?: string };
      throw new Error(json.message ?? json.error ?? text);
    } catch (e) {
      if (e instanceof Error && e.message !== text) throw e;
      throw new Error(text || res.statusText);
    }
  }
  return res.json();
}

export const api = {
  getProfile: () => request<Record<string, unknown>>('/profile'),
  saveProfile: (data: Record<string, unknown>) => request('/profile', { method: 'PUT', body: JSON.stringify(data) }),

  getDocuments: () => request<Record<string, unknown>[]>('/documents'),
  uploadDocument: async (file: File, type: string) => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${API}/documents/upload?type=${type}`, { method: 'POST', body: form });
    return res.json();
  },
  deleteDocument: (id: number) => request(`/documents/${id}`, { method: 'DELETE' }),
  setPrimaryDocument: (id: number) => request(`/documents/${id}/primary`, { method: 'POST' }),
  reindexDocuments: () => request('/documents/reindex', { method: 'POST' }),

  getSnippets: (q?: string) => request<Record<string, unknown>[]>(`/snippets${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  createSnippet: (data: Record<string, unknown>) => request('/snippets', { method: 'POST', body: JSON.stringify(data) }),
  updateSnippet: (id: number, data: Record<string, unknown>) => request(`/snippets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSnippet: (id: number) => request(`/snippets/${id}`, { method: 'DELETE' }),

  getQuestions: (q?: string) => request<Record<string, unknown>[]>(`/questions${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  clusterQuestions: () => request('/questions/cluster', { method: 'POST' }),

  getApplications: () => request<Record<string, unknown>[]>('/applications'),
  getApplication: (id: number) => request(`/applications/${id}`),

  getSettings: () => request<Record<string, string>>('/settings'),
  saveSettings: (data: Record<string, string>) => request('/settings', { method: 'PUT', body: JSON.stringify(data) }),

  testLlm: (prompt?: string) => request('/llm/test', { method: 'POST', body: JSON.stringify({ prompt }) }),
  generateAnswer: (question: string, jobDescription?: string) =>
    request('/llm/generate-answer', { method: 'POST', body: JSON.stringify({ question, jobDescription }) }),

  startRunner: (jobUrl: string) => request('/runner/start', { method: 'POST', body: JSON.stringify({ jobUrl }) }),
  runnerPreflight: () => request<{ ready: boolean; fix?: string; executable?: string }>('/runner/preflight'),
  fillRunner: (fields: Record<string, unknown>[]) => request('/runner/fill', { method: 'POST', body: JSON.stringify({ fields }) }),
  runnerStatus: () => request<{ active: boolean }>('/runner/status'),
  stopRunner: () => request('/runner/stop', { method: 'POST' }),

  getWorkdayAccounts: () => request<Record<string, unknown>[]>('/workday/accounts'),
  saveWorkdayAccount: (data: Record<string, unknown>) => request('/workday/accounts', { method: 'POST', body: JSON.stringify(data) }),

  exportBackup: () => request<{ filepath: string; filename: string }>('/backup/export'),
};
