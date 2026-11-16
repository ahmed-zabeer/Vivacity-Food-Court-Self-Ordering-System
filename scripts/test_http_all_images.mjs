import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const publicDir = path.join(root, 'public');

import('../server/menuData.js').then(async ({ menuItemsData, stallsData }) => {
  const app = express();
  app.use(express.static(publicDir));

  const server = app.listen(0);
  const port = server.address().port;
  console.log(`Test static server running on port ${port}`);

  let successCount = 0;
  let failCount = 0;
  const failures = [];

  const checkUrl = (url) => {
    return new Promise((resolve) => {
      http.get(`http://127.0.0.1:${port}${url}`, (res) => {
        let size = 0;
        res.on('data', chunk => size += chunk.length);
        res.on('end', () => {
          if (res.statusCode === 200 && size > 0) {
            resolve({ ok: true, size });
          } else {
            resolve({ ok: false, status: res.statusCode, size });
          }
        });
      }).on('error', (err) => {
        resolve({ ok: false, error: err.message });
      });
    });
  };

  for (const item of menuItemsData) {
    const result = await checkUrl(item.image);
    if (result.ok) {
      successCount++;
    } else {
      failCount++;
      failures.push({ id: item.id, name: item.name, image: item.image, result });
    }
  }

  server.close();

  console.log('=== HTTP 200 VERIFICATION REPORT ===');
  console.log(`Total Menu Items Tested: ${menuItemsData.length}`);
  console.log(`HTTP 200 OK: ${successCount}`);
  console.log(`Failed: ${failCount}`);

  if (failCount > 0) {
    console.error('Failures encountered:');
    failures.forEach(f => console.error(JSON.stringify(f)));
    process.exit(1);
  } else {
    console.log('100% of all 332 images served with HTTP 200 OK!');
    process.exit(0);
  }
});
