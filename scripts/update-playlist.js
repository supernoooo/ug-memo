#!/usr/bin/env node

// need to run:
// node scripts/update-playlist.js

const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const musicDir = path.join(projectRoot, "music");
const playlistPath = path.join(musicDir, "playlist.json");
const audioExtensions = new Set([
  ".aac",
  ".aiff",
  ".alac",
  ".flac",
  ".m4a",
  ".mp3",
  ".ogg",
  ".opus",
  ".wav",
  ".webm",
]);

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith(".")) return [];
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    if (!entry.isFile()) return [];
    if (!audioExtensions.has(path.extname(entry.name).toLowerCase())) return [];
    return fullPath;
  });
}

const tracks = walk(musicDir)
  .map((file) => path.relative(musicDir, file).split(path.sep).join("/"))
  .sort((first, second) => first.localeCompare(second, "zh-CN", { numeric: true }));

fs.writeFileSync(playlistPath, `${JSON.stringify(tracks, null, 2)}\n`, "utf8");

console.log(`Updated ${path.relative(projectRoot, playlistPath)} with ${tracks.length} track(s).`);
