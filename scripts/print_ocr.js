import fs from 'fs';

const data = JSON.parse(fs.readFileSync('scripts/vivacity_all_menu_ocr.json', 'utf-8'));
let out = '';
for (const [k, v] of Object.entries(data)) {
  out += `\n=================== FILE: ${k} ===================\n`;
  out += (v.full_text || '') + '\n';
}
fs.writeFileSync('scripts/ocr_summary.txt', out, 'utf-8');
console.log('Saved utf-8 ocr_summary.txt, length:', out.length);
