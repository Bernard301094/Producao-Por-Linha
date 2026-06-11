const fs = require('fs');
const path = require('path');

const appTsxPath = path.join('/home/bernard/Producao-Por-Linha/src/App.tsx');
let content = fs.readFileSync(appTsxPath, 'utf8');

content += '\n}\n';

fs.writeFileSync(appTsxPath, content);
console.log('Added } at EOF');
