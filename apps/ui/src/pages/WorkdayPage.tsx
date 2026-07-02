import { useEffect, useState } from 'react';
import { api } from '../api';

type Account = Record<string, unknown>;

export function WorkdayPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [form, setForm] = useState({ tenantId: '', companyName: '', email: '', password: '' });
  const [message, setMessage] = useState('');

  const load = () => api.getWorkdayAccounts().then(setAccounts).catch(() => setAccounts([]));

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.tenantId || !form.email) {
      setMessage('Tenant ID and email are required.');
      return;
    }
    try {
      await api.saveWorkdayAccount(form);
      setMessage('Workday account saved.');
      setForm({ tenantId: '', companyName: '', email: '', password: '' });
      load();
    } catch (e) {
      setMessage(`Error: ${e}`);
    }
  };

  return (
    <>
      <div className="page-header">
        <h2>Workday Accounts</h2>
        <p>Track per-company Workday tenants so you don't recreate accounts every time.</p>
      </div>

      <div className="alert alert-info">
        Credentials are encrypted locally. CAPTCHA/MFA still requires manual completion in the browser.
      </div>

      {message && <div className="alert alert-success">{message}</div>}

      <div className="card">
        <h3 style={{ marginBottom: '0.75rem', fontSize: '0.95rem' }}>Add Workday Account</h3>
        <div className="form-grid">
          <div className="form-group">
            <label>Tenant ID (from URL)</label>
            <input
              value={form.tenantId}
              onChange={(e) => setForm({ ...form, tenantId: e.target.value })}
              placeholder="e.g. companyname from myworkdayjobs.com/companyname"
            />
          </div>
          <div className="form-group">
            <label>Company Name</label>
            <input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
        </div>
        <div className="btn-row">
          <button className="btn btn-primary" onClick={save}>Save Account</button>
        </div>
      </div>

      <div className="card">
        {accounts.length === 0 ? (
          <div className="empty-state">No Workday accounts saved yet.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Company</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Last Used</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={String(a.id)}>
                    <td>{String(a.tenantId)}</td>
                    <td>{String(a.companyName ?? '—')}</td>
                    <td>{String(a.email ?? '—')}</td>
                    <td><span className="badge badge-gray">{String(a.accountStatus ?? 'unknown')}</span></td>
                    <td>{String(a.lastUsedAt ?? '—').slice(0, 10)}</td>
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
