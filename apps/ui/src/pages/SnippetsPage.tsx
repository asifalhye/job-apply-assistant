import { useEffect, useState } from 'react';
import { api } from '../api';

type Snippet = Record<string, unknown>;

const CATEGORIES = ['misc', 'behavioral', 'why-company', 'why-role', 'technical', 'cover-letter', 'work-auth', 'salary'];

export function SnippetsPage() {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Snippet | null>(null);
  const [testQuestion, setTestQuestion] = useState('');
  const [generated, setGenerated] = useState('');
  const [message, setMessage] = useState('');

  const load = () => api.getSnippets(search || undefined).then(setSnippets).catch(() => setSnippets([]));

  useEffect(() => { load(); }, [search]);

  const save = async () => {
    if (!editing) return;
    if (editing.id) {
      await api.updateSnippet(Number(editing.id), editing);
    } else {
      await api.createSnippet(editing);
    }
    setEditing(null);
    load();
  };

  const remove = async (id: number) => {
    await api.deleteSnippet(id);
    load();
  };

  const generate = async () => {
    if (!testQuestion) return;
    setMessage('Generating…');
    try {
      const result = await api.generateAnswer(testQuestion) as { answer: string; confidence: number; sources: unknown[] };
      setGenerated(result.answer);
      setMessage(`Confidence: ${Math.round(result.confidence * 100)}% · Sources: ${result.sources.length}`);
    } catch (e) {
      setMessage(`Error: ${e}`);
    }
  };

  return (
    <>
      <div className="page-header">
        <h2>Snippets</h2>
        <p>Reusable answers for common application questions.</p>
      </div>

      {message && <div className="alert alert-info">{message}</div>}

      <div className="card">
        <h3 style={{ marginBottom: '0.75rem', fontSize: '0.95rem' }}>Test Answer Generation</h3>
        <div className="form-group">
          <label>Question</label>
          <input value={testQuestion} onChange={(e) => setTestQuestion(e.target.value)} placeholder="Tell us about a time you led a team…" />
        </div>
        <div className="btn-row">
          <button className="btn btn-primary" onClick={generate}>Generate Answer</button>
        </div>
        {generated && (
          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label>Generated Answer</label>
            <textarea value={generated} readOnly rows={6} />
          </div>
        )}
      </div>

      <div className="card">
        <div className="search-bar">
          <input placeholder="Search snippets…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="btn-row">
          <button className="btn btn-primary" onClick={() => setEditing({ title: '', body: '', category: 'misc', tags: [] })}>
            New Snippet
          </button>
        </div>
      </div>

      {editing && (
        <div className="card">
          <div className="form-group">
            <label>Title</label>
            <input value={String(editing.title ?? '')} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Category</label>
            <select value={String(editing.category ?? 'misc')} onChange={(e) => setEditing({ ...editing, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Body</label>
            <textarea value={String(editing.body ?? '')} onChange={(e) => setEditing({ ...editing, body: e.target.value })} rows={8} />
          </div>
          <div className="btn-row">
            <button className="btn btn-primary" onClick={save}>Save</button>
            <button className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="card">
        {snippets.length === 0 ? (
          <div className="empty-state">No snippets yet.</div>
        ) : (
          snippets.map((s) => (
            <div key={String(s.id)} style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <strong>{String(s.title)}</strong>
                  <span className="badge badge-gray" style={{ marginLeft: '0.5rem' }}>{String(s.category)}</span>
                  {typeof s.sourceType === 'string' && s.sourceType !== 'user' && (
                    <span className="badge badge-yellow" style={{ marginLeft: '0.25rem' }}>{String(s.sourceType)}</span>
                  )}
                </div>
                <div className="btn-row" style={{ marginTop: 0 }}>
                  <button className="btn btn-secondary" onClick={() => setEditing(s)}>Edit</button>
                  <button className="btn btn-danger" onClick={() => remove(Number(s.id))}>Delete</button>
                </div>
              </div>
              <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: '0.35rem' }}>
                {String(s.body).slice(0, 200)}{String(s.body).length > 200 ? '…' : ''}
              </p>
            </div>
          ))
        )}
      </div>
    </>
  );
}
