const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dirA = path.resolve(__dirname, '..');
const dirB = path.resolve(__dirname, '../MyHealthID-Core');

const ignoreDirs = new Set(['.git', '.next', 'node_modules', 'MyHealthID-Core', 'scratch']);
const ignoreFiles = new Set(['compare.js', 'package-lock.json']);

function getFiles(dir, baseDir = dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    const relPath = path.relative(baseDir, filePath);
    
    // Check if we should ignore this path
    const parts = relPath.split(path.sep);
    if (parts.some(part => ignoreDirs.has(part))) {
      return;
    }
    if (stat.isDirectory()) {
      results = results.concat(getFiles(filePath, baseDir));
    } else {
      if (!ignoreFiles.has(file)) {
        results.push({
          relPath,
          fullPath: filePath,
          size: stat.size
        });
      }
    }
  });
  return results;
}

function getMd5(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(content).digest('hex');
}

const filesA = getFiles(dirA);
const filesB = getFiles(dirB);

const mapA = new Map(filesA.map(f => [f.relPath, f]));
const mapB = new Map(filesB.map(f => [f.relPath, f]));

console.log('=== Files only in B (New files/updates from GitHub) ===');
let onlyInB = [];
for (const [rel, f] of mapB) {
  if (!mapA.has(rel)) {
    console.log(`+ ${rel}`);
    onlyInB.push(rel);
  }
}

console.log('\n=== Files only in A (Local modifications/untracked) ===');
let onlyInA = [];
for (const [rel, f] of mapA) {
  if (!mapB.has(rel)) {
    console.log(`- ${rel}`);
    onlyInA.push(rel);
  }
}

console.log('\n=== Modified Files (Content differences) ===');
let modified = [];
for (const [rel, fB] of mapB) {
  const fA = mapA.get(rel);
  if (fA) {
    const md5A = getMd5(fA.fullPath);
    const md5B = getMd5(fB.fullPath);
    if (md5A !== md5B) {
      console.log(`M ${rel}`);
      modified.push(rel);
    }
  }
}
