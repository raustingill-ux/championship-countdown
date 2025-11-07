#!/usr/bin/env node
const { readdir } = require("fs/promises");
const path = require("path");

const IGNORED = new Set([".git", "node_modules", ".DS_Store"]);
const ROOT = path.resolve(__dirname, "..");

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (IGNORED.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(fullPath));
    } else {
      files.push(path.relative(ROOT, fullPath));
    }
  }
  return files;
}

(async () => {
  try {
    const files = await walk(ROOT);
    files.sort((a, b) => a.localeCompare(b));
    process.stdout.write(files.join("\n") + "\n");
  } catch (err) {
    console.error("Failed to list repository files:", err);
    process.exitCode = 1;
  }
})();
