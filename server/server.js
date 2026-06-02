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

  // 2. Set headers for audio streaming
  // We send a generic audio content type and support range requests if needed,
  // although simple piping works for live playback.
  res.setHeader('Content-Type', 'audio/webm');
  res.setHeader('Accept-Ranges', 'none'); // Stream pipe does not easily support byte ranges

  // 3. Spawn yt-dlp to stream audio to stdout
  const ytDlpArgs = [
    '-f', 'bestaudio',
    '-o', '-',
    '--no-playlist',
    '--js-runtimes', 'node',
    `https://www.youtube.com/watch?v=${videoId}`
  ];

  const ytDlp = spawn(ytDlpPath, ytDlpArgs);

  // Pipe stdout to client response
  ytDlp.stdout.pipe(res);

  // Capture errors from yt-dlp stderr for server logs
  let errorOutput = '';
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
    if (code !== 0 && code !== null) {
      console.error(`[yt-dlp Exited with code ${code}]: ${errorOutput}`);
      if (!res.headersSent) {
        res.status(500).send('Failed to stream audio');
      }
    } else {
      console.log(`[Stream Completed] Video ID: ${videoId}`);
    }
  });

  // 4. Clean up process if the client aborts or disconnects
  req.on('close', () => {
    console.log(`[Client Disconnected] Killing yt-dlp for video: ${videoId}`);
    ytDlp.kill();
  });
});

app.get('/debug', (req, res) => {
  const cmd = req.query.cmd || 'version';
  let args = [];
  if (cmd === 'version') {
    args = ['--version'];
  } else if (cmd === 'test') {
    args = ['-f', 'bestaudio', '-g', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'];
  } else if (cmd === 'python') {
    const pythonCheck = spawn('python3', ['--version']);
    let stdout = '';
    let stderr = '';
    pythonCheck.stdout.on('data', (data) => { stdout += data.toString(); });
    pythonCheck.stderr.on('data', (data) => { stderr += data.toString(); });
    pythonCheck.on('close', (code) => {
      res.json({ code, stdout, stderr });
    });
    return;
  } else {
    return res.send('Invalid cmd');
  }
  
  const child = spawn(ytDlpPath, args);
  let stdout = '';
  let stderr = '';
  
  child.stdout.on('data', (data) => { stdout += data.toString(); });
  child.stderr.on('data', (data) => { stderr += data.toString(); });
  
  child.on('close', (code) => {
    res.json({ code, stdout, stderr });
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
