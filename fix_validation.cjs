const fs = require('fs');
const path = require('path');

const appTsxPath = path.join('/home/bernard/Producao-Por-Linha/src/App.tsx');
let content = fs.readFileSync(appTsxPath, 'utf8');

// Replace loginProfile checks with Turno checks in onStartOp
content = content.replace(/if \(loginProfile\) \{\s*const shiftCheck = isShiftAllowed\(loginProfile\);/g, 
`const formTurno = typeof data !== 'undefined' && data.turno ? (data.turno.startsWith('Turno') ? data.turno : 'Turno ' + data.turno) : currentTurnForView;
    const shiftCheck = isShiftAllowed(formTurno);
    if (true) {`);

// In confirmDelete, deletingOp is used
content = content.replace(/const shiftCheck = isShiftAllowed\(loginProfile\);/g, 
`const shiftCheck = isShiftAllowed(typeof deletingOp !== 'undefined' && deletingOp ? 'Turno ' + deletingOp.turno : currentTurnForView);`);

// In onConvertToOp / onEditOp
// They were using loginProfile... wait, I'll just change all `isShiftAllowed(loginProfile)` 
content = content.replace(/isShiftAllowed\(loginProfile\)/g, "isShiftAllowed(currentTurnForView)");
content = content.replace(/isShiftAllowed\(loginProfile \|\| 'UNKNOWN'\)/g, "isShiftAllowed(currentTurnForView)");
content = content.replace(/loginProfile/g, "currentTurnForView"); // this handles logAudit userProfile

fs.writeFileSync(appTsxPath, content);
console.log('App.tsx turn blocking fixes applied.');
