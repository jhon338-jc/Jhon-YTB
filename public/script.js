let currentMediaUrls = [];
let currentVideoInfo = {};
let selectedType = 'mp4';

document.addEventListener("DOMContentLoaded", () => {
    loadHistory();
    
    // Tampilkan username
    const user = localStorage.getItem('jhon_user');
    const userDisplay = document.getElementById('userDisplay');
    if (userDisplay && user) {
        userDisplay.innerHTML = `USER: ${user.toUpperCase()}`;
    } else if (!user && window.location.pathname.includes('dashboard.html')) {
        window.location.href = 'index.html';
    }
});

function logout() {
    localStorage.removeItem('jhon_user');
    window.location.href = 'index.html';
}

function selectType(type) {
    selectedType = type;
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`.type-btn[data-type="${type}"]`).classList.add('active');
}

async function pasteLink() {
    try {
        const text = await navigator.clipboard.readText();
        document.getElementById('urlInput').value = text;
    } catch (err) {
        alert('Gagal menyalin. Izinkan akses clipboard.');
    }
}

function clearLink() {
    document.getElementById('urlInput').value = '';
    document.getElementById('urlInput').focus();
}

async function fetchMedia() {
    const input = document.getElementById('urlInput');
    const btn = document.getElementById('downloadBtn');
    const loading = document.getElementById('loading');
    const resultDiv = document.getElementById('result');
    const errorCard = document.getElementById('error-msg');
    const errorText = document.getElementById('error-text');
    const url = input.value.trim();

    if (!url) {
        alert('Masukkan link YouTube terlebih dahulu!');
        return;
    }

    btn.disabled = true;
    loading.classList.remove('hidden');
    resultDiv.innerHTML = '';
    errorCard.classList.add('hidden');
    currentMediaUrls = [];

    try {
        const response = await fetch('/api/index', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, type: selectedType })
        });

        const json = await response.json();

        if (!response.ok || !json.success) {
            throw new Error(json.error || 'Media tidak ditemukan atau URL tidak valid.');
        }

        saveToHistory(url);
        currentVideoInfo = json.info;
        renderResult(json.data, json.info, json.type);

    } catch (err) {
        errorText.textContent = err.message;
        errorCard.classList.remove('hidden');
    } finally {
        btn.disabled = false;
        loading.classList.add('hidden');
    }
}

function renderResult(medias, info, type) {
    const resultDiv = document.getElementById('result');

    // Card Info Video
    const infoCard = document.createElement('div');
    infoCard.className = 'cyber-card result-card';
    infoCard.innerHTML = `
        <div class="result-header">
            <span>INFO VIDEO</span>
            <span class="result-badge">${type.toUpperCase()}</span>
        </div>
        <div class="result-body">
            <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                <img src="${info.thumbnail}" style="width: 120px; border-radius: 5px; object-fit: cover;" alt="thumbnail">
                <div style="flex:1">
                    <div style="font-weight: bold; margin-bottom: 5px; font-size: 0.9rem;">${escapeHtml(info.title)}</div>
                    <div style="font-family: monospace; font-size: 0.75rem; color: #ccc;">${escapeHtml(info.author)}</div>
                    <div style="font-family: monospace; font-size: 0.75rem; color: #ccc;">Durasi: ${info.durationFormatted}</div>
                </div>
            </div>
        </div>
    `;
    resultDiv.appendChild(infoCard);

    // Daftar format yang tersedia
    medias.forEach((media, index) => {
        const ext = type === 'mp3' ? 'mp3' : 'mp4';
        const filename = `${info.title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')}_${media.quality}.${ext}`;
        
        currentMediaUrls.push({ url: media.url, filename: filename });

        const card = document.createElement('div');
        card.className = 'cyber-card result-card';
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'all 0.4s ease';
        setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);

        let previewHtml = '';
        if (type === 'mp4') {
            previewHtml = `
                <div style="background:#000; padding:5px;">
                    <video controls poster="${info.thumbnail}" playsinline style="width:100%; max-height:300px;">
                        <source src="${media.url}" type="video/mp4">
                    </video>
                </div>`;
        } else {
            previewHtml = `
                <div style="background:#000; padding:20px; text-align:center;">
                    <div style="font-size: 3rem; margin-bottom:10px;">🎵</div>
                    <div style="font-family: monospace; font-size:0.8rem;">AUDIO STREAM - ${media.quality}</div>
                </div>`;
        }

        card.innerHTML = `
            <div class="result-header">
                <span>${type === 'mp4' ? 'VIDEO' : 'AUDIO'} - ${media.quality}</span>
                <span class="result-badge">SUKSES</span>
            </div>
            <div class="result-body">
                ${previewHtml}
                <div style="margin: 15px 0; font-family: monospace; font-size: 0.75rem; border-top: 1px dashed #444; padding-top: 10px;">
                    > NAMA FILE: ${filename}<br>
                    > UKURAN: ${media.size}
                </div>
                <button class="cyber-button" style="background: #555; color:white;"
                    onclick="forceDownload('${media.url}', '${filename}', this)">
                    UNDUH SEKARANG
                </button>
            </div>
        `;
        resultDiv.appendChild(card);
    });
}

async function forceDownload(url, filename, btnElement) {
    const originalText = btnElement.innerText;
    btnElement.innerText = "MENGUNDUH...";
    btnElement.disabled = true;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Kesalahan Jaringan");
        
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(blobUrl);
        document.body.removeChild(a);
    } catch (e) {
        window.open(url, '_blank');
    } finally {
        btnElement.innerText = "SELESAI";
        setTimeout(() => {
            btnElement.innerText = originalText;
            btnElement.disabled = false;
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
    loadHistory();
}

function loadHistory() {
    const historyList = document.getElementById('historyList');
    if (!historyList) return;
    
    let history = JSON.parse(localStorage.getItem('jhon_ytb_history')) || [];
    
    if (history.length === 0) {
        historyList.innerHTML = '<p style="font-size: 0.8rem; font-family: monospace; color: #ccc;">Belum ada riwayat.</p>';
        return;
    }

    historyList.innerHTML = '';
    history.forEach(url => {
        historyList.innerHTML += `
            <div class="history-item">
                <a href="${url}" target="_blank" class="history-link">${url.length > 50 ? url.substring(0, 50) + '...' : url}</a>
                <span style="font-size: 0.7rem; opacity: 0.5;">TERUNDUH</span>
            </div>
        `;
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}