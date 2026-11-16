import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(full));
    } else {
      results.push(full);
    }
  });
  return results;
}

const base = path.resolve('public/assets');
const files = walk(base);
console.log('Total files in public/assets:', files.length);

const byFolder = {};
files.forEach(f => {
  const rel = path.relative(base, f);
  const parts = rel.split(path.sep);
  const folder = parts.length > 1 ? parts[0] : '(root)';
  byFolder[folder] = (byFolder[folder] || 0) + 1;
});
console.log('By folder:', JSON.stringify(byFolder, null, 2));

// List subfolders and their files
const folders = ['fusion Cafe', 'Top Town', 'Barger Bar', 'menu', 'Vivacity All Menu'];
for (const fol of folders) {
  const folPath = path.join(base, fol);
  const folFiles = walk(folPath).map(f => path.relative(folPath, f));
  console.log(`\n=== FOLDER: ${fol} (${folFiles.length} files) ===`);
  console.log(folFiles.slice(0, 50).join('\n'));
  if (folFiles.length > 50) {
    console.log(`... and ${folFiles.length - 50} more`);
  }
}
