const fs = require('fs');
const path = require('path');

const appTsxPath = path.join('/home/bernard/Producao-Por-Linha/src/App.tsx');
let content = fs.readFileSync(appTsxPath, 'utf8');

// 1. Remove login states
content = content.replace(/const \[loginProfile, setLoginProfile\] = useState<string \| null>\(null\);\n/g, '');
content = content.replace(/const \[selectedProfile, setSelectedProfile\] = useState<string \| null>\(null\);\n/g, '');
content = content.replace(/const \[passwordInput, setPasswordInput\] = useState\(''\);\n/g, '');
content = content.replace(/const \[showPassword, setShowPassword\] = useState\(false\);\n/g, '');
content = content.replace(/const \[loginLoading, setLoginLoading\] = useState\(false\);\n/g, '');

// 2. Remove LoginScreen import and component usage
content = content.replace(/import \{ LoginScreen \} from '\.\/components\/LoginScreen\/LoginScreen';\n/g, '');
content = content.replace(/\/\/ ─── Tela de Login ────────────────────────────────────────────────────────\s*if \(!loginProfile\) \{[\s\S]*?\}\n\n/g, '');

// 3. Update startOpSchema to add operador
content = content.replace(
  /horaInicial: z\.string\(\)\.min\(1, 'Obrigatório'\),\n\}\);/g,
  "horaInicial: z.string().min(1, 'Obrigatório'),\n  operador: z.string().min(1, 'Obrigatório'),\n});"
);

// 4. Update defaultValues to include operador and use localStorage
content = content.replace(
  /defaultValues: \{ opNumber: '', produto: '', linha: localStorage\.getItem\('v-ops-default-linha'\) \|\| '', turno: '', horaInicial: '' \}/g,
  "defaultValues: { opNumber: '', produto: '', linha: localStorage.getItem('v-ops-default-linha') || '', turno: '', horaInicial: '', operador: localStorage.getItem('v-ops-default-operador') || '' }"
);

// 5. Add watchOperador
content = content.replace(
  /const watchLinha = watch\('linha'\);/g,
  "const watchLinha = watch('linha');\n  const watchOperador = watch('operador');\n\n  useEffect(() => {\n    if (watchOperador) {\n      localStorage.setItem('v-ops-default-operador', watchOperador);\n    }\n  }, [watchOperador]);"
);

// 6. Fix `currentTurnForView`
content = content.replace(
  /const currentTurnForView = loginProfile\s*\?\s*loginProfile\.replace\('Turno ', ''\)\s*:\s*getSuggestedShift\(new Date\(\), format\(new Date\(\), 'HH:mm'\)\);/g,
  "const currentTurnForView = getSuggestedShift(new Date(), format(new Date(), 'HH:mm'));"
);

// 7. Remove useEffect storing loginProfile
content = content.replace(
  /const storedProfile = localStorage\.getItem\('loginProfile'\);\n\s*if \(storedProfile\) \{\n\s*setLoginProfile\(storedProfile\);\n\s*setValue\('turno', storedProfile\.replace\('Turno ', ''\)\);\n\s*\}/g,
  ""
);

// 8. Fix watchHoraInicial logic (always set shift to current if none is manually picked, or just set to suggested shift)
content = content.replace(
  /if \(!loginProfile\) \{\n\s*setValue\('turno', getSuggestedShift\(new Date\(\), watchHoraInicial\)\);\n\s*\} else \{\n\s*setValue\('turno', loginProfile\.replace\('Turno ', ''\)\);\n\s*\}/g,
  "setValue('turno', getSuggestedShift(new Date(), watchHoraInicial));"
);

// 9. Remove all handleLogin, handleChangePassword, handleLogout, ToleranceCountdown, and firebase imports from api
content = content.replace(/signInToFirebase, signOutFromFirebase, reauthenticateCurrentUser, verifySupervisorPassword /g, '');

// Replace any occurrence of `loginProfile ? loginProfile.replace('Turno ', '') : data.turno` with `data.turno`
content = content.replace(/loginProfile \? loginProfile\.replace\('Turno ', ''\) : data\.turno/g, "data.turno");

fs.writeFileSync(appTsxPath, content);
console.log('Done refactoring basic auth states.');
