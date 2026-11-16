import fs from 'fs';

const lines = fs.readFileSync('./server/menuData.js', 'utf8').split('\n');
const drinkCats = ['BOBA DRINK', 'ICE CRUSHED', 'HEALTHY DRINKS', 'SHAKE', 'SPECIAL DRINKS', 'COFFEE'];
const matchingLines = [];
lines.forEach((l, idx) => {
  if (drinkCats.some(c => l.includes(`"${c}"`) || l.includes(`'${c}'`))) {
    matchingLines.push({ line: idx + 1, text: l.trim() });
  }
});
console.log('Total matches:', matchingLines.length);
console.log('First 5 matches:', matchingLines.slice(0, 5));
console.log('Last 5 matches:', matchingLines.slice(-5));
