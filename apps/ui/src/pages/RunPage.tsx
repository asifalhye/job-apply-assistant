import { useEffect, useState } from 'react';
import { api } from '../api';

type Field = {
  id: string;
  label: string;
  type: string;
  required?: boolean;
  proposedValue?: string;
  confidence?: number;
  fillMethod?: string;
  selector?: string;
};

export function RunPage() {
  const [jobUrl, setJobUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [filling, setFilling] = useState(false);
  const [status, setStatus] = useState<{ active: boolean; url?: string; title?: string }>({ active: false });
  const [session, setSession] = useState<{
    applicationId?: number;
    atsType?: string;
    jobInfo?: Record<string, unknown>;
    fields?: Field[];
  } | null>(null);
  const [message, setMessage] = useState('');
  const [fields, setFields] = useState<Field[]>([]);

  const [browserReady, setBrowserReady] = useState<boolean | null>(null);

  useEffect(() => {
    api.runnerPreflight()
      .then((r) => setBrowserReady(r.ready))
      .catch(() => setBrowserReady(false));

    const interval = setInterval(() => {
      api.runnerStatus().then(setStatus).catch(() => setStatus({ active: false }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const start = async () => {
    if (!jobUrl) return;
    setLoading(true);
    setMessage('');
    try {
      const result = await api.startRunner(jobUrl) as {
        applicationId: number;
        atsType: string;
        jobInfo: Record<string, unknown>;
        fields: Field[];
        pageTitle: string;
      };
      setSession(result);
      setFields(result.fields.map((f) => ({ ...f, proposedValue: f.proposedValue ?? '' })));
      setMessage(`Detected ${result.atsType.toUpperCase()} · ${result.fields.length} fields found. Review values below, then click Fill.${(result as { hint?: string }).hint ? ` ${(result as { hint?: string }).hint}` : ''}`);
    } catch (e) {
      setMessage(`Error: ${e}`);
    } finally {
      setLoading(false);
    }
  };

  const fill = async () => {
    setFilling(true);
    setMessage('');
    try {
      const result = await api.fillRunner(fields) as { results: unknown[]; message: string };
      setMessage(result.message);
    } catch (e) {
      setMessage(`Fill error: ${e}`);
    } finally {
      setFilling(false);
    }
  };

  const generateForField = async (index: number) => {
    const field = fields[index];
    try {
      const result = await api.generateAnswer(field.label) as { answer: string; confidence: number };
      const updated = [...fields];
      updated[index] = { ...field, proposedValue: result.answer, confidence: result.confidence, fillMethod: 'generated' };
      setFields(updated);
    } catch (e) {
      setMessage(`Generate error: ${e}`);
    }
  };

  const updateField = (index: number, value: string) => {
    const updated = [...fields];
    updated[index] = { ...updated[index], proposedValue: value };
    setFields(updated);
  };

  const stop = async () => {
    await api.stopRunner();
    setSession(null);
    setFields([]);
    setStatus({ active: false });
    setMessage('Browser session stopped.');
  };

  return (
    <>
      <div className="page-header">
        <h2>Run Application</h2>
        <p>Paste a job URL, review proposed values, fill the form. Auto-submit is disabled.</p>
      </div>

      <div className="alert alert-warning">
        CAPTCHA, MFA, and bot checks require manual completion. The tool will pause — complete verification in the browser, then continue.
      </div>

      {browserReady === false && (
        <div className="alert alert-error">
          Playwright Chromium is not installed. In Terminal, run:{' '}
          <code>npm run playwright:install</code> — then restart with <code>npm run dev</code>.
        </div>
      )}

      <div className="card">
        <div style={{ marginBottom: '0.75rem' }}>
          <span className={`status-dot ${status.active ? 'active' : 'inactive'}`} />
          {status.active ? `Browser active: ${status.title ?? status.url}` : 'No active browser session'}
        </div>
        <div className="form-group">
          <label>Job Application URL</label>
          <input
            value={jobUrl}
            onChange={(e) => setJobUrl(e.target.value)}
            placeholder="https://boards.greenhouse.io/company/jobs/12345"
          />
        </div>
        <div className="btn-row">
          <button className="btn btn-primary" onClick={start} disabled={loading || !jobUrl}>
            {loading ? 'Opening…' : 'Start & Extract Fields'}
          </button>
          {status.active && (
            <>
              <button className="btn btn-primary" onClick={fill} disabled={filling || fields.length === 0}>
                {filling ? 'Filling…' : 'Fill Form'}
              </button>
              <button className="btn btn-secondary" onClick={stop}>Stop Browser</button>
            </>
          )}
        </div>
      </div>

      {message && <div className="alert alert-info">{message}</div>}

      {session && (
        <div className="card">
          <h3 style={{ marginBottom: '0.5rem' }}>
            {String(session.jobInfo?.company ?? 'Unknown')} — {String(session.jobInfo?.roleTitle ?? 'Role')}
          </h3>
          <span className="badge badge-blue">{String(session.atsType)}</span>
        </div>
      )}

      {fields.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: '1rem', fontSize: '0.95rem' }}>Field Review ({fields.length})</h3>
          {fields.map((field, i) => (
            <div key={field.id} style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <span className="field-label">{field.label}</span>
                <span className="field-meta">
                  {field.type}
                  {field.required && ' · required'}
                  {field.fillMethod && ` · ${field.fillMethod}`}
                  {field.confidence ? ` · ${Math.round(field.confidence * 100)}%` : ''}
                </span>
              </div>
              {field.type === 'textarea' || (field.proposedValue && field.proposedValue.length > 80) ? (
                <textarea
                  value={field.proposedValue ?? ''}
                  onChange={(e) => updateField(i, e.target.value)}
                  rows={4}
                />
              ) : (
                <input
                  value={field.proposedValue ?? ''}
                  onChange={(e) => updateField(i, e.target.value)}
                />
              )}
              {field.fillMethod === 'needs-generation' && (
                <button className="btn btn-secondary" style={{ marginTop: '0.35rem' }} onClick={() => generateForField(i)}>
                  Generate Answer
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
