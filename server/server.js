import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const musicDir = path.join(__dirname, '..', 'music');

// Ensure music directory exists
if (!fs.existsSync(musicDir)) {
  fs.mkdirSync(musicDir, { recursive: true });
}

const app = express();
app.use(cors());
app.use(express.json());

// Serve local music files statically with CORS and Range requests support (handled natively by Express)
app.use('/music', cors(), express.static(musicDir, {
  fallthrough: false,
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Range');
  }
}));

const AUDIO_EXTENSIONS = new Set(['.mp3', '.m4a', '.wav', '.ogg', '.flac', '.aac']);

// API to scan and list all local tracks in the music/ directory
app.get('/api/tracks', (req, res) => {
  try {
    if (!fs.existsSync(musicDir)) {
      return res.json([]);
    }

    const files = fs.readdirSync(musicDir);
    const tracks = files
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return AUDIO_EXTENSIONS.has(ext);
      })
      .map((file, index) => {
        const ext = path.extname(file);
        const filenameWithoutExt = file.slice(0, -ext.length);
        
        let artist = 'Artista Local';
        let title = filenameWithoutExt;

        // Try to parse "Artist - Title" format
        if (filenameWithoutExt.includes(' - ')) {
          const parts = filenameWithoutExt.split(' - ');
          artist = parts[0].trim();
          title = parts.slice(1).join(' - ').trim();
        }

        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.headers['x-forwarded-host'] || req.get('host');
        const encodedFilename = encodeURIComponent(file);

        return {
          id: `local-${index}-${filenameWithoutExt}`,
          title: title,
          artist: artist,
          album: 'Colección Local',
          duration: '3:30', // Browser will fetch actual duration when metadata loads
          src: `${protocol}://${host}/music/${encodedFilename}`,
          cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300', // Premium default cover
          isGlobal: false,
          filename: file
        };
      });

    console.log(`[API] Scanned local music folder. Found ${tracks.length} tracks.`);
    res.json(tracks);
  } catch (err) {
    console.error('[API Error] Failed to scan local music directory:', err.message);
    res.status(500).json({ error: 'Failed to scan local music folder' });
  }
});

const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://api.piped.yt',
  'https://pipedapi.tokhmi.xyz',
  'https://pipedapi.leptons.xyz',
  'https://pipedapi.colt.top',
  'https://piped-api.lunar.icu',
  'https://pipedapi.r4fo.com',
  'https://pipedapi.privacydev.net'
];

const INVIDIOUS_INSTANCES = [
  'https://inv.nadeko.net',
  'https://invidious.nerdvpn.de',
  'https://invidious.f5.si',
  'https://yt.chocolatemoo53.com',
  'https://invidious.tiekoetter.com',
  'https://inv.tux.im'
];

// Helper to query multiple public instances with fast failover (3s timeout per request)
async function resolveAudioStreamUrl(videoId) {
  // 1. Try Piped instances first
  const shuffledPiped = [...PIPED_INSTANCES].sort(() => Math.random() - 0.5);
  for (const instance of shuffledPiped) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${instance}/streams/${videoId}`, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data.audioStreams && data.audioStreams.length > 0) {
          const audio = data.audioStreams.find(s => s.mimeType.startsWith('audio/mp4')) || data.audioStreams[0];
          if (audio && audio.url) {
            console.log(`[Resolve ✓] Piped resolved stream URL via: ${instance}`);
            return audio.url;
          }
        }
      }
    } catch (err) {
      // Failover to next instance
    }
  }

  // 2. Try Invidious instances if Piped fails
  const shuffledInvidious = [...INVIDIOUS_INSTANCES].sort(() => Math.random() - 0.5);
  for (const instance of shuffledInvidious) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${instance}/api/v1/videos/${videoId}`, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data.adaptiveFormats && data.adaptiveFormats.length > 0) {
          const audioFormats = data.adaptiveFormats.filter(f => f.type.startsWith('audio/'));
          if (audioFormats.length > 0) {
            console.log(`[Resolve ✓] Invidious resolved stream URL via: ${instance}`);
            return audioFormats[0].url;
          }
        }
      }
    } catch (err) {
      // Failover to next instance
    }
  }

  throw new Error('All Piped and Invidious public instances failed to resolve stream URL');
}

// Endpoint to resolve YouTube stream URL through Node backend (CORS-free)
app.get('/api/resolve/:videoId', async (req, res) => {
  const { videoId } = req.params;
  try {
    const audioUrl = await resolveAudioStreamUrl(videoId);
    res.json({ url: audioUrl });
  } catch (err) {
    console.error(`[Resolve Error] Failed to resolve videoId "${videoId}":`, err.message);
    res.status(502).json({ error: 'No se pudo resolver el flujo de audio desde la red pública' });
  }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🎵 Local Music Server running on http://localhost:${PORT}`);
  console.log(`📂 Scanning music from: ${musicDir}\n`);
});
