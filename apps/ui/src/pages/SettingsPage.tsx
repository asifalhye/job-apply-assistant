import { useEffect, useState } from 'react';
import { api } from '../api';

export function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [testResult, setTestResult] = useState('');

  useEffect(() => {
    api.getSettings().then(setSettings).catch(() => setSettings({}));
  }, []);

  const update = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    setMessage('');
    try {
      await api.saveSettings(settings);
      setMessage('Settings saved.');
    } catch (e) {
      setMessage(`Error: ${e}`);
    }
  };

  const testLlm = async () => {
    setTestResult('Testing…');
    try {
      const result = await api.testLlm('Say hello in one sentence.') as { text: string };
      setTestResult(result.text);
    } catch (e) {
      setTestResult(`Failed: ${e}`);
    }
  };

  const exportBackup = async () => {
    try {
      const result = await api.exportBackup();
      setMessage(`Backup saved: ${result.filename}${result.recordCounts ? ` (${JSON.stringify(result.recordCounts)})` : ''}`);
    } catch (e) {
      setMessage(`Export failed: ${e}`);
    }
  };

  return (
    <>
      <div className="page-header">
        <h2>Settings</h2>
        <p>Configure LLM providers and manage your data.</p>
      </div>

      {message && <div className="alert alert-success">{message}</div>}

      <div className="card">
        <h3 style={{ marginBottom: '0.75rem', fontSize: '0.95rem' }}>LLM Mode</h3>
        <div className="form-grid">
          <div className="form-group">
            <label>Mode</label>
            <select value={settings.llm_mode ?? 'balanced'} onChange={(e) => update('llm_mode', e.target.value)}>
              <option value="local-only">Local Only (Ollama)</option>
              <option value="balanced">Balanced (cheap classify + strong generate)</option>
              <option value="quality">Quality (best model for everything)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '0.75rem', fontSize: '0.95rem' }}>API Keys</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '1rem' }}>
          Keys are encrypted locally. Leave blank to keep existing value (shown as ***set***).
        </p>
        <div className="form-grid">
          <div className="form-group">
            <label>OpenAI API Key</label>
            <input
              type="password"
              placeholder={settings.openai_api_key === '***set***' ? '***set***' : 'sk-…'}
              onChange={(e) => update('openai_api_key', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Anthropic API Key</label>
            <input
              type="password"
              placeholder={settings.anthropic_api_key === '***set***' ? '***set***' : 'sk-ant-…'}
              onChange={(e) => update('anthropic_api_key', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Ollama Base URL</label>
            <input
              value={settings.ollama_base_url ?? 'http://localhost:11434'}
              onChange={(e) => update('ollama_base_url', e.target.value)}
            />
          </div>
        </div>
        <div className="btn-row">
          <button className="btn btn-primary" onClick={save}>Save Settings</button>
          <button className="btn btn-secondary" onClick={testLlm}>Test LLM</button>
        </div>
        {testResult && <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--muted)' }}>{testResult}</p>}
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '0.75rem', fontSize: '0.95rem' }}>Data Management</h3>
        <div className="btn-row">
          <button className="btn btn-secondary" onClick={exportBackup}>Export Backup (JSON)</button>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.75rem' }}>
          Backups are saved to ./data/backups/
        </p>
      </div>
    </>
  );
}
