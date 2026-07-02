import { useEffect, useState } from 'react';
import { api } from '../api';

type Doc = Record<string, unknown>;

export function DocumentsPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [uploadType, setUploadType] = useState('resume');
  const [message, setMessage] = useState('');

  const load = () => api.getDocuments().then(setDocs).catch(() => setDocs([]));

  useEffect(() => { load(); }, []);

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMessage('');
    try {
      await api.uploadDocument(file, uploadType);
      setMessage(`Uploaded ${file.name}`);
      load();
    } catch (err) {
      setMessage(`Upload failed: ${err}`);
    }
    e.target.value = '';
  };

  const remove = async (id: number) => {
    await api.deleteDocument(id);
    load();
  };

  const setPrimary = async (id: number) => {
    await api.setPrimaryDocument(id);
    load();
  };

  const reindex = async () => {
    const result = await api.reindexDocuments() as { indexed: number };
    setMessage(`Reindexed ${result.indexed} documents for RAG search.`);
  };

  return (
    <>
      <div className="page-header">
        <h2>Documents</h2>
        <p>Upload resumes and cover letters. Parsed text powers answer generation.</p>
      </div>

      {message && <div className="alert alert-info">{message}</div>}

      <div className="card">
        <div className="form-group" style={{ maxWidth: 300 }}>
          <label>Document type</label>
          <select value={uploadType} onChange={(e) => setUploadType(e.target.value)}>
            <option value="resume">Resume</option>
            <option value="cover_letter">Cover Letter</option>
            <option value="portfolio">Portfolio</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="btn-row">
          <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
            Upload File
            <input type="file" accept=".pdf,.docx,.txt,.doc" onChange={upload} hidden />
          </label>
          <button className="btn btn-secondary" onClick={reindex}>Reindex for RAG</button>
        </div>
      </div>

      <div className="card">
        {docs.length === 0 ? (
          <div className="empty-state">No documents yet. Upload your resume to get started.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Primary</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => (
                  <tr key={String(d.id)}>
                    <td>{String(d.name)}</td>
                    <td><span className="badge badge-blue">{String(d.type)}</span></td>
                    <td>{d.isPrimary ? <span className="badge badge-green">Primary</span> : '—'}</td>
                    <td>
                      <div className="btn-row" style={{ marginTop: 0 }}>
                        {!d.isPrimary && (
                          <button className="btn btn-secondary" onClick={() => setPrimary(Number(d.id))}>Set Primary</button>
                        )}
                        <button className="btn btn-danger" onClick={() => remove(Number(d.id))}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
