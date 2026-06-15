const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const NodeCache = require('node-cache');
const https = require('https');
const http = require('http');

const app = express();
const cache = new NodeCache({ stdTTL: 3600 }); // 1 hour cache
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));
app.use(express.json());

// ── Health check ──────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'BeatBox Backend Running 🎵', version: '1.0.0' });
});

// ── Helper: run yt-dlp command ────────────────────────────
function runYtDlp(args) {
  return new Promise((resolve, reject) => {
    const cmd = `yt-dlp ${args}`;
    exec(cmd, { timeout: 30000, maxBuffer: 1024 * 1024 * 10 }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message));
      else resolve(stdout.trim());
    });
  });
}

// ── SEARCH songs ──────────────────────────────────────────
// GET /search?q=arijit+singh&limit=20
app.get('/search', async (req, res) => {
  try {
    const q = req.query.q || 'bollywood hits';
    const limit = Math.min(parseInt(req.query.limit) || 20, 30);
    const cacheKey = `search_${q}_${limit}`;

    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const raw = await runYtDlp(
      `"ytsearch${limit}:${q}" --dump-json --flat-playlist --no-warnings --quiet`
    );

    const results = raw.split('\n')
      .filter(Boolean)
      .map(line => {
        try {
          const t = JSON.parse(line);
          return {
            id: t.id,
            title: t.title || 'Unknown',
            artist: t.uploader || t.channel || 'Unknown',
            duration: t.duration || 0,
            thumbnail: t.thumbnail ||
              (t.thumbnails?.[t.thumbnails.length - 1]?.url) ||
              `https://i.ytimg.com/vi/${t.id}/mqdefault.jpg`,
            url: `https://youtube.com/watch?v=${t.id}`,
          };
        } catch { return null; }
      })
      .filter(Boolean);

    const response = { success: true, results };
    cache.set(cacheKey, response);
    res.json(response);

  } catch (e) {
    console.error('Search error:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── GET stream URL for a video ────────────────────────────
// GET /stream?id=VIDEO_ID
app.get('/stream', async (req, res) => {
  try {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'id required' });

    const cacheKey = `stream_${id}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const raw = await runYtDlp(
      `"https://youtube.com/watch?v=${id}" -f "bestaudio[ext=m4a]/bestaudio/best" --get-url --no-warnings --quiet`
    );

    const audioUrl = raw.split('\n')[0].trim();
    if (!audioUrl) throw new Error('No audio URL found');

    // Also get info
    const infoRaw = await runYtDlp(
      `"https://youtube.com/watch?v=${id}" --dump-json --no-warnings --quiet`
    );
    const info = JSON.parse(infoRaw);

    const response = {
      success: true,
      id,
      title: info.title,
      artist: info.uploader || info.channel,
      duration: info.duration,
      thumbnail: info.thumbnail,
      audioUrl,
    };

    cache.set(cacheKey, response, 1800); // 30 min (URLs expire)
    res.json(response);

  } catch (e) {
    console.error('Stream error:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── PROXY audio (for CORS issues) ────────────────────────
// GET /proxy?url=AUDIO_URL
app.get('/proxy', async (req, res) => {
  try {
    const url = decodeURIComponent(req.query.url || '');
    if (!url) return res.status(400).send('URL required');

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'audio/mp4');

    const proto = url.startsWith('https') ? https : http;
    proto.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (stream) => {
      res.setHeader('Content-Length', stream.headers['content-length'] || '');
      stream.pipe(res);
    }).on('error', e => res.status(500).send(e.message));

  } catch (e) {
    res.status(500).send(e.message);
  }
});

// ── TRENDING ──────────────────────────────────────────────
app.get('/trending', async (req, res) => {
  try {
    const lang = req.query.lang || 'hindi';
    const queries = {
      hindi: 'bollywood hits 2024 new songs',
      punjabi: 'punjabi hits 2024 new songs',
      english: 'top english hits 2024',
    };
    const q = queries[lang] || queries.hindi;
    req.query.q = q;
    req.query.limit = '25';

    // Reuse search
    const cacheKey = `search_${q}_25`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const raw = await runYtDlp(
      `"ytsearch25:${q}" --dump-json --flat-playlist --no-warnings --quiet`
    );

    const results = raw.split('\n').filter(Boolean).map(line => {
      try {
        const t = JSON.parse(line);
        return {
          id: t.id, title: t.title || 'Unknown',
          artist: t.uploader || 'Unknown', duration: t.duration || 0,
          thumbnail: `https://i.ytimg.com/vi/${t.id}/mqdefault.jpg`,
        };
      } catch { return null; }
    }).filter(Boolean);

    const response = { success: true, results };
    cache.set(cacheKey, response);
    res.json(response);

  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`🎵 BeatBox Backend running on port ${PORT}`);
});
