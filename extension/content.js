const PANEL_ID = 'jaa-sidebar';

function extractFields() {
  const fields = [];
  const inputs = document.querySelectorAll('input, textarea, select');

  inputs.forEach((el) => {
    const input = el;
    const type = input.getAttribute('type') ?? input.tagName.toLowerCase();
    if (type === 'hidden') return;

    let label = input.getAttribute('aria-label') ?? '';
    if (!label && input.id) {
      const labelEl = document.querySelector(`label[for="${input.id}"]`);
      label = labelEl?.textContent?.trim() ?? input.name ?? input.id;
    }
    if (!label) label = input.name ?? input.id ?? 'unknown';

    let value = '';
    if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
      value = input.value;
    } else if (input instanceof HTMLSelectElement) {
      value = input.options[input.selectedIndex]?.text ?? '';
    }

    fields.push({ label, value, type });
  });

  return fields;
}

function ensureSidebar() {
  if (document.getElementById(PANEL_ID)) return;

  const panel = document.createElement('div');
  panel.id = PANEL_ID;
  panel.innerHTML = `
    <div class="jaa-header">
      <strong>Job Apply Assistant</strong>
      <button id="jaa-close">×</button>
    </div>
    <div id="jaa-status" class="jaa-status">Checking connection…</div>
    <div id="jaa-actions">
      <button id="jaa-observe">Capture Questions</button>
      <button id="jaa-suggest">Suggest for Focused Field</button>
    </div>
    <div id="jaa-result"></div>
  `;
  document.body.appendChild(panel);

  document.getElementById('jaa-close')?.addEventListener('click', () => panel.remove());
  document.getElementById('jaa-observe')?.addEventListener('click', observeFields);
  document.getElementById('jaa-suggest')?.addEventListener('click', suggestForFocused);
}

function updateStatus(text, ok) {
  const el = document.getElementById('jaa-status');
  if (el) {
    el.textContent = text;
    el.className = `jaa-status ${ok ? 'connected' : 'disconnected'}`;
  }
}

function observeFields() {
  const fields = extractFields();
  chrome.runtime.sendMessage(
    { type: 'observe-fields', url: location.href, fields },
    (res) => {
      const el = document.getElementById('jaa-result');
      if (el) el.textContent = res?.observed ? `Captured ${res.observed} fields.` : `Error: ${res?.error ?? 'unknown'}`;
    }
  );
}

function suggestForFocused() {
  const active = document.activeElement;
  if (!active) return;

  let label = active.getAttribute('aria-label') ?? '';
  if (!label && active.id) {
    const labelEl = document.querySelector(`label[for="${active.id}"]`);
    label = labelEl?.textContent?.trim() ?? active.id;
  }

  chrome.runtime.sendMessage({ type: 'suggest-answer', label }, (res) => {
    const el = document.getElementById('jaa-result');
    if (el) {
      if (res?.answer) {
        el.textContent = res.answer;
        if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
          active.value = res.answer;
        }
      } else {
        el.textContent = res?.error ?? 'No suggestion available.';
      }
    }
  });
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'toggle-sidebar') {
    if (document.getElementById(PANEL_ID)) {
      document.getElementById(PANEL_ID)?.remove();
    } else {
      ensureSidebar();
      chrome.runtime.sendMessage({ type: 'check-connection' }, (res) => {
        updateStatus(res?.connected ? 'Connected to local app' : 'Local app not running', res?.connected);
      });
    }
  }
});

document.addEventListener('focusin', (e) => {
  const target = e.target;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
  if (target.value.length > 20) return;

  let label = target.getAttribute('aria-label') ?? '';
  if (!label && target.id) {
    const labelEl = document.querySelector(`label[for="${target.id}"]`);
    label = labelEl?.textContent?.trim() ?? target.id;
  }

  if (label.length > 10) {
    chrome.runtime.sendMessage({ type: 'observe-fields', url: location.href, fields: [{ label, value: target.value, type: target.type }] });
  }
});
