import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [message, setMessage] = useState('');

  const steps = ['Profile', 'Resume', 'LLM Setup', 'Done'];

  const next = async () => {
    setMessage('');
    if (step === 0) {
      try {
        await api.saveProfile(profile);
        setStep(1);
      } catch (e) {
        setMessage(`Error: ${e}`);
      }
    } else if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      await api.saveSettings({ llm_mode: 'balanced' });
      setStep(3);
    } else {
      localStorage.setItem('jaa_onboarding_complete', 'true');
      navigate('/run');
    }
  };

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await api.uploadDocument(file, 'resume');
    setMessage(`Uploaded ${file.name}`);
  };

  return (
    <div className="onboarding">
      <h1 style={{ marginBottom: '0.5rem' }}>Welcome to Job Apply Assistant</h1>
      <p style={{ color: 'var(--muted)', marginBottom: '2rem' }}>Let's set up your profile in a few steps.</p>

      <div className="onboarding-steps">
        {steps.map((_, i) => (
          <div key={i} className={`step-dot${i <= step ? ' done' : ''}${i === step ? ' current' : ''}`} />
        ))}
      </div>

      {message && <div className="alert alert-info">{message}</div>}

      <div className="card">
        {step === 0 && (
          <>
            <h3 style={{ marginBottom: '1rem' }}>Step 1: Basic Profile</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>First Name</label>
                <input value={profile.firstName} onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input value={profile.lastName} onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
              </div>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h3 style={{ marginBottom: '1rem' }}>Step 2: Upload Resume</h3>
            <p style={{ color: 'var(--muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
              Your resume powers answer generation and form filling.
            </p>
            <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
              Upload Resume (PDF/DOCX)
              <input type="file" accept=".pdf,.docx" onChange={upload} hidden />
            </label>
          </>
        )}

        {step === 2 && (
          <>
            <h3 style={{ marginBottom: '1rem' }}>Step 3: LLM Setup</h3>
            <p style={{ color: 'var(--muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
              Add API keys in Settings later, or use local Ollama. Balanced mode is selected by default.
            </p>
            <p style={{ fontSize: '0.85rem' }}>
              Supported: OpenAI (ChatGPT), Anthropic (Claude), Ollama (local/free).
            </p>
          </>
        )}

        {step === 3 && (
          <>
            <h3 style={{ marginBottom: '1rem' }}>You're Ready!</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
              Go to Run Application, paste a Greenhouse or Ashby job URL, and let the tool extract and fill fields.
            </p>
          </>
        )}

        <div className="btn-row">
          {step > 0 && step < 3 && (
            <button className="btn btn-secondary" onClick={() => setStep(step - 1)}>Back</button>
          )}
          <button className="btn btn-primary" onClick={next}>
            {step === 3 ? 'Go to Run Application' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
