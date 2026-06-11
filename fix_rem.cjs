const fs = require('fs');
const path = require('path');

const appPath = path.join('/home/bernard/Producao-Por-Linha/src/App.tsx');
let content = fs.readFileSync(appPath, 'utf8');

// Delete the LoginScreen block exactly by finding its start and end
const startStr = '// ─── Tela de Login ────────────────────────────────────────────────────────';
const endStr = '  const today = format(new Date(), \'dd/MM/yyyy\');';

if (content.includes(startStr) && content.includes(endStr)) {
  const parts = content.split(startStr);
  const before = parts[0];
  const rest = parts[1];
  const endParts = rest.split(endStr);
  if (endParts.length > 1) {
    content = before + '\n' + endStr + endParts[1];
  }
}

// Delete loginProfile={loginProfile}
content = content.replace(/\s*loginProfile=\{loginProfile\}\n/g, '\n');
content = content.replace(/\s*loginProfile=\{loginProfile\}\s*/g, ' ');

// Delete signInToFirebase and its call
content = content.replace(/import \{ signInToFirebase, signOutFromFirebase, reauthenticateCurrentUser, verifySupervisorPassword \} from '\.\/api';/g, '');
content = content.replace(/await signInToFirebase\([\s\S]*?\);/g, '');
content = content.replace(/await reauthenticateCurrentUser\([\s\S]*?\);/g, '');
content = content.replace(/signOutFromFirebase\(\)\.catch\(console\.error\);/g, '');
content = content.replace(/const isValid = await verifySupervisorPassword\([\s\S]*?\);/g, 'const isValid = true;');

fs.writeFileSync(appPath, content);
console.log('Done.');
