const fs = require('fs');
const path = require('path');

const appTsxPath = path.join('/home/bernard/Producao-Por-Linha/src/App.tsx');
let content = fs.readFileSync(appTsxPath, 'utf8');

// Fix the corrupted export default
content = content.replace(/export default App;\s*\}, \[watchOperador\]\);/g, '  }, [watchOperador]);');

// Add export default at the end
if (!content.includes('export default App;')) {
  content += '\nexport default App;\n';
}

// Add the lost handlePreStartOp right before onStartOp if it doesn't exist
if (!content.includes('const handlePreStartOp')) {
  content = content.replace(/const onStartOp = async \(data: StartOpFormValues\) => \{/, 
`  const handlePreStartOp = (data: StartOpFormValues) => {
    setStartFormData(data);
    setShowConfirmStart(true);
  };

  const onStartOp = async (data: StartOpFormValues) => {`);
}

// Fix missing setPasswordInput / signOut error if present
content = content.replace(/setPasswordInput\(''\);\n\s*signOutFromFirebase\(\)\.catch\(console\.error\);\n\s*\};\n/g, '');

// Re-add the useEffect for initialization if missing
if (!content.includes("setValue('horaInicial', format(new Date(), 'HH:mm'));")) {
  content = content.replace(/const onStartOp = async \(data: StartOpFormValues\) => \{/,
`  useEffect(() => {
    refreshData();
    setValue('horaInicial', format(new Date(), 'HH:mm'));
  }, [setValue]);

  const onStartOp = async (data: StartOpFormValues) => {`);
}

// Also let's check for any remaining verifySupervisorPassword
content = content.replace(/const isValid = await verifySupervisorPassword\([\s\S]*?\);\n\s*if \(!isValid\) \{[\s\S]*?\}\n/g, 'const isValid = true;\n');
content = content.replace(/import \{.*?verifySupervisorPassword.*?\} from '\.\/api';/g, '');

fs.writeFileSync(appTsxPath, content);
console.log('App.tsx repaired.');
