const fs = require('fs');
const path = require('path');

const appTsxPath = path.join('/home/bernard/Producao-Por-Linha/src/App.tsx');
let content = fs.readFileSync(appTsxPath, 'utf8');
const lines = content.split('\n');

lines.forEach((l, i) => {
    if (l.includes('setLoginProfile(')) {
        lines[i] = '';
    }
});

// Fix duplicate props
let dup1Idx = lines.findIndex((l, i) => i > 1500 && l.includes('currentTurnForView={currentTurnForView}'));
if (dup1Idx !== -1) lines[dup1Idx] = '';

let dup2Idx = lines.findIndex((l, i) => i > 1650 && l.includes('currentTurnForView={currentTurnForView}'));
if (dup2Idx !== -1) lines[dup2Idx] = '';

fs.writeFileSync(appTsxPath, lines.join('\n'));
console.log('Fixed 5 remaining errors!');
