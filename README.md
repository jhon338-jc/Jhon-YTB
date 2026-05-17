# JHON YTB - YouTube Downloader

**By JHON338**

Fitur:
- Download video YouTube ke MP4 (berbagai kualitas: 144p-1080p)
- Download audio YouTube ke MP3 (64kbps-160kbps)
- Preview video sebelum download
- Nama file sesuai judul asli YouTube
- Tampilan dark hacker dengan animasi matrix
- PWA ready

## Deploy ke Vercel

1. Push kode ke GitHub
2. Import ke Vercel
3. Set `package.json` sebagai entry
4. Deploy!

## API Endpoint

`POST /api/index`

Body: `{ "url": "youtube_url", "type": "mp4" }` atau `{ "type": "mp3" }`