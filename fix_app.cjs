const fs = require('fs');
const path = require('path');

const appTsxPath = path.join('/home/bernard/Producao-Por-Linha/src/App.tsx');
let content = fs.readFileSync(appTsxPath, 'utf8');

// 1. Add operador to schema
content = content.replace(
  /horaInicial: z\.string\(\)\.min\(1, 'Obrigatório'\),\n\}\);/,
  "horaInicial: z.string().min(1, 'Obrigatório'),\n  operador: z.string().min(1, 'Obrigatório'),\n});"
);

// 2. Remove onParadaOnly
content = content.replace(/\s*onParadaOnly=\{handleParadaOnly\}/g, '');
content = content.replace(/\s*onParadaOnly=\{async \(data: any, paradas: any\) => \{[\s\S]*?\}\}/g, '');
content = content.replace(/const handleParadaOnly = async \(data: StartOpFormValues, paradas: ParadaRecord\[\]\) => \{[\s\S]*?\}\s*const getStatusColor =/g, 'const getStatusColor =');

// 3. Remove login & supervisor methods
content = content.replace(/const handleLogin = async \(\) => \{[\s\S]*?\};\n\n  const handleChangePassword = async \(\) => \{[\s\S]*?\};\n\n  const handleLogout = async \(\) => \{[\s\S]*?\};\n/g, '');

content = content.replace(/const \[overrideModalOpen, setOverrideModalOpen\] = useState\(false\);\n  const \[overridePassword, setOverridePassword\] = useState\(''\);\n  const \[overrideReason, setOverrideReason\] = useState\(''\);\n  const \[pendingOverrideAction, setPendingOverrideAction\] = useState<\(\) => void \| null>\(null\);\n\n  const requireSupervisorOverride = \(action: \(\) => void\) => \{\n    setPendingOverrideAction\(\(\) => action\);\n    setOverridePassword\(''\);\n    setOverrideReason\(''\);\n    setOverrideModalOpen\(true\);\n  \};\n\n  const handleSupervisorOverride = async \(\) => \{[\s\S]*?\};\n/g, '');

content = content.replace(/import \{ signInToFirebase, signOutFromFirebase, reauthenticateCurrentUser, verifySupervisorPassword \} from '\.\/api';/g, '');

content = content.replace(/import \{ getProducts, addProduct, getParadas, getLinhas, getProfiles \} from '\.\/api';/g, 'import { getProducts, addProduct, getParadas, getLinhas, getProfiles } from \'./api\';');

// Let's remove the whole Override Modal JSX
content = content.replace(/\{overrideModalOpen && \([\s\S]*?\}\)\}/g, '');

// If requireSupervisorOverride calls still exist, replace them with just running the action directly or a toast
content = content.replace(/requireSupervisorOverride\(\(\) => ([\s\S]*?)\);/g, '$1();');
content = content.replace(/requireSupervisorOverride\(([\s\S]*?)\);/g, '$1();');

// 4. defaultValues & watchOperador were failing because of defaultValues schema and watch('operador') missing
// We added `operador` to schema, which should fix the TS error for both defaultValues and watch.
// BUT let's make sure defaultValues has operador
if (!content.includes("operador: localStorage.getItem('v-ops-default-operador') || ''")) {
  content = content.replace(
    /defaultValues: \{ opNumber: '', produto: '', linha: localStorage\.getItem\('v-ops-default-linha'\) \|\| '', turno: '', horaInicial: '' \}/g,
    "defaultValues: { opNumber: '', produto: '', linha: localStorage.getItem('v-ops-default-linha') || '', turno: '', horaInicial: '', operador: localStorage.getItem('v-ops-default-operador') || '' }"
  );
}

fs.writeFileSync(appTsxPath, content);
console.log('Fixed TS errors.');
