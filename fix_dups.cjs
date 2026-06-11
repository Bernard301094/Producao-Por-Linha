const fs = require('fs');
const path = require('path');

const appTsxPath = path.join('/home/bernard/Producao-Por-Linha/src/App.tsx');
let content = fs.readFileSync(appTsxPath, 'utf8');

const lines = content.split('\n');

// We know the exact duplicate lines from grep output:
// Line 1321 and 1499. Let's just clear those lines specifically.
if (lines[1320].includes('currentTurnForView={currentTurnForView}')) {
  lines[1320] = '';
}
if (lines[1498].includes('currentTurnForView={currentTurnForView}')) {
  lines[1498] = '';
}

fs.writeFileSync(appTsxPath, lines.join('\n'));
console.log('Duplicate props removed.');
