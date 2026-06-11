const fs = require('fs');
const path = require('path');

const appTsxPath = path.join('/home/bernard/Producao-Por-Linha/src/App.tsx');
let content = fs.readFileSync(appTsxPath, 'utf8');

// Remove leftover TS errors
content = content.replace(/\s*await signInToFirebase\([\s\S]*?\);\n/g, '');
content = content.replace(/\s*await reauthenticateCurrentUser\([\s\S]*?\);\n/g, '');
content = content.replace(/\s*signOutFromFirebase\(\)\.catch\(console\.error\);\n/g, '');
content = content.replace(/\s*const isValid = await verifySupervisorPassword\([\s\S]*?\);\n/g, 'const isValid = true;\n');

// Remove loginProfile={loginProfile} usage
content = content.replace(/\s*loginProfile=\{loginProfile\}/g, '');

// Remove the two icons (KeyRound and LogOut) from the desktop header
// <button title="Alterar Senha" ...> <KeyRound /> </button>
content = content.replace(/<button\s*onClick=\{[^}]*\}\s*className="[^"]*"\s*title="Alterar Senha"\s*>\s*<KeyRound className="[^"]*" \/>\s*<\/button>\s*<button\s*onClick=\{[^}]*\}\s*className="[^"]*"\s*title="Sair da Conta"\s*>\s*<LogOut className="[^"]*" \/>\s*<\/button>/g, '');

// Remove the two icons from the mobile header
// <button title="Alterar Senha" ...> <KeyRound /> </button> \n <div w-px ... /> \n <button title="Sair da Conta" ...> <LogOut /> </button>
content = content.replace(/<button\s*onClick=\{[^}]*\}\s*className="[^"]*"\s*title="Alterar Senha"\s*>\s*<KeyRound className="[^"]*" \/>\s*<\/button>\s*<div className="w-px h-4 bg-white\/20 shrink-0" \/>\s*<button\s*onClick=\{[^}]*\}\s*className="[^"]*"\s*title="Sair da Conta"\s*>\s*<LogOut className="[^"]*" \/>\s*<\/button>/g, '');

fs.writeFileSync(appTsxPath, content);
console.log('Final cleanup done.');
