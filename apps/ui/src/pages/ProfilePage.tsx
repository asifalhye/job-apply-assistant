import { useEffect, useState } from 'react';
import { api } from '../api';

type Profile = Record<string, unknown>;

const FIELDS: { key: string; label: string; type?: string }[] = [
  { key: 'firstName', label: 'First Name' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'phone', label: 'Phone', type: 'tel' },
  { key: 'linkedinUrl', label: 'LinkedIn URL', type: 'url' },
  { key: 'githubUrl', label: 'GitHub URL', type: 'url' },
  { key: 'portfolioUrl', label: 'Portfolio URL', type: 'url' },
  { key: 'websiteUrl', label: 'Website URL', type: 'url' },
  { key: 'addressLine1', label: 'Address Line 1' },
  { key: 'addressLine2', label: 'Address Line 2' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'zipCode', label: 'Zip Code' },
  { key: 'country', label: 'Country' },
  { key: 'pronouns', label: 'Pronouns' },
  { key: 'workAuthorization', label: 'Work Authorization' },
  { key: 'requiresSponsorship', label: 'Requires Sponsorship', type: 'checkbox' },
  { key: 'salaryMin', label: 'Minimum Salary', type: 'number' },
  { key: 'salaryMax', label: 'Maximum Salary', type: 'number' },
  { key: 'earliestStartDate', label: 'Earliest Start Date', type: 'date' },
  { key: 'willingToRelocate', label: 'Willing to Relocate', type: 'checkbox' },
];

export function ProfilePage() {
  const [profile, setProfile] = useState<Profile>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.getProfile().then((p) => setProfile(p ?? {})).catch(() => setProfile({}));
  }, []);

  const update = (key: string, value: unknown) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    setSaving(true);
    setMessage('');
    try {
      const saved = await api.saveProfile(profile);
      setProfile(saved as Profile);
      setMessage('Profile saved.');
    } catch (e) {
      setMessage(`Error: ${e}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <h2>Profile</h2>
        <p>Your personal info used to auto-fill application forms.</p>
      </div>

      {message && <div className="alert alert-success">{message}</div>}

      <div className="card">
        <div className="form-grid">
          {FIELDS.map(({ key, label, type }) => (
            <div key={key} className="form-group">
              <label htmlFor={key}>{label}</label>
              {type === 'checkbox' ? (
                <input
                  id={key}
                  type="checkbox"
                  checked={!!profile[key]}
                  onChange={(e) => update(key, e.target.checked)}
                />
              ) : (
                <input
                  id={key}
                  type={type ?? 'text'}
                  value={String(profile[key] ?? '')}
                  onChange={(e) => update(key, type === 'number' ? Number(e.target.value) : e.target.value)}
                />
              )}
            </div>
          ))}
        </div>
        <div className="btn-row">
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save Profile'}
          </button>
        </div>
      </div>
    </>
  );
}
