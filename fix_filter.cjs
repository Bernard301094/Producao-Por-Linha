const fs = require('fs');
const path = require('path');

const appTsxPath = path.join('/home/bernard/Producao-Por-Linha/src/App.tsx');
let content = fs.readFileSync(appTsxPath, 'utf8');

const targetStr = `  const [selectedLinhaPending, setSelectedLinhaPending] = useState('Todas');
  const [selectedLinhaFinished, setSelectedLinhaFinished] = useState('Todas');`;

const replaceStr = `  const defaultSavedLinha = localStorage.getItem('v-ops-default-linha') || 'Todas';
  const [selectedLinhaPending, _setSelectedLinhaPending] = useState(defaultSavedLinha);
  const [selectedLinhaFinished, _setSelectedLinhaFinished] = useState(defaultSavedLinha);

  const setSelectedLinhaPending = (val: string) => {
    _setSelectedLinhaPending(val);
    if (val !== 'Todas') localStorage.setItem('v-ops-default-linha', val);
  };
  const setSelectedLinhaFinished = (val: string) => {
    _setSelectedLinhaFinished(val);
    if (val !== 'Todas') localStorage.setItem('v-ops-default-linha', val);
  };`;

content = content.replace(targetStr, replaceStr);
fs.writeFileSync(appTsxPath, content);
console.log('Filter logic updated!');
