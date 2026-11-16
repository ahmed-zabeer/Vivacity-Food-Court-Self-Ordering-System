import http from 'http';
import os from 'os';
import { getNetworkInfo } from '../server/routes.js';

console.log('================================================================');
console.log('       VIVACITY FOOD COURT — CONNECTION DIAGNOSTIC TOOL         ');
console.log('================================================================\n');

const net = getNetworkInfo(3000);
console.log(`[1] Wi-Fi IPv4 Address:  ${net.primaryIp}`);
console.log(`[2] Phone Base URL:      ${net.recommendedBaseUrl}`);
console.log(`[3] Table T17 QR URL:    ${net.activeQrBaseUrl}/t/T17\n`);

console.log('Testing server on port 3000...');
const req = http.get('http://127.0.0.1:3000/api/tables', (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    try {
      const tables = JSON.parse(body);
      console.log(`[OK] Server is actively running! Found ${tables.length} tables in memory.`);
      console.log('\n================================================================');
      console.log('READY FOR PHONE CONNECTION:');
      console.log(`Open on your phone: ${net.recommendedBaseUrl}/t/T17`);
      console.log('================================================================\n');
    } catch {
      console.log('[WARN] Server responded, but table data was not JSON.');
    }
  });
});

req.on('error', (err) => {
  console.log(`[ERROR] Server is NOT responding on port 3000: ${err.message}`);
  console.log('Please run `npm run dev` in a separate terminal window first.');
});
