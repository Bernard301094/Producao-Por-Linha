const fs = require('fs');
const path = require('path');

const appPath = path.join('/home/bernard/Producao-Por-Linha/src/App.tsx');
let content = fs.readFileSync(appPath, 'utf8');

// 1. Remove loginProfile={loginProfile} prop
content = content.replace(/\s*loginProfile=\{loginProfile\}/g, '');

// 2. Remove handleLogin
content = content.replace(/const handleLogin = async \(\) => \{[\s\S]*?setLoginLoading\(false\);\n  \};\n\n/g, '');

// 3. Remove handleChangePassword
content = content.replace(/const handleChangePassword = async \(\) => \{[\s\S]*?\} finally \{\n      setChangePasswordLoading\(false\);\n    \}\n  \};\n\n/g, '');

// 4. Remove handleLogout
content = content.replace(/const handleLogout = async \(\) => \{[\s\S]*?signOutFromFirebase\(\)\.catch\(console\.error\);\n  \};\n/g, '');

// 5. Remove verifySupervisorPassword call in requireSupervisorOverride
content = content.replace(/const requireSupervisorOverride = \(action: \(\) => void\) => \{\n[\s\S]*?\n  \};\n/g, '');
content = content.replace(/const handleSupervisorOverride = async \(\) => \{[\s\S]*?setOverrideModalOpen\(false\);\n    \}\n  \};\n/g, '');
content = content.replace(/const \[overrideModalOpen, setOverrideModalOpen\] = useState\(false\);\n  const \[overridePassword, setOverridePassword\] = useState\(''\);\n  const \[overrideReason, setOverrideReason\] = useState\(''\);\n  const \[pendingOverrideAction, setPendingOverrideAction\] = useState<\(\) => void \| null>\(null\);\n/g, '');

// 6. Replace requireSupervisorOverride calls
content = content.replace(/requireSupervisorOverride\(\(\) => \{\n\s*(.*?)\n\s*\}\);/g, '$1');

// 7. Remove ChangePasswordModal rendering
content = content.replace(/<ChangePasswordModal[\s\S]*?\/>\n/g, '');

// 8. Remove override modal rendering
content = content.replace(/\{overrideModalOpen && \([\s\S]*?<\/div>\n          <\/div>\n        \)\}\n/g, '');

// 9. Fix ToleranceCountdown
content = content.replace(/<ToleranceCountdown[\s\S]*?\/>\n/g, '');

// 10. Remove the header buttons properly (non-greedy)
const desktopRegex = /<button[\s\S]*?title="Alterar Senha"[\s\S]*?<\/button>\s*<button[\s\S]*?title="Sair da Conta"[\s\S]*?<\/button>/;
const mobileRegex = /<button[\s\S]*?title="Alterar Senha"[\s\S]*?<\/button>\s*<div className="w-px h-4 bg-white\/20 shrink-0" \/>\s*<button[\s\S]*?title="Sair da Conta"[\s\S]*?<\/button>/;
content = content.replace(desktopRegex, '');
content = content.replace(mobileRegex, '');

fs.writeFileSync(appPath, content);
console.log('Cleaned auth leftovers properly');
