// File: api/convert.js (Ini adalah Backend Vercel lu boss)
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Hanya menerima request POST' });
    }

    try {
        // Vercel yang nembak ke Cobalt (Jadi nggak akan kena blokir CORS Browser)
        const response = await fetch('https://co.wuk.sh/api/json', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(req.body)
        });

        const data = await response.json();
        
        // Kirim balik hasilnya ke website lu
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Backend gagal menghubungi API tujuan' });
    }
}
