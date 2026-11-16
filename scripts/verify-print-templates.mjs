/**
 * Renders the real React print templates to static HTML and asserts the
 * receipt/KOT contract. This exercises the same components the app ships.
 */
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';

const root = process.cwd();
const entry = `
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { KOTPrintView } from './src/components/common/KOTPrintView';
import { ReceiptModal } from './src/components/common/ReceiptModal';
import fs from 'node:fs';

const orders = JSON.parse(fs.readFileSync('./server/data/orders.json', 'utf8'));
const paid = orders.find((o) => o.token === '0002');
if (!paid) throw new Error('Test order token 0002 not found in server/data/orders.json');

const pending = JSON.parse(JSON.stringify(paid));
pending.paymentStatus = 'PAYMENT DUE';
pending.paidAt = null;
pending.transactionId = null;

const kotHtml = renderToStaticMarkup(<KOTPrintView order={paid} onClose={() => {}} />);
const paidHtml = renderToStaticMarkup(<ReceiptModal order={paid} onClose={() => {}} />);
const pendingHtml = renderToStaticMarkup(<ReceiptModal order={pending} onClose={() => {}} />);
fs.writeFileSync('./.tmp-kot.html', kotHtml);
fs.writeFileSync('./.tmp-receipt-paid.html', paidHtml);
fs.writeFileSync('./.tmp-receipt-pending.html', pendingHtml);
console.log(JSON.stringify({ kotHtml, paidHtml, pendingHtml }));
`;

const result = await build({
  stdin: {
    contents: entry,
    resolveDir: root,
    loader: 'jsx',
  },
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
  jsx: 'transform',
  external: ['react', 'react-dom/server', 'lucide-react'],
  logLevel: 'silent',
});

const outFile = path.join(root, '.tmp-print-bundle.mjs');
fs.writeFileSync(outFile, result.outputFiles[0].text, 'utf8');

// The bundle prints the rendered HTML payload as its last stdout line.
const { execFileSync } = await import('node:child_process');
const stdout = execFileSync(process.execPath, [outFile], { cwd: root, encoding: 'utf8' });
const rendered = JSON.parse(stdout.trim().split('\n').pop());

const checks = [];
const check = (name, condition, detail = '') => {
  checks.push({ name, pass: !!condition, detail });
};

const kot = rendered.kotHtml;
const paid = rendered.paidHtml;
const pending = rendered.pendingHtml;

// ---- KOT ----
const tickets = kot.split('thermal-ticket').slice(1);
check('KOT renders one ticket per stall', tickets.length === 3, `found ${tickets.length}`);

const expectedStalls = [
  ['Coffee Buzz Fusion Cafe', 'T Bone Steak (300+6M)', 'Chicken Chowmein', 'Chicken Momo'],
  ['Top Town', 'Chicken Chowmein', 'T Bone Steak (300+6M)', 'Chicken Momo'],
  ['Momo Buzz', 'Chicken Momo', 'T Bone Steak (300+6M)', 'Chicken Chowmein'],
];
expectedStalls.forEach(([stall, own, otherA, otherB], idx) => {
  const t = tickets[idx] || '';
  check(`KOT ticket ${idx + 1} shows ${stall}`, t.includes(stall));
  check(`KOT ticket ${idx + 1} contains only its stall items`, t.includes(own) && !t.includes(otherA) && !t.includes(otherB));
});

check('KOT quantity-before-name format', kot.includes('1-:T Bone Steak (300+6M)') && kot.includes('2-:Chicken Momo'));
check('KOT shows New Order (not Updated)', (kot.match(/New Order/g) || []).length === 3 && !kot.includes('Updated Order'));
check('KOT shows invoice on every ticket', (kot.match(/Invoice No:88002/g) || []).length === 3);
check('KOT shows master token on every ticket', (kot.match(/Token No:0002/g) || []).length === 3);
check('KOT shows guest name/phone on every ticket', (kot.match(/Guest: Sultana Rahman/g) || []).length === 3 && (kot.match(/Phone: 01799887766/g) || []).length === 3);
check('KOT shows guests/table/service/order type', (kot.match(/Guests:4/g) || []).length === 3 && (kot.match(/Table T30/g) || []).length === 3 && (kot.match(/Service: Table Service/g) || []).length === 3 && kot.includes('Order Type: Dine-in'));
check('KOT shows item notes/customizations', kot.includes('Note: Medium well, sauce on side') && kot.includes('Note: Extra chilli sauce'));
check('KOT shows order notes', (kot.match(/Notes: Please serve all stalls together/g) || []).length === 3);
check('KOT shows Kiwee logo and phone', (kot.match(/src="\/assets\/kiwee-logo-transparent.png"/g) || []).length === 3 && (kot.match(/01338777700/g) || []).length === 3);
check('KOT shows Powered by before the Kiwee logo', kot.indexOf('Powered by') >= 0 && kot.indexOf('Powered by') < kot.indexOf('kiwee-logo-transparent.png'));
check('KOT has no 3S branding', !kot.includes('3S'));
check('KOT has no Facebook link', !kot.toLowerCase().includes('facebook'));
check(
  'KOT has 80mm page breaks per stall',
  (kot.match(/thermal-ticket thermal-page-break/g) || []).length === 3
);

// ---- Paid guest receipt ----
check('Paid receipt shows Paid Bill', paid.includes('Paid Bill') && !paid.includes('Payment Pending'));
check('Paid receipt shows invoice/date/time/token', paid.includes('Invoice No:88002') && paid.includes('Token No:0002') && paid.includes('Date:'));
check('Paid receipt shows guests/table/service/order type', paid.includes('Number Of Guests:4') && paid.includes('Table T30') && paid.includes('Table Service') && paid.includes('Dine-in'));
check('Paid receipt shows Qty/Item/Price/T.Price columns', paid.includes('Qty') && paid.includes('Item Name') && paid.includes('Price') && paid.includes('T.Price'));
check('Paid receipt shows ticket/included/gross totals', paid.includes('Ticket Total:') && paid.includes('Included:') && paid.includes('Gross Total:') && paid.includes('2050.00') && paid.includes('2153.00'));
check('Paid receipt shows actual cash payment', paid.includes('-CASH:') && paid.includes('-TOTAL PAYMENT:') && paid.includes('-RETURNED AMOUNT:') && !paid.includes('AMOUNT DUE'));
check('Paid receipt shows Kiwee logo/phone/Facebook', paid.includes('/assets/kiwee-logo-transparent.png') && paid.includes('01338777700') && paid.includes('https://www.facebook.com/photo/'));
check('Paid receipt shows notes', paid.includes('Please serve all stalls together'));

// ---- Pending guest receipt ----
check('Pending receipt shows Payment Pending', pending.includes('Payment Pending') && !pending.includes('Paid Bill'));
check('Pending receipt never shows cash as paid', pending.includes('-CASH:') && pending.includes('0.00') && pending.includes('-AMOUNT DUE:') && pending.includes('2153.00'));
check('Pending receipt keeps full order details', pending.includes('Invoice No:88002') && pending.includes('Token No:0002') && pending.includes('Number Of Guests:4'));

const failed = checks.filter((c) => !c.pass);
for (const c of checks) {
  console.log(`${c.pass ? 'PASS' : 'FAIL'}  ${c.name}${c.detail ? ` (${c.detail})` : ''}`);
}
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
if (failed.length > 0) process.exitCode = 1;
