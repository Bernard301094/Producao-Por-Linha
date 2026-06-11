const fs = require('fs');
const path = require('path');

const appTsxPath = path.join('/home/bernard/Producao-Por-Linha/src/App.tsx');
let content = fs.readFileSync(appTsxPath, 'utf8');

content = content.replace(/doEditOp\(\)\(\)/g, 'doEditOp()');
content = content.replace(/doRevert\(\)\(\)/g, 'doRevert()');
content = content.replace(/doDelete\(\)\(\)/g, 'doDelete()');

content = content.replace(/const handleLogin = async \(\) => \{[\s\S]*?signInToFirebase[\s\S]*?\}\n  \};\n/g, '');
content = content.replace(/const handleChangePassword = async \(\) => \{[\s\S]*?reauthenticateCurrentUser[\s\S]*?\}\n  \};\n/g, '');
content = content.replace(/const handleLogout = async \(\) => \{[\s\S]*?signOutFromFirebase[\s\S]*?\}\n  \};\n/g, '');
content = content.replace(/const handleSupervisorOverride = async \(\) => \{[\s\S]*?verifySupervisorPassword[\s\S]*?\}\n  \};\n/g, '');

fs.writeFileSync(appTsxPath, content);
console.log('Fixed 7 errors.');
