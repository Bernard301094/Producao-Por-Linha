const fs = require('fs');
const path = require('path');

const appPath = path.join('/home/bernard/Producao-Por-Linha/src/App.tsx');
let content = fs.readFileSync(appPath, 'utf8');

content = content.replace(/import \{ LoginScreen \} from '\.\/components\/LoginScreen\/LoginScreen';\n/g, '');

content = content.replace(/\/\/ ─── Tela de Login ────────────────────────────────────────────────────────\n\s*if \(!loginProfile\) \{\n\s*return \(\n\s*<>\n\s*<Toaster position="top-center" \/>\n\s*<LoginScreen[\s\S]*?\/>\n\s*<\/>\n\s*\);\n\s*\}\n/g, '');

content = content.replace(/const \[loginProfile, setLoginProfile\] = useState<string \| null>\(null\);\n/g, '');
content = content.replace(/const \[selectedProfile, setSelectedProfile\] = useState<string \| null>\(null\);\n/g, '');
content = content.replace(/const \[passwordInput, setPasswordInput\] = useState\(''\);\n/g, '');
content = content.replace(/const \[showPassword, setShowPassword\] = useState\(false\);\n/g, '');
content = content.replace(/const \[loginLoading, setLoginLoading\] = useState\(false\);\n/g, '');

fs.writeFileSync(appPath, content);
console.log('LoginScreen removed completely.');
