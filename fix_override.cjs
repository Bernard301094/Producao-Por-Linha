const fs = require('fs');
const path = require('path');

const appTsxPath = path.join('/home/bernard/Producao-Por-Linha/src/App.tsx');
let content = fs.readFileSync(appTsxPath, 'utf8');

// Remove overrideReason from logAudit
content = content.replace(/,\s*reason:\s*overrideReason\s*\|\|\s*undefined/g, '');

// Remove the Override Dialog JSX block completely
content = content.replace(/<Dialog open=\{overrideModalOpen\}[\s\S]*?<\/Dialog>/g, '');

fs.writeFileSync(appTsxPath, content);
console.log('App.tsx final Override fixes applied.');
