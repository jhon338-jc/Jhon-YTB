window.addEventListener('load', () => {
    setTimeout(() => {
        const loadingScreen = document.getElementById('loading-screen');
        const mainApp = document.getElementById('main-app');
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.classList.add('hidden');
            mainApp.classList.remove('hidden');
        }, 500);
    }, 2500); 
});

async function pasteLink() {
    try {
        const text = await navigator.clipboard.readText();
        document.getElementById('urlInput').value = text;
    } catch (err) {
        alert("Gagal Paste. Browser lu belum kasih izin akses clipboard.");
    }
}

function clearLink() {
    document.getElementById('urlInput').value = '';
    document.getElementById('hasil-box').classList.add('hidden');
}

async function prosesKonvert() {
    const inputUrl = document.getElementById('urlInput').value;
    // Ambil nilai radio button (audio / video)
    const formatPilihan = document.querySelector('input[name="format"]:checked').value; 
    
    if (!inputUrl || !inputUrl.includes('youtu')) {
        alert("Boss, masukkan link YouTube yang benar!");
        return;
    }

    document.getElementById('hasil-box').classList.add('hidden');
    document.getElementById('status-proses').classList.remove('hidden');

    try {
        // Nembak ke API Cobalt (Logika backend ditaruh di sini)
        const respon = await fetch('https://api.cobalt.tools/api/json', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                url: inputUrl,
                isAudioOnly: formatPilihan === 'audio', // True jika pilih MP3
                aFormat: "mp3", // Spesifik ke mp3 jika audio
                vQuality: "720"
            })
        });

        const data = await respon.json();

        if (data.url) {
            // Ekstensi untuk nama file
            const ekstensi = formatPilihan === 'audio' ? 'mp3' : 'mp4';
            tampilkanHasil(data.url, formatPilihan, ekstensi);
        } else {
            alert("Gagal konvert. Server sedang penuh, coba lagi.");
        }
    } catch (error) {
        alert("Gagal terhubung ke server.");
    } finally {
        document.getElementById('status-proses').classList.add('hidden');
    }
}

function tampilkanHasil(urlFile, format, ekstensi) {
    const previewArea = document.getElementById('media-preview');
    const tombolUnduh = document.getElementById('btnDownload');
    const boxHasil = document.getElementById('hasil-box');

    previewArea.innerHTML = '';

    if (format === 'video') {
        previewArea.innerHTML = `<video src="${urlFile}" controls></video>`;
    } else {
        previewArea.innerHTML = `<audio src="${urlFile}" controls style="width: 100%; margin-top: 10px;"></audio>`;
    }

    // Set tombol unduh biar langsung sedot ke penyimpanan HP
    tombolUnduh.onclick = (e) => {
        e.preventDefault();
        unduhFileKeHP(urlFile, `jhon_ytb.${ekstensi}`);
    };
    
    boxHasil.classList.remove('hidden');
}

// Fungsi tambahan untuk maksa file terunduh langsung (bukan cuma diputar)
function unduhFileKeHP(url, namaFile) {
    fetch(url)
        .then(response => response.blob())
        .then(blob => {
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = blobUrl;
            a.download = namaFile;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(blobUrl);
            document.body.removeChild(a);
        })
        .catch(() => {
            // Kalau fetch blob gagal (biasanya karena CORS), pakai fallback buka tab baru
            const a = document.createElement('a');
            a.href = url;
            a.download = namaFile;
            a.target = "_blank";
            a.click();
        });
}
