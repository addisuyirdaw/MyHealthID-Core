const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '../MyHealthID-Core');
const destDir = path.resolve(__dirname, '..');

const ignoreDirs = new Set(['.git', '.next', 'node_modules', 'scratch']);
const ignoreFiles = new Set(['.env.local', 'copy_repo.cjs', 'compare.js', 'compare.cjs']);

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();

  if (isDirectory) {
    const dirName = path.basename(src);
    if (ignoreDirs.has(dirName)) {
      return;
    }
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach(childItemName => {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    const fileName = path.basename(src);
    if (ignoreFiles.has(fileName)) {
      return;
    }
    fs.copyFileSync(src, dest);
    console.log(`Copied: ${path.relative(srcDir, src)}`);
  }
}

console.log(`Copying files from ${srcDir} to ${destDir}...`);
copyRecursiveSync(srcDir, destDir);
console.log('Finished copying files.');
