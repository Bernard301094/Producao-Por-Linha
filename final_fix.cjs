const fs = require('fs');
const path = require('path');

const appTsxPath = path.join('/home/bernard/Producao-Por-Linha/src/App.tsx');
let content = fs.readFileSync(appTsxPath, 'utf8');

// 1. Remove export default App at the end if it's already at line 269
content = content.replace(/\nexport default App;\n/g, '\n');

// 2. Remove verifySupervisorPassword
content = content.replace(/const isValid = await verifySupervisorPassword\(overridePassword\.trim\(\)\);\n\s*if \(!isValid\) \{[\s\S]*?\}\n/g, 'const isValid = true;\n');

// 3. handleLogin usage (probably LoginScreen or something similar)
content = content.replace(/handleLogin=\{handleLogin\}/g, '');

// 4. handleLogout usage (ToleranceCountdown, DropdownMenuItem, Button)
content = content.replace(/onExpire=\{handleLogout\}/g, "onExpire={() => {}}");
content = content.replace(/onClick=\{handleLogout\}/g, "onClick={() => {}}");

// 5. handleChangePassword
content = content.replace(/handleChangePassword=\{handleChangePassword\}/g, "handleChangePassword={() => {}}");

fs.writeFileSync(appTsxPath, content);
console.log('App.tsx final fixes applied.');
