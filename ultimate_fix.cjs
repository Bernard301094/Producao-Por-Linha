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

// 8. Fix watchHoraInicial logic (always set shift to current if none is manually picked)
content = content.replace(
  /if \(!loginProfile\) \{\n\s*setValue\('turno', getSuggestedShift\(new Date\(\), watchHoraInicial\)\);\n\s*\} else \{\n\s*setValue\('turno', loginProfile\.replace\('Turno ', ''\)\);\n\s*\}/g,
  "setValue('turno', getSuggestedShift(new Date(), watchHoraInicial));"
);

// 9. Fix onParadaOnly (wait, did the user want to remove onParadaOnly? "parada avulsa não precisa mais")
content = content.replace(/\s*onParadaOnly=\{handleParadaOnly\}/g, '');
content = content.replace(/\s*onParadaOnly=\{async \(data: any, paradas: any\) => \{[\s\S]*?\}\}/g, '');
content = content.replace(/const handleParadaOnly = async \(data: StartOpFormValues, paradas: ParadaRecord\[\]\) => \{[\s\S]*?\}\s*const getStatusColor =/g, 'const getStatusColor =');

// 10. Remove login & supervisor methods
content = content.replace(/const handleLogin = async \(\) => \{[\s\S]*?\};\n\n  const handleChangePassword = async \(\) => \{[\s\S]*?\};\n\n  const handleLogout = async \(\) => \{[\s\S]*?\};\n/g, '');
content = content.replace(/const \[overrideModalOpen, setOverrideModalOpen\] = useState\(false\);\n  const \[overridePassword, setOverridePassword\] = useState\(''\);\n  const \[overrideReason, setOverrideReason\] = useState\(''\);\n  const \[pendingOverrideAction, setPendingOverrideAction\] = useState<\(\) => void \| null>\(null\);\n\n  const requireSupervisorOverride = \(action: \(\) => void\) => \{\n    setPendingOverrideAction\(\(\) => action\);\n    setOverridePassword\(''\);\n    setOverrideReason\(''\);\n    setOverrideModalOpen\(true\);\n  \};\n\n  const handleSupervisorOverride = async \(\) => \{[\s\S]*?\};\n/g, '');
content = content.replace(/\{overrideModalOpen && \([\s\S]*?\}\)\}/g, '');

// 11. Remove requireSupervisorOverride calls
content = content.replace(/requireSupervisorOverride\(\(\) => \{\n\s*(.*?)\n\s*\}\);/g, '$1\n');
content = content.replace(/requireSupervisorOverride\(\(\) => ([\s\S]*?)\);/g, '$1();');
content = content.replace(/requireSupervisorOverride\(([\s\S]*?)\);/g, '$1();');

// 12. Remove ALL auth imports
content = content.replace(/import \{ signInToFirebase, signOutFromFirebase, reauthenticateCurrentUser, verifySupervisorPassword \} from '\.\/api';/g, '');

// 13. Replace loginProfile ternary
content = content.replace(/loginProfile \? loginProfile\.replace\('Turno ', ''\) : data\.turno/g, "data.turno");
content = content.replace(/loginProfile \|\| 'UNKNOWN'/g, "currentTurnForView ? `Turno ${currentTurnForView}` : 'UNKNOWN'");

// 14. Remove loginProfile={loginProfile} prop
content = content.replace(/\s*loginProfile=\{loginProfile!?\}/g, '');

// 15. Fix ToleranceCountdown
content = content.replace(/<ToleranceCountdown[\s\S]*?\/>\n/g, '');

// 16. Remove the header buttons PROPERLY
content = content.replace(/<button[\s\S]*?className="w-9 h-9 flex items-center justify-center text-zinc-500 hover:text-zinc-900 rounded-xl hover:bg-zinc-100 transition-all focus-visible:outline-none"[\s\S]*?title="Alterar Senha"[\s\S]*?>\s*<KeyRound className="w-4 h-4" \/>\s*<\/button>/g, '');
content = content.replace(/<button[\s\S]*?className="w-9 h-9 flex items-center justify-center text-zinc-500 hover:text-red-600 rounded-xl hover:bg-red-50 border border-transparent hover:border-red-100 transition-all focus-visible:outline-none ml-0.5"[\s\S]*?title="Sair da Conta"[\s\S]*?>\s*<LogOut className="w-4 h-4" \/>\s*<\/button>/g, '');
content = content.replace(/<div className="w-px h-4 bg-white\/20 shrink-0" \/>/g, '');
content = content.replace(/<div className="flex items-center gap-1.5 px-3 py-1.5 bg-white\/10 rounded-lg text-white font-medium text-sm border border-white\/10 shadow-sm">\s*\{loginProfile\}\s*<\/div>/g, '');
content = content.replace(/<div className="hidden lg:flex items-center gap-3 px-3 py-1.5 bg-zinc-100 rounded-xl border border-zinc-200\/80 shadow-sm">\s*<div className="flex items-center gap-2">\s*<div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" \/>\s*<span className="text-sm font-bold text-zinc-700">\{loginProfile\}<\/span>\s*<\/div>\s*<\/div>/g, '');

// 17. ChangePasswordModal
content = content.replace(/<ChangePasswordModal[\s\S]*?\/>/g, '');

// 18. Fix isShiftAllowed argument
content = content.replace(/isShiftAllowed\(loginProfile\)/g, "isShiftAllowed(`Turno ${currentTurnForView}`)");

fs.writeFileSync(appTsxPath, content);
console.log('Ultimate script done');
