const fs = require('fs');
const path = require('path');

const appTsxPath = path.join('/home/bernard/Producao-Por-Linha/src/App.tsx');
let content = fs.readFileSync(appTsxPath, 'utf8');

if (!content.includes('function extractLitragem')) {
  content = content.replace(/export default function App\(\) \{/, 
`export default function App() {
  function extractLitragem(produto: string): string {
    const upper = (produto || '').toUpperCase();
    if (upper.includes(' IBC')) return 'IBC';
    const match = produto.match(/(\\d+(?:,\\d+)?)\\s*(L|ML|G|KG)\\b/i);
    if (match) {
      const unit = match[2].toUpperCase();
      const num = match[1];
      if (unit === 'L') return num === '1' ? '1 Litro' : \`\${num} Litros\`;
      if (unit === 'ML') return \`\${num}ml\`;
      if (unit === 'G') return \`\${num}g\`;
      if (unit === 'KG') return \`\${num}Kg\`;
    }
    return '';
  }
`);
}

fs.writeFileSync(appTsxPath, content);
console.log('extractLitragem added back.');
