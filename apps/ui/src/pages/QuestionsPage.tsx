import { useEffect, useState } from 'react';
import { api } from '../api';

type Question = Record<string, unknown>;

export function QuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [search, setSearch] = useState('');
  const [clusters, setClusters] = useState<{ clusterId: string; questionIds: number[] }[]>([]);
  const [message, setMessage] = useState('');

  const load = () => api.getQuestions(search || undefined).then(setQuestions).catch(() => setQuestions([]));

  useEffect(() => { load(); }, [search]);

  const runCluster = async () => {
    const result = await api.clusterQuestions() as { clusterId: string; questionIds: number[] }[];
    setClusters(result.filter((c) => c.questionIds.length > 1));
    setMessage(`Found ${result.filter((c) => c.questionIds.length > 1).length} duplicate question groups.`);
    load();
  };

  return (
    <>
      <div className="page-header">
        <h2>Question Bank</h2>
        <p>Questions encountered across applications. Cluster duplicates to consolidate snippets.</p>
      </div>

      {message && <div className="alert alert-info">{message}</div>}

      <div className="card">
        <div className="search-bar">
          <input placeholder="Search questions…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="btn-row">
          <button className="btn btn-primary" onClick={runCluster}>Cluster Similar Questions</button>
        </div>
      </div>

      {clusters.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: '0.75rem', fontSize: '0.95rem' }}>Duplicate Groups</h3>
          {clusters.map((c) => (
            <div key={c.clusterId} style={{ marginBottom: '0.5rem', fontSize: '0.85rem' }}>
              <span className="badge badge-yellow">{c.clusterId}</span>
              {' '}{c.questionIds.length} similar questions
            </div>
          ))}
        </div>
      )}

      <div className="card">
        {questions.length === 0 ? (
          <div className="empty-state">No questions captured yet. Run an application to start collecting.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Question</th>
                  <th>Category</th>
                  <th>Times Seen</th>
                  <th>Cluster</th>
                </tr>
              </thead>
              <tbody>
                {questions.map((q) => (
                  <tr key={String(q.id)}>
                    <td>{String(q.originalText)}</td>
                    <td><span className="badge badge-gray">{String(q.category ?? 'misc')}</span></td>
                    <td>{String(q.timesSeen ?? 1)}</td>
                    <td>{q.clusterId ? <span className="badge badge-blue">{String(q.clusterId)}</span> : '—'}</td>
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
