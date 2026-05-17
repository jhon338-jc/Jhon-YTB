import axios from 'axios';

class YouTubeScraper {
  constructor() {
    this.baseURL = 'https://downr.org';
    this.headers = {
      'accept': '*/*',
      'content-type': 'application/json',
      'origin': 'https://downr.org',
      'referer': 'https://downr.org/',
      'user-agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Mobile Safari/537.36'
    };
  }

  async getSessionCookie() {
    const baseCookie = '_ga=GA1.1.536005378.1770437315; _clck=17lj13q%5E2%5Eg3d';
    try {
      const res = await axios.get(`${this.baseURL}/.netlify/functions/analytics`, {
        headers: { ...this.headers, cookie: baseCookie },
        timeout: 10000
      });
      const sess = res.headers['set-cookie']?.[0]?.split(';')[0];
      return sess ? `${baseCookie}; ${sess}` : baseCookie;
    } catch (e) {
      return baseCookie;
    }
  }

  async fetchVideo(url) {
    const cookie = await this.getSessionCookie();
    const res = await axios.post(
      `${this.baseURL}/.netlify/functions/nyt`,
      { url },
      { 
        headers: { ...this.headers, cookie },
        timeout: 30000
      }
    );
    return res.data;
  }
}

function formatBytes(bytes) {
  if (!bytes) return 'Unknown';
  if (typeof bytes === 'string') bytes = parseInt(bytes);
  if (isNaN(bytes)) return 'Unknown';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDuration(seconds) {
  if (!seconds) return '00:00';
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([\w-]+)/,
    /(?:youtu\.be\/)([\w-]+)/,
    /(?:youtube\.com\/embed\/)([\w-]+)/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { url, type } = req.body || req.query;

  if (!url) {
    return res.status(400).json({ error: 'Parameter URL YouTube wajib diisi.' });
  }

  // Validasi URL YouTube
  const videoId = extractVideoId(url);
  if (!videoId) {
    return res.status(400).json({ error: 'URL YouTube tidak valid. Pastikan link dari YouTube.' });
  }

  try {
    const scraper = new YouTubeScraper();
    const data = await scraper.fetchVideo(url);

    if (!data || !data.medias || data.medias.length === 0) {
      return res.status(404).json({ error: 'Media tidak ditemukan atau video tidak dapat diakses.' });
    }

    // Filter hanya YouTube results
    let filteredMedias = data.medias.filter(media => {
      return media.type === 'video' || media.type === 'audio';
    });

    if (filteredMedias.length === 0) {
      return res.status(404).json({ error: 'Tidak ada format video/audio yang tersedia.' });
    }

    // Ambil info video dari data pertama
    const videoInfo = {
      title: filteredMedias[0]?.title || data.title || 'YouTube Video',
      author: filteredMedias[0]?.author || 'YouTube',
      duration: filteredMedias[0]?.duration || 0,
      durationFormatted: formatDuration(filteredMedias[0]?.duration || 0),
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      videoId: videoId
    };

    // Proses sesuai type yang diminta (mp3/mp4)
    let resultMedias = [];
    
    if (type === 'mp3') {
      // Filter audio only
      resultMedias = filteredMedias
        .filter(m => m.type === 'audio')
        .map(m => ({
          quality: m.quality || m.label || '128kbps',
          type: 'audio',
          url: m.url,
          size: formatBytes(m.size),
          extension: 'mp3'
        }));
    } else {
      // Filter video
      resultMedias = filteredMedias
        .filter(m => m.type === 'video')
        .map(m => ({
          quality: m.quality || m.label || '720p',
          type: 'video',
          url: m.url,
          size: formatBytes(m.size),
          thumbnail: videoInfo.thumbnail,
          extension: 'mp4'
        }));
    }

    if (resultMedias.length === 0) {
      return res.status(404).json({ error: `Tidak ada format ${type.toUpperCase()} yang tersedia untuk video ini.` });
    }

    return res.status(200).json({
      success: true,
      data: resultMedias,
      info: videoInfo,
      type: type || 'mp4'
    });

  } catch (error) {
    console.error('Error:', error.message);
    return res.status(500).json({ error: 'Terjadi kesalahan pada server JHON338. Coba lagi nanti.' });
  }
}