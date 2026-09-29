const statusPill   = document.getElementById('statusPill');
const statusText   = document.getElementById('statusText');
const volumeCount  = document.getElementById('volumeCount');
const resumeCount  = document.getElementById('resumeCount');
const consoleBox   = document.getElementById('consoleBox');
const clearBtn     = document.getElementById('clearBtn');
const hint         = document.getElementById('hint');

function formatTime(ts) {
    const d = new Date(ts);
    return [d.getHours(), d.getMinutes(), d.getSeconds()]
        .map(n => String(n).padStart(2, '0')).join(':');
}

function renderLogs(logs) {
    if (!logs || logs.length === 0) {
        consoleBox.innerHTML = `<div class="empty-console">no logs yet<br>refresh your spotify tab</div>`;
        return;
    }

    consoleBox.innerHTML = logs.map(log => `
      <div class="log-line">
        <span class="log-time">${formatTime(log.timestamp)}</span>
        <span class="log-badge ${log.type}">${log.type.toUpperCase()}</span>
        <span class="log-msg ${log.type}">${log.message}</span>
      </div>
    `).join('');

    consoleBox.scrollTop = consoleBox.scrollHeight;
}

function updateUI(data) {
    const stats = data.stats || { volumeBlocks: 0, discordResumes: 0, active: false };
    const logs  = data.logs  || [];

    if (stats.active) {
        statusPill.classList.add('active');
        statusPill.classList.remove('inactive');
        statusText.textContent = 'active';
        hint.classList.add('hidden');
    } else {
        statusPill.classList.remove('active');
        statusPill.classList.add('inactive');
        statusText.textContent = 'inactive';
        hint.classList.remove('hidden');
    }

    volumeCount.textContent = stats.volumeBlocks;
    resumeCount.textContent = stats.discordResumes;
    renderLogs(logs);
}

chrome.storage.local.get(['logs', 'stats'], updateUI);
setInterval(() => {
    chrome.storage.local.get(['logs', 'stats'], updateUI);
}, 1500);
clearBtn.addEventListener('click', () => {
    chrome.storage.local.set(
        { logs: [], stats: { volumeBlocks: 0, discordResumes: 0, active: false } },
        () => updateUI({ logs: [], stats: { volumeBlocks: 0, discordResumes: 0, active: false } })
    );
});
