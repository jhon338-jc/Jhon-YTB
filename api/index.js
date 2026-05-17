import ytdl from 'ytdl-core';

function formatBytes(bytes) {
  if (!bytes) return 'Unknown';
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

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url, type } = req.body || req.query;

  // Cek URL
  if (!url) {
    return res.status(400).json({ 
      success: false,
      error: 'URL YouTube wajib diisi.' 
    });
  }

  // Validasi URL YouTube
  const isValid = ytdl.validateURL(url);
  if (!isValid) {
    return res.status(400).json({ 
      success: false,
      error: 'URL YouTube tidak valid. Pastikan link dari youtube.com atau youtu.be' 
    });
  }

  try {
    console.log('Fetching video info for:', url);
    const info = await ytdl.getInfo(url);
    const formats = info.formats;
    
    let selectedFormats = [];
    
    if (type === 'mp3') {
      // Filter audio only
      const audioFormats = formats.filter(f => f.hasAudio && !f.hasVideo && f.audioBitrate);
      const bitrateMap = new Map();
      for (const f of audioFormats) {
        const bitrate = f.audioBitrate;
        if (!bitrateMap.has(bitrate) || (f.contentLength > (bitrateMap.get(bitrate)?.contentLength || 0))) {
          bitrateMap.set(bitrate, f);
        }
      }
      selectedFormats = Array.from(bitrateMap.values())
        .sort((a, b) => b.audioBitrate - a.audioBitrate)
        .map(f => ({
          quality: `${f.audioBitrate}kbps`,
          url: f.url,
          size: formatBytes(f.contentLength)
        }));
    } else {
      // Filter video + audio
      const videoFormats = formats.filter(f => f.hasVideo && f.hasAudio && f.container === 'mp4' && f.qualityLabel);
      const qualityMap = new Map();
      for (const f of videoFormats) {
        const quality = f.qualityLabel;
        if (!qualityMap.has(quality) || (f.contentLength > (qualityMap.get(quality)?.contentLength || 0))) {
          qualityMap.set(quality, f);
        }
      }
      selectedFormats = Array.from(qualityMap.values())
        .sort((a, b) => {
          const aNum = parseInt(a.qualityLabel) || 0;
          const bNum = parseInt(b.qualityLabel) || 0;
          return bNum - aNum;
        })
        .map(f => ({
          quality: f.qualityLabel,
          url: f.url,
          size: formatBytes(f.contentLength)
        }));
    }

    if (selectedFormats.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tidak ada format yang tersedia untuk video ini. Mungkin video private atau diblokir.'
      });
    }

    return res.status(200).json({
      success: true,
      data: selectedFormats,
      info: {
        title: info.videoDetails.title,
        author: info.videoDetails.author.name,
        duration: info.videoDetails.lengthSeconds,
        durationFormatted: formatDuration(info.videoDetails.lengthSeconds),
        thumbnail: info.videoDetails.thumbnails[info.videoDetails.thumbnails.length - 1].url,
        videoId: info.videoDetails.videoId
      },
      type: type || 'mp4'
    });

  } catch (error) {
    console.error('Error detail:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Gagal memproses video. Coba lagi nanti. Error: ' + error.message
    });
  }
}