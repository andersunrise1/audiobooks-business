const fs = require('fs');
const path = require('path');
const db = require('./db');

let cacheDir = null;

function init(userDataPath) {
  cacheDir = path.join(userDataPath, 'audio-cache');
  fs.mkdirSync(cacheDir, { recursive: true });
}

function extensionFor(audioUrl) {
  const match = /\.([a-z0-9]+)(?:\?.*)?$/i.exec(audioUrl);
  return match ? match[1] : 'mp3';
}

async function downloadChapterAudio(chapterId, audioUrl) {
  const existing = db.getCachedAudioPath(chapterId);
  if (existing && fs.existsSync(existing)) return existing;

  const response = await fetch(audioUrl);
  if (!response.ok) {
    throw new Error(`Failed to download audio (status ${response.status})`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const filePath = path.join(cacheDir, `${chapterId}.${extensionFor(audioUrl)}`);
  fs.writeFileSync(filePath, buffer);

  db.recordCachedAudio(chapterId, filePath);
  return filePath;
}

function getCachedAudioPath(chapterId) {
  const filePath = db.getCachedAudioPath(chapterId);
  return filePath && fs.existsSync(filePath) ? filePath : null;
}

module.exports = { init, downloadChapterAudio, getCachedAudioPath };
