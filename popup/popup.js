document.getElementById('saveKey').addEventListener('click', () => {
  const key = document.getElementById('apiKey').value.trim();
  if (!key) {
    alert('Please enter an API key');
    return;
  }
  chrome.storage.local.set({ flashApiKey: key }, () => {
    alert('API Key saved successfully!');
  });
});

document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get('flashApiKey', ({ flashApiKey }) => {
    if (flashApiKey) {
      document.getElementById('apiKey').value = flashApiKey;
    }
  });
});
