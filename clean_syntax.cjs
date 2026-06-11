const fs = require('fs');
const path = require('path');

const appTsxPath = path.join('/home/bernard/Producao-Por-Linha/src/App.tsx');
let content = fs.readFileSync(appTsxPath, 'utf8');

// Remove leftover loginLoading
content = content.replace(/loginLoading=\{loginLoading\}[\s\S]*?\/>\n\s*<\/>\n\s*\);\n\s*\}/g, '');

fs.writeFileSync(appTsxPath, content);
console.log('App.tsx final syntax fixes applied.');
