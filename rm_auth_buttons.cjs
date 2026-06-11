const fs = require('fs');
const path = require('path');

const appPath = path.join('/home/bernard/Producao-Por-Linha/src/App.tsx');
let content = fs.readFileSync(appPath, 'utf8');

// The desktop buttons block looks like:
// <button ... title="Alterar Senha" ... <KeyRound ... </button>
// <button ... title="Sair da Conta" ... <LogOut ... </button>
const desktopRegex = /<button[\s\S]*?title="Alterar Senha"[\s\S]*?<\/button>\s*<button[\s\S]*?title="Sair da Conta"[\s\S]*?<\/button>/m;

// The mobile buttons block looks like:
// <button ... title="Alterar Senha" ... <KeyRound ... </button>
// <div className="w-px h-4 bg-white\/20 shrink-0" \/>
// <button ... title="Sair da Conta" ... <LogOut ... </button>
const mobileRegex = /<button[\s\S]*?title="Alterar Senha"[\s\S]*?<\/button>\s*<div className="w-px h-4 bg-white\/20 shrink-0" \/>\s*<button[\s\S]*?title="Sair da Conta"[\s\S]*?<\/button>/m;

content = content.replace(desktopRegex, '');
content = content.replace(mobileRegex, '');

fs.writeFileSync(appPath, content);
console.log('Removed dead auth buttons');
