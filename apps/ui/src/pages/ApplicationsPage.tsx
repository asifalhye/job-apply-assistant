import { useEffect, useState } from 'react';
import { api } from '../api';

type App = Record<string, unknown>;

export function ApplicationsPage() {
  const [apps, setApps] = useState<App[]>([]);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);

  const load = () => api.getApplications().then(setApps).catch(() => setApps([]));

  useEffect(() => { load(); }, []);

  const viewDetail = async (id: number) => {
    const detail = await api.getApplication(id);
    setSelected(detail as Record<string, unknown>);
  };

  return (
    <>
      <div className="page-header">
        <h2>Applications</h2>
        <p>History of jobs you've applied to with this tool.</p>
      </div>

      <div className="card">
        {apps.length === 0 ? (
          <div className="empty-state">No applications yet. Use Run Application to start.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Role</th>
                  <th>ATS</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {apps.map((a) => (
                  <tr key={String(a.id)}>
                    <td>{String(a.company ?? '—')}</td>
                    <td>{String(a.roleTitle ?? '—')}</td>
                    <td><span className="badge badge-blue">{String(a.atsType ?? 'unknown')}</span></td>
                    <td><span className="badge badge-gray">{String(a.status ?? 'draft')}</span></td>
                    <td>{String(a.createdAt ?? '').slice(0, 10)}</td>
                    <td>
                      <button className="btn btn-secondary" onClick={() => viewDetail(Number(a.id))}>Details</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3>{String(selected.company)} — {String(selected.roleTitle)}</h3>
            <button className="btn btn-secondary" onClick={() => setSelected(null)}>Close</button>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '1rem' }}>
            {String(selected.jobUrl)}
          </p>
          {Array.isArray(selected.fields) && selected.fields.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>Value</th>
                    <th>Method</th>
                    <th>Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {(selected.fields as Record<string, unknown>[]).map((f, i) => (
                    <tr key={i}>
                      <td>{String(f.fieldLabel)}</td>
                      <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {String(f.finalValue ?? f.proposedValue ?? '').slice(0, 100)}
                      </td>
                      <td>{String(f.fillMethod ?? '—')}</td>
                      <td>{f.confidence ? `${Math.round(Number(f.confidence) * 100)}%` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: 'var(--muted)' }}>No field data recorded.</p>
          )}
        </div>
      )}
    </>
  );
}
