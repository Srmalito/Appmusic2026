import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isWindows = process.platform === 'win32';
const ytDlpFilename = isWindows ? 'yt-dlp.exe' : 'yt-dlp';
const ytDlpPath = path.join(__dirname, 'bin', ytDlpFilename);

const app = express();
app.use(cors());
app.use(express.json());

// Helper function to check/download yt-dlp on startup
async function ensureYtDlp() {
  const binDir = path.join(__dirname, 'bin');
  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir);
  }
  const exePath = path.join(binDir, ytDlpFilename);
  if (!fs.existsSync(exePath)) {
    console.log(`${ytDlpFilename} not found! Downloading from GitHub...`);
    const url = isWindows
      ? 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe'
      : 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download yt-dlp: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    fs.writeFileSync(exePath, Buffer.from(arrayBuffer));
    
    // Set executable permission for Linux
    if (!isWindows) {
      fs.chmodSync(exePath, '755');
    }
    console.log(`${ytDlpFilename} downloaded successfully.`);
  } else {
    console.log(`${ytDlpFilename} verified.`);
  }
}

// Security Regex for YouTube Video ID
const VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

// In-memory Cache to store extracted URLs
const urlCache = new Map(); // videoId -> { cdnUrl, expiresAt }

// 12 Default Homepage Video IDs to pre-warm on startup
const DEFAULT_VIDEO_IDS = [
  'Zi_XLOBDo_Y', // Billie Jean
  'Cr8K88UcO0s', // Tití Me Preguntó
  'icuTFvt0vOY', // Sola Remix
  'oRdxUFDoQe0', // Beat It
  'wAjHQXrIj9o', // Ojitos Lindos
  '0w3XwPVxcsw', // Ella Quiere Beber
  'ZA7ZKB8Mo9k', // LUNA
  '_PJvpq8uOZM', // Monaco
  'GbTbHdPatkU', // TQG
  'sOnqjkJTMaA', // Thriller
  '0VR3dfZf9Yg', // China
  'CocEMWdc7Ck'  // Shakira Sessions 53
];

// Helper function to extract direct URL using yt-dlp
function extractStreamUrl(videoId) {
  return new Promise((resolve, reject) => {
    const ytDlpArgs = [
      '-f', 'bestaudio',
      '-g',
      '--no-playlist',
      '--js-runtimes', `node:${process.execPath}`,
      `https://www.youtube.com/watch?v=${videoId}`
    ];
    const ytDlp = spawn(ytDlpPath, ytDlpArgs, { env: process.env });
    let stdout = '';
    let stderr = '';
    
    ytDlp.stdout.on('data', (data) => { stdout += data.toString(); });
    ytDlp.stderr.on('data', (data) => { stderr += data.toString(); });
    
    ytDlp.on('error', (err) => reject(err));
    
    ytDlp.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `yt-dlp exited with code ${code}`));
      } else {
        const finalUrl = stdout.trim();
        if (finalUrl) {
          resolve(finalUrl);
        } else {
          reject(new Error('Stream URL was empty'));
        }
      }
    });
  });
}

// Background pre-warming function
async function preWarmCache() {
  console.log('[Pre-Warm] Starting cache pre-warming for default tracks...');
  for (const videoId of DEFAULT_VIDEO_IDS) {
    try {
      const cdnUrl = await extractStreamUrl(videoId);
      let expiresAt = Date.now() + 5 * 60 * 60 * 1000; // default 5 hours
      const expireMatch = cdnUrl.match(/[?&]expire=(\d+)/);
      if (expireMatch) {
        expiresAt = parseInt(expireMatch[1], 10) * 1000 - 5 * 60 * 1000;
      }
      urlCache.set(videoId, { cdnUrl, expiresAt });
      console.log(`[Pre-Warm Cached] Video ID: ${videoId}`);
    } catch (err) {
      console.warn(`[Pre-Warm Failed] Video ID: ${videoId}:`, err.message);
    }
    // Wait 2 seconds between extractions to prevent CPU spikes or rate limiting
    await new Promise(r => setTimeout(r, 2000));
  }
  console.log('[Pre-Warm] Pre-warming completed.');
}

app.get('/stream/:videoId', async (req, res) => {
  const { videoId } = req.params;

  // 1. Validate Video ID for security (prevent injection)
  if (!VIDEO_ID_REGEX.test(videoId)) {
    return res.status(400).send('Invalid video ID format');
  }

  // 2. Check Cache
  const cached = urlCache.get(videoId);
  if (cached && cached.expiresAt > Date.now()) {
    console.log(`[Cache Hit] Redirecting Video ID: ${videoId}`);
    return res.redirect(302, cached.cdnUrl);
  }

  console.log(`[Cache Miss] Extracting Video ID: ${videoId}`);

  try {
    const finalUrl = await extractStreamUrl(videoId);
    
    // Save to cache
    let expiresAt = Date.now() + 5 * 60 * 60 * 1000; // default 5 hours
    const expireMatch = finalUrl.match(/[?&]expire=(\d+)/);
    if (expireMatch) {
      expiresAt = parseInt(expireMatch[1], 10) * 1000 - 5 * 60 * 1000;
    }
    urlCache.set(videoId, { cdnUrl: finalUrl, expiresAt });

    console.log(`[Redirecting to YouTube CDN] Video ID: ${videoId}`);
    res.redirect(302, finalUrl);
  } catch (err) {
    console.error(`[Extraction Failed] Video ID: ${videoId}:`, err.message);
    if (!res.headersSent) {
      res.status(500).send('Failed to extract audio stream URL');
    }
  }
});

const PORT = process.env.PORT || 3001;

ensureYtDlp().then(() => {
  app.listen(PORT, () => {
    console.log(`Backend audio streaming server running on port ${PORT}`);
    
    // Start background cache pre-warming after server starts
    preWarmCache();
  });
}).catch((err) => {
  console.error('Failed to initialize server dependencies:', err);
  process.exit(1);
});
