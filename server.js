const express = require('express');
const cors = require('cors');
const NodeCache = require('node-cache');
const youtubeDl = require('youtube-dl-exec');

const app = express();
const cache = new NodeCache({ stdTTL: 3600 });
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: '🎵 BeatBox Backend Running!', version: '2.0.0' });
});

app.get('/search', async (req, res) => {
  try {
    const q = req.query.q || 'bollywood hits';
    const limit = Math.min(parseInt(req.query.limit) || 20, 30);
    const cacheKey = `search_${q}_${limit}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const result = await youtubeDl(`ytsearch${limit}:${q}`, {
      dumpSingleJson: true,
      noWarnings: true,
      noCallHome: true,
      preferFreeFormats: true,
      flatPlaylist: true,
    });

    const entries = result.entries || [result];
    const results = entries.map(t => ({
      id: t.id,
      title: t.title || 'Unknown',
      artist: t.uploader || t.channel || 'Unknown',
      duration: t.duration || 0,
      thumbnail: t.thumbnail || `https://i.ytimg.com/vi/${t.id}/mqdefault.jpg`,
    })).filter(t => t.id);

    const response = { success: true, results };
    cache.set(cacheKey, response);
    res.json(response);
  } catch (e) {
    console.error('Search error:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/stream', async (req, res) => {
  try {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'id required' });

    const cacheKey = `stream_${id}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const result = await youtubeDl(`https://youtube.com/watch?v=${id}`, {
      dumpSingleJson: true,
      noWarnings: true,
      noCallHome: true,
      format: 'bestaudio[ext=m4a]/bestaudio/best',
    });

    const audioUrl = result.url || (result.formats?.slice(-1)[0]?.url);
    if (!audioUrl) throw new Error('No audio URL');

    const response = {
      success: true,
      id,
      title: result.title,
      artist: result.uploader || result.channel,
      duration: result.duration,
      thumbnail: result.thumbnail,
      audioUrl,
    };

    cache.set(cacheKey, response, 1800);
    res.json(response);
  } catch (e) {
    console.error('Stream error:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

app.listen(PORT, () => console.log(`🎵 BeatBox on port ${PORT}`));
