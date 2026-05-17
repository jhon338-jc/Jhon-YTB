let selectedType = 'mp4';
let currentVideoData = null;

document.addEventListener('DOMContentLoaded', () => {
    const user = localStorage.getItem('jhon_user');
    const profileName = document.getElementById('profileName');
    const profileAvatar = document.getElementById('profileAvatar');
    
    if (!user && window.location.pathname.includes('dashboard.html')) {
        window.location.href = 'index.html';
    }
    
    if (profileName && user) {
        profileName.textContent = user.toUpperCase();
    }
    
    if (profileAvatar) {
        profileAvatar.src = 'https://i.pinimg.com/736x/ea/fb/1a/eafb1a29da1c80bfe124d60d7f9a58ed.jpg';
    }
    
    loadHistory();
});

function logout() {
    localStorage.removeItem('jhon_user');
    window.location.href = 'index.html';
}

function selectType(type) {
    selectedType = type;
    document.querySelectorAll('.type-option').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`.type-option[data-type="${type}"]`).classList.add('active');
}

async function pasteLink() {
    try {
        const text = await navigator.clipboard.readText();
        document.getElementById('urlInput').value = text;
    } catch (err) {
        alert('Gagal mengambil clipboard');
    }
}

function clearLink() {
    document.getElementById('urlInput').value = '';
}

async function convertVideo() {
    const url = document.getElementById('urlInput').value.trim();
    if (!url) {
        alert('Masukkan link YouTube dulu!');
        return;
    }
    
    const convertBtn = document.getElementById('convertBtn');
    const loadingState = document.getElementById('loadingState');
    const errorState = document.getElementById('errorState');
    const videoInfo = document.getElementById('videoInfo');
    const resultsContainer = document.getElementById('resultsContainer');
    
    convertBtn.disabled = true;
    loadingState.classList.remove('hidden');
    errorState.classList.add('hidden');
    videoInfo.classList.add('hidden');
    resultsContainer.classList.add('hidden');
    resultsContainer.innerHTML = '';
    
    try {
        const response = await fetch('/api/index', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, type: selectedType })
        });
        
        const json = await response.json();
        
        if (!response.ok || !json.success) {
            throw new Error(json.error || 'Gagal memproses video');
        }
        
        currentVideoData = json;
        
        renderVideoInfo(json.info);
        renderResults(json.data, json.type);
        saveToHistory(url);
        
    } catch (err) {
        errorState.classList.remove('hidden');
        document.getElementById('errorMessage').textContent = err.message;
    } finally {
        convertBtn.disabled = false;
        loadingState.classList.add('hidden');
    }
}

function renderVideoInfo(info) {
    const videoInfo = document.getElementById('videoInfo');
    videoInfo.innerHTML = `
        <img src="${info.thumbnail}" class="video-thumbnail" alt="thumbnail" onerror="this.src='https://via.placeholder.com/70x52?text=No+Image'">
        <div class="video-details">
            <div class="video-title">${escapeHtml(info.title)}</div>
            <div class="video-meta">${escapeHtml(info.author)} • ${info.durationFormatted || info.duration || '00:00'}</div>
        </div>
    `;
    videoInfo.classList.remove('hidden');
}

function renderResults(formats, type) {
    const container = document.getElementById('resultsContainer');
    container.innerHTML = '';
    
    if (!formats || formats.length === 0) return;
    
    // Grid 2 kolom - semua hasil dalam grid (2 slide ke samping, terus 2 slide lagi)
    const grid = document.createElement('div');
    grid.className = 'results-grid';
    
    formats.forEach(format => {
        const card = createResultCard(format, type);
        grid.appendChild(card);
    });
    
    container.appendChild(grid);
    container.classList.remove('hidden');
}

function createResultCard(format, type) {
    const ext = type === 'mp3' ? 'mp3' : 'mp4';
    const title = currentVideoData?.info?.title || 'video';
    const cleanTitle = title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_').substring(0, 50);
    const filename = `${cleanTitle}_${format.quality}.${ext}`;
    
    const card = document.createElement('div');
    card.className = 'result-card';
    
    let previewHtml = '';
    
    if (type === 'mp4') {
        const thumb = currentVideoData?.info?.thumbnail || '';
        previewHtml = `
            <div class="result-preview">
                <video controls preload="none" poster="${thumb}">
                    <source src="${format.url}" type="video/mp4">
                </video>
            </div>`;
    } else {
        previewHtml = `
            <div class="result-preview-audio">
                <div class="audio-wave-icon">♪</div>
                <div class="audio-text">Audio Stream</div>
            </div>`;
    }
    
    card.innerHTML = `
        ${previewHtml}
        <div class="result-info">
            <div class="result-quality">
                <span class="quality-badge">${format.quality}</span>
                <span class="file-size">${format.size || 'Unknown'}</span>
            </div>
            <button class="download-btn" data-url="${format.url}" data-filename="${filename}">
                Download
            </button>
        </div>
    `;
    
    const btn = card.querySelector('.download-btn');
    btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const url = btn.dataset.url;
        const filename = btn.dataset.filename;
        await downloadFile(url, filename, btn);
    });
    
    return card;
}

async function downloadFile(url, filename, btn) {
    const originalText = btn.textContent;
    btn.textContent = '...';
    btn.disabled = true;
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Download failed');
        
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
        
        btn.textContent = 'Done';
        setTimeout(() => {
            btn.textContent = originalText;
            btn.disabled = false;
        }, 1500);
    } catch (err) {
        window.open(url, '_blank');
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

function saveToHistory(url) {
    let history = JSON.parse(localStorage.getItem('jhon_ytb_history')) || [];
    if (history[0] !== url) {
        history.unshift(url);
        if (history.length > 5) history.pop();
        localStorage.setItem('jhon_ytb_history', JSON.stringify(history));
    }
}

function loadHistory() {
    const historyList = document.getElementById('historyList');
    if (!historyList) return;
    
    let history = JSON.parse(localStorage.getItem('jhon_ytb_history')) || [];
    if (history.length === 0) {
        historyList.innerHTML = '<div style="padding:14px; color:#888; font-size:0.75rem;">Belum ada riwayat</div>';
        return;
    }
    
    historyList.innerHTML = history.map(url => `
        <div style="padding:10px 14px; border-bottom:1px solid var(--border); font-size:0.7rem;">
            <a href="${url}" target="_blank" style="color:#888; text-decoration:none;">${url.length > 50 ? url.substring(0, 50) + '...' : url}</a>
        </div>
    `).join('');
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
