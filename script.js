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
    const formatPilihan = document.querySelector('input[name="format"]:checked').value; 
    
    if (!inputUrl || !inputUrl.includes('youtu')) {
        alert("Boss, masukkan link YouTube yang benar!");
        return;
    }

    document.getElementById('hasil-box').classList.add('hidden');
    document.getElementById('status-proses').classList.remove('hidden');

    try {
        // Menggunakan Server API Cobalt yang Baru (co.wuk.sh)
        const respon = await fetch('https://co.wuk.sh/api/json', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                url: inputUrl,
                isAudioOnly: formatPilihan === 'audio',
                aFormat: "mp3",
                vQuality: "720"
            })
        });

        if (!respon.ok) {
            throw new Error(`Server menolak akses (Status: ${respon.status})`);
        }

        const data = await respon.json();

        if (data.url) {
            const ekstensi = formatPilihan === 'audio' ? 'mp3' : 'mp4';
            tampilkanHasil(data.url, formatPilihan, ekstensi);
        } else {
            alert("Gagal konvert. Coba lagi dalam beberapa saat.");
        }
    } catch (error) {
        // Menampilkan pesan error yang lebih jelas
        alert("Terjadi Kendala: " + error.message + "\n\nSistem keamanan browser atau API mungkin memblokir proses ini.");
        console.error(error);
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

    tombolUnduh.onclick = (e) => {
        e.preventDefault();
        unduhFileKeHP(urlFile, `jhon_ytb.${ekstensi}`);
    };
    
    boxHasil.classList.remove('hidden');
}

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
            const a = document.createElement('a');
            a.href = url;
            a.download = namaFile;
            a.target = "_blank";
            a.click();
        });
}
