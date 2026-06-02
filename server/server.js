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

app.get('/stream/:videoId', async (req, res) => {
  const { videoId } = req.params;

  // 1. Validate Video ID for security (prevent injection)
  if (!VIDEO_ID_REGEX.test(videoId)) {
    return res.status(400).send('Invalid video ID format');
  }

  console.log(`[Stream Request] Video ID: ${videoId}`);

  // 2. Spawn yt-dlp to extract direct audio URL
  const ytDlpArgs = [
    '-f', 'bestaudio',
    '-g',
    '--no-playlist',
    '--js-runtimes', 'node',
    `https://www.youtube.com/watch?v=${videoId}`
  ];

  const ytDlp = spawn(ytDlpPath, ytDlpArgs);

  let cdnUrl = '';
  let errorOutput = '';

  ytDlp.stdout.on('data', (data) => {
    cdnUrl += data.toString();
  });

  ytDlp.stderr.on('data', (data) => {
    errorOutput += data.toString();
  });

  ytDlp.on('error', (err) => {
    console.error(`[Error spawning yt-dlp]:`, err);
    if (!res.headersSent) {
      res.status(500).send('Streaming process initialization failed');
    }
  });

  ytDlp.on('close', (code) => {
    if (code !== 0) {
      console.error(`[yt-dlp Exited with code ${code}]: ${errorOutput}`);
      if (!res.headersSent) {
        res.status(500).send('Failed to extract audio stream URL');
      }
    } else {
      const finalUrl = cdnUrl.trim();
      if (finalUrl) {
        console.log(`[Redirecting to YouTube CDN] Video ID: ${videoId}`);
        res.redirect(302, finalUrl);
      } else {
        console.error(`[yt-dlp returned empty URL] Video ID: ${videoId}`);
        if (!res.headersSent) {
          res.status(500).send('Stream URL was empty');
        }
      }
    }
  });

  // 3. Clean up process if the client aborts or disconnects early
  req.on('close', () => {
    if (ytDlp.exitCode === null) {
      console.log(`[Client Disconnected] Killing extraction process for video: ${videoId}`);
      ytDlp.kill();
    }
  });
});

const PORT = process.env.PORT || 3001;

ensureYtDlp().then(() => {
  app.listen(PORT, () => {
    console.log(`Backend audio streaming server running on port ${PORT}`);
  });
}).catch((err) => {
  console.error('Failed to initialize server dependencies:', err);
  process.exit(1);
});
