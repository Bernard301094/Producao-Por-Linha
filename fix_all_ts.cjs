const fs = require('fs');
const path = require('path');

const appTsxPath = path.join('/home/bernard/Producao-Por-Linha/src/App.tsx');
let content = fs.readFileSync(appTsxPath, 'utf8');

// 1. Remove the redeclaration of currentTurnForView (was loginProfile)
content = content.replace(/const \[currentTurnForView, setLoginProfile\] = useState<string \| null>\(null\);\n/g, '');

// 2. Fix the `data.turno` inside functions where `data` does not exist
// The regex `const formTurno = typeof data !== 'undefined' ...` needs to be reverted where data isn't defined.
content = content.replace(/const formTurno = typeof data !== 'undefined' && data\.turno \? \(data\.turno\.startsWith\('Turno'\) \? data\.turno : 'Turno ' \+ data\.turno\) : currentTurnForView;\n\s*const shiftCheck = isShiftAllowed\(formTurno\);/g, "const shiftCheck = isShiftAllowed(currentTurnForView);");

// Actually, in onStartOp `data` exists, let's keep it there
content = content.replace(/const onStartOp = async \(data: StartOpFormValues\) => \{\n\n\s*const shiftCheck = isShiftAllowed\(currentTurnForView\);/g, 
  `const onStartOp = async (data: StartOpFormValues) => {
    const shiftCheck = isShiftAllowed('Turno ' + data.turno);`);

// 3. Remove duplicate currentTurnForView={currentTurnForView}
content = content.replace(/currentTurnForView=\{currentTurnForView\}\s*currentTurnForView=\{currentTurnForView\}/g, 'currentTurnForView={currentTurnForView}');
content = content.replace(/currentTurnForView=\{currentTurnForView!\}\s*currentTurnForView=\{currentTurnForView\}/g, 'currentTurnForView={currentTurnForView}');

// 4. Remove currentTurnForView from EditOpModal and ChangePasswordModal
content = content.replace(/<EditOpModal[\s\S]*?currentTurnForView=\{currentTurnForView\}[\s\S]*?\/>/g, (match) => {
  return match.replace(/\s*currentTurnForView=\{currentTurnForView\}/g, '');
});
content = content.replace(/<ChangePasswordModal[\s\S]*?currentTurnForView=\{currentTurnForView!\}[\s\S]*?\/>/g, (match) => {
  return match.replace(/\s*currentTurnForView=\{currentTurnForView!\}/g, '');
});

fs.writeFileSync(appTsxPath, content);

// StartOpForm.tsx
const formTsxPath = path.join('/home/bernard/Producao-Por-Linha/src/components/StartOpForm/StartOpForm.tsx');
let formContent = fs.readFileSync(formTsxPath, 'utf8');
formContent = formContent.replace(/\s*loginProfile: string \| null;/g, '');
formContent = formContent.replace(/loginProfile,/g, '');
// Also remove checking loginProfile inside StartOpForm
formContent = formContent.replace(/const shiftCheck = isShiftAllowed\(loginProfile\);/g, 'const shiftCheck = isShiftAllowed(currentTurnForView);');
formContent = formContent.replace(/if \(!loginProfile\) return true;/g, 'if (!currentTurnForView) return true;');
fs.writeFileSync(formTsxPath, formContent);

console.log('App.tsx and StartOpForm.tsx TS errors fixed.');
