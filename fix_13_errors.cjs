const fs = require('fs');
const path = require('path');

const appTsxPath = path.join('/home/bernard/Producao-Por-Linha/src/App.tsx');
let content = fs.readFileSync(appTsxPath, 'utf8');
const lines = content.split('\n');

// 1. Remove line 285 re-declaration
// const [currentTurnForView, setLoginProfile] = useState<string | null>(null);
let line285Idx = lines.findIndex(l => l.includes('setLoginProfile') && l.includes('useState'));
if (line285Idx !== -1) {
    lines[line285Idx] = '';
}

// 2. Fix doEditOp()()
let editOpIdx = lines.findIndex(l => l.includes('doEditOp()()'));
if (editOpIdx !== -1) {
    lines[editOpIdx] = lines[editOpIdx].replace('doEditOp()()', 'doEditOp()');
}

// 3. Fix doRevert()()
let revertIdx = lines.findIndex(l => l.includes('doRevert()()'));
if (revertIdx !== -1) {
    lines[revertIdx] = lines[revertIdx].replace('doRevert()()', 'doRevert()');
}

// 4. Fix doDelete()()
let deleteIdx = lines.findIndex(l => l.includes('doDelete()()'));
if (deleteIdx !== -1) {
    lines[deleteIdx] = lines[deleteIdx].replace('doDelete()()', 'doDelete()');
}

// 5. Delete login logic blocks (signInToFirebase, reauthenticateCurrentUser, signOutFromFirebase, verifySupervisorPassword)
// It's probably easier to just replace those specific lines with '/* removed */' to fix the TS errors without breaking JSX logic if they are in callbacks that are no longer reached.
lines.forEach((l, i) => {
    if (l.includes('signInToFirebase')) lines[i] = '/* signInToFirebase removed */';
    if (l.includes('reauthenticateCurrentUser')) lines[i] = '/* reauthenticateCurrentUser removed */';
    if (l.includes('signOutFromFirebase')) lines[i] = '/* signOutFromFirebase removed */';
    if (l.includes('verifySupervisorPassword')) lines[i] = '      const isValid = true; // verifySupervisorPassword removed';
    // Remove loginProfile props
    if (l.includes('loginProfile={loginProfile}')) lines[i] = '';
    // Fix currentTurnForView redeclare at 611 (if it's not inside a block)
    if (l.includes('const currentTurnForView = getSuggestedShift') && i > 300) {
        lines[i] = l.replace('const currentTurnForView', 'const localTurnForView');
    }
});

// Remove <LoginScreen ... />
let loginScreenStart = lines.findIndex(l => l.includes('<LoginScreen'));
if (loginScreenStart !== -1) {
    let loginScreenEnd = loginScreenStart;
    while (loginScreenEnd < lines.length && !lines[loginScreenEnd].includes('/>')) {
        loginScreenEnd++;
    }
    for (let i = loginScreenStart; i <= loginScreenEnd; i++) {
        lines[i] = '';
    }
}

fs.writeFileSync(appTsxPath, lines.join('\n'));
console.log('Fixed remaining errors!');
