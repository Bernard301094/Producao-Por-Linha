const fs = require('fs');
const path = require('path');

const appTsxPath = path.join('/home/bernard/Producao-Por-Linha/src/App.tsx');
let content = fs.readFileSync(appTsxPath, 'utf8');

// Find the last occurrence of '}' and remove it
const lastIndex = content.lastIndexOf('}');
if (lastIndex !== -1) {
  content = content.substring(0, lastIndex) + content.substring(lastIndex + 1);
  fs.writeFileSync(appTsxPath, content);
  console.log('Extra } removed.');
} else {
  console.log('No } found.');
}
