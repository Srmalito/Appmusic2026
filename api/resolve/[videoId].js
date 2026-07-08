// Vercel Serverless Function to resolve YouTube videoId into a direct audio stream URL (CORS-free)
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

export default async function handler(req, res) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { videoId } = req.query;
  if (!videoId) {
    return res.status(400).json({ error: 'Missing videoId parameter' });
  }

  // 1. Try Piped instances first with 3s timeout
  const shuffledPiped = [...PIPED_INSTANCES].sort(() => Math.random() - 0.5);
  for (const instance of shuffledPiped) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const fetchRes = await fetch(`${instance}/streams/${videoId}`, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      clearTimeout(timeoutId);
      
      if (fetchRes.ok) {
        const data = await fetchRes.json();
        if (data.audioStreams && data.audioStreams.length > 0) {
          const audio = data.audioStreams.find(s => s.mimeType.startsWith('audio/mp4')) || data.audioStreams[0];
          if (audio && audio.url) {
            console.log(`[Vercel Serverless] Resolved stream via Piped: ${instance}`);
            return res.status(200).json({ url: audio.url });
          }
        }
      }
    } catch (err) {
      // Failover
    }
  }

  // 2. Try Invidious instances as fallback
  const shuffledInvidious = [...INVIDIOUS_INSTANCES].sort(() => Math.random() - 0.5);
  for (const instance of shuffledInvidious) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const fetchRes = await fetch(`${instance}/api/v1/videos/${videoId}`, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      clearTimeout(timeoutId);
      
      if (fetchRes.ok) {
        const data = await fetchRes.json();
        if (data.adaptiveFormats && data.adaptiveFormats.length > 0) {
          const audioFormats = data.adaptiveFormats.filter(f => f.type.startsWith('audio/'));
          if (audioFormats.length > 0) {
            console.log(`[Vercel Serverless] Resolved stream via Invidious: ${instance}`);
            return res.status(200).json({ url: audioFormats[0].url });
          }
        }
      }
    } catch (err) {
      // Failover
    }
  }

  return res.status(502).json({ error: 'All public instances failed to resolve stream URL' });
}
