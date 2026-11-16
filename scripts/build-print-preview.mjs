import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const cssDir = path.join(root, 'dist', 'assets');
const cssFile = fs
  .readdirSync(cssDir)
  .filter((f) => f.startsWith('index-') && f.endsWith('.css'))
  .sort()
  .pop();
if (!cssFile) throw new Error('Built CSS not found in dist/assets');

const cssHref = `file:///${path.join(cssDir, cssFile).replace(/\\/g, '/')}`;
const assetBase = `file:///${path.join(root, 'public', 'assets').replace(/\\/g, '/')}/`;

function wrap(name, bodyFile, outFile) {
  let body = fs.readFileSync(path.join(root, bodyFile), 'utf8');
  // Local assets for the file:// preview.
  body = body.replace(/src="\/assets\//g, `src="${assetBase}`);
  // Apply the print rules on screen so a headless screenshot shows exactly
  // what the 80mm printer receives.
  body = body.replace(/@media print\s*\{/g, '@media all {');
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${name}</title>
<link rel="stylesheet" href="${cssHref}" />
<style>
  html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
  body { width: 80mm; }
</style>
</head>
<body>
${body}
</body>
</html>`;
  fs.writeFileSync(path.join(root, outFile), html, 'utf8');
  return { outFile, bytes: html.length, cssHref };
}

const receipt = wrap('Receipt 80mm', '.tmp-receipt-paid.html', 'tmp-print-receipt.html');
const kot = wrap('KOT 80mm', '.tmp-kot.html', 'tmp-print-kot.html');
console.log(JSON.stringify({ receipt, kot }, null, 2));
