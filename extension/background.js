const API_BASE = 'http://localhost:3001';

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'check-connection') {
    fetch(`${API_BASE}/extension/health`)
      .then((r) => r.json())
      .then((data) => sendResponse({ connected: data.connected }))
      .catch(() => sendResponse({ connected: false }));
    return true;
  }

  if (msg.type === 'observe-fields') {
    fetch(`${API_BASE}/extension/observe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: msg.url, fields: msg.fields }),
    })
      .then((r) => r.json())
      .then(sendResponse)
      .catch((e) => sendResponse({ error: String(e) }));
    return true;
  }

  if (msg.type === 'suggest-answer') {
    fetch(`${API_BASE}/extension/suggest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: msg.label, jobDescription: msg.jobDescription }),
    })
      .then((r) => r.json())
      .then(sendResponse)
      .catch((e) => sendResponse({ error: String(e) }));
    return true;
  }
});
