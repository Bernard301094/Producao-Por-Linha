const fs = require('fs');
const path = require('path');

const appTsxPath = path.join('/home/bernard/Producao-Por-Linha/src/App.tsx');
let appContent = fs.readFileSync(appTsxPath, 'utf8');

// 1. Fix extractLitragem
appContent = appContent.replace(/function extractLitragem\(produto: string\): string \{\n    const upper = \(produto \|\| ''\)\.toUpperCase\(\);\n/g, 
`function extractLitragem(produto: string): string {
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

// 2. Remove the second declaration of currentTurnForView
appContent = appContent.replace(/const currentTurnForView = getSuggestedShift\(new Date\(\), format\(new Date\(\), 'HH:mm'\)\);\n\n  const refreshData = async \(\) =>/g, 
  "  const refreshData = async () =>");

// 3. Fix duplicates
appContent = appContent.replace(/currentTurnForView=\{currentTurnForView\}\s*currentTurnForView=\{currentTurnForView\}/g, 'currentTurnForView={currentTurnForView}');

fs.writeFileSync(appTsxPath, appContent);

const editOpPath = path.join('/home/bernard/Producao-Por-Linha/src/components/EditOpModal/EditOpModal.tsx');
let editContent = fs.readFileSync(editOpPath, 'utf8');
editContent = editContent.replace(/disabled=\{!!loginProfile\}/g, 'disabled={false}');
fs.writeFileSync(editOpPath, editContent);

console.log('Final clean applied');
