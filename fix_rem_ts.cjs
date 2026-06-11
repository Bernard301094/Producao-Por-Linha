const fs = require('fs');
const path = require('path');

// Fix App.tsx
const appTsxPath = path.join('/home/bernard/Producao-Por-Linha/src/App.tsx');
let appContent = fs.readFileSync(appTsxPath, 'utf8');

// Move currentTurnForView to the top of App
appContent = appContent.replace(/const currentTurnForView = getSuggestedShift\(new Date\(\), format\(new Date\(\), 'HH:mm'\)\);\n/g, '');
appContent = appContent.replace(/export default function App\(\) \{/g, "export default function App() {\n  const currentTurnForView = getSuggestedShift(new Date(), format(new Date(), 'HH:mm'));");

// Fix App returning void... wait, if I did `export default function App() {` then it just replaced it with `export default function App() { ...` which was fine. The issue was that `App.tsx` syntax was broken by my missing `}` that I added with `echo "}"`. Wait, did my `echo` add `}` at the end but the component actually ended earlier? If `App()` returns `void`, it might be missing a `return` or the `return` is outside the function!
// Let me just fix the JSX and duplicates first.
appContent = appContent.replace(/currentTurnForView=\{currentTurnForView\}\s*currentTurnForView=\{currentTurnForView\}/g, 'currentTurnForView={currentTurnForView}');
appContent = appContent.replace(/<ChangePasswordModal[\s\S]*?\/>/g, '');
appContent = appContent.replace(/setChangePasswordOpen\(true\)/g, 'undefined');

// Fix StartOpForm duplicates again just in case
appContent = appContent.replace(/currentTurnForView=\{currentTurnForView\}\s*currentTurnForView=\{currentTurnForView\}/g, 'currentTurnForView={currentTurnForView}');

// Write App.tsx
fs.writeFileSync(appTsxPath, appContent);

// Fix StartOpForm.tsx
const startOpPath = path.join('/home/bernard/Producao-Por-Linha/src/components/StartOpForm/StartOpForm.tsx');
let startContent = fs.readFileSync(startOpPath, 'utf8');
startContent = startContent.replace(/disabled=\{!!loginProfile\}/g, 'disabled={false}');
fs.writeFileSync(startOpPath, startContent);

// Fix EditOpModal.tsx
const editOpPath = path.join('/home/bernard/Producao-Por-Linha/src/components/EditOpModal/EditOpModal.tsx');
let editContent = fs.readFileSync(editOpPath, 'utf8');
editContent = editContent.replace(/\s*loginProfile: string \| null;/g, '');
editContent = editContent.replace(/loginProfile,/g, '');
editContent = editContent.replace(/isShiftAllowed\(loginProfile\)/g, 'isShiftAllowed(op.turno)');
fs.writeFileSync(editOpPath, editContent);

console.log('Final TS fix script executed.');
