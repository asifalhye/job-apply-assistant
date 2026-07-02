chrome.runtime.sendMessage({ type: 'check-connection' }, (res) => {
  const el = document.getElementById('status');
  if (el) {
    el.textContent = res?.connected ? 'Connected to local app' : 'Local app not running';
    el.className = res?.connected ? 'connected' : 'disconnected';
  }
});

document.getElementById('toggle')?.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'toggle-sidebar' });
  }
});

document.getElementById('observe')?.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'toggle-sidebar' });
    setTimeout(() => {
      chrome.tabs.sendMessage(tab.id, { type: 'observe' });
    }, 500);
  }
});
