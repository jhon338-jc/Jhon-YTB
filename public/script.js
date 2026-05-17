let selectedType = 'mp4';
let currentVideoData = null;

document.addEventListener('DOMContentLoaded', () => {
    const user = localStorage.getItem('jhon_user');
    const profileName = document.getElementById('profileName');
    
    if (!user && window.location.pathname.includes('dashboard.html')) {
        window.location.href = 'index.html';
    }
    
    if (profileName && user) {
        profileName.textContent = user.toUpperCase();
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
        
        // Tampilkan info video
        renderVideoInfo(json.info);
        
        // Render results (2 slide horizontal, sisanya vertical)
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
        <img src="${info.thumbnail}" class="video-thumbnail" alt="thumbnail">
        <div class="video-details">
            <div class="video-title">${escapeHtml(info.title)}</div>
            <div class="video-meta">${escapeHtml(info.author)} • ${info.durationFormatted || info.duration}</div>
        </div>
    `;
    videoInfo.classList.remove('hidden');
}

function renderResults(formats, type) {
    const container = document.getElementById('resultsContainer');
    container.innerHTML = '';
    container.classList.remove('hidden');
    
    // Pisahkan: 2 untuk horizontal, sisanya vertical
    const horizontalItems = formats.slice(0, 2);
    const verticalItems = formats.slice(2);
    
    // HORIZONTAL SCROLL SECTION (2 slide ke samping)
    if (horizontalItems.length > 0) {
        const horizontalSection = document.createElement('div');
        horizontalSection.className = 'results-horizontal';
        
        horizontalItems.forEach(format => {
            const card = createResultCard(format, type, true);
            horizontalSection.appendChild(card);
        });
        
        container.appendChild(horizontalSection);
    }
    
    // VERTICAL SECTION (sisa ke bawah)
    if (verticalItems.length > 0) {
        const verticalSection = document.createElement('div');
        verticalSection.className = 'results-vertical';
        
        verticalItems.forEach(format => {
            const card = createResultCard(format, type, false);
            verticalSection.appendChild(card);
        });
        
        container.appendChild(verticalSection);
    }
}

function createResultCard(format, type, isHorizontal) {
    const ext = type === 'mp3' ? 'mp3' : 'mp4';
    const filename = `${currentVideoData?.info?.title?.replace(/[^a-zA-Z0-9\s]/g, '')?.replace(/\s+/g, '_') || 'video'}_${format.quality}.${ext}`;
    
    const card = document.createElement('div');
    card.className = isHorizontal ? 'result-card-horizontal' : 'result-card-vertical';
    
    let previewHtml = '';
    
    if (type === 'mp4') {
        previewHtml = `
            <div class="result-preview">
                <video controls poster="${currentVideoData?.info?.thumbnail || ''}">
                    <source src="${format.url}" type="video/mp4">
                </video>
            </div>`;
    } else {
        previewHtml = `
            <div class="result-preview-audio">
                <div class="audio-wave-icon">🎵</div>
                <div style="font-size:0.7rem; color:#888;">Audio Stream</div>
            </div>`;
    }
    
    card.innerHTML = `
        ${previewHtml}
        <div class="result-info">
            <div class="result-quality">
                <span class="quality-badge">${format.quality}</span>
                <span class="file-size">${format.size || 'Unknown'}</span>
            </div>
            <button class="download-btn" onclick="downloadFile('${format.url}', '${filename}')">
                Download ${type.toUpperCase()}
            </button>
        </div>
    `;
    
    return card;
}

async function downloadFile(url, filename) {
    const btn = event.target;
    const originalText = btn.textContent;
    btn.textContent = 'Downloading...';
    btn.disabled = true;
    
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(blobUrl);
    } catch (err) {
        window.open(url, '_blank');
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
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
        historyList.innerHTML = '<p style="padding:16px; color:#888;">Belum ada riwayat</p>';
        return;
    }
    
    historyList.innerHTML = history.map(url => `
        <div class="history-item">
            <a href="${url}" target="_blank">${url.substring(0, 50)}...</a>
        </div>
    `).join('');
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
