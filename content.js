// This script runs in the isolated extension context.
// 1. Inject the main script into the page's real JS context (to override native APIs)
// 2. Listen for log messages from inject.js and relay them to chrome.storage

const script = document.createElement('script');
script.src = chrome.runtime.getURL('inject.js');
script.onload = function() { this.remove(); };
(document.head || document.documentElement).appendChild(script);
window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (!event.data || event.data.source !== 'spotify-ex-enhancer') return;

    const { type, message, timestamp } = event.data;
    chrome.storage.local.get(['logs', 'stats'], (data) => {
        const logs = data.logs || [];
        const stats = data.stats || { volumeBlocks: 0, discordResumes: 0, active: false };

        logs.push({ type, message, timestamp });
        if (logs.length > 100) logs.splice(0, logs.length - 100);

        if (type === 'block') stats.volumeBlocks++;
        if (type === 'resume') stats.discordResumes++;
        if (type === 'info' && message.includes('injected')) stats.active = true;

        chrome.storage.local.set({ logs, stats });
    });
});
