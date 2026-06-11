const fs = require('fs');
const path = require('path');

const appPath = path.join('/home/bernard/Producao-Por-Linha/src/App.tsx');
let content = fs.readFileSync(appPath, 'utf8');

const targetEffect = `  useEffect(() => {
    if (selectedLinhaPending !== 'Todas') {
      setValue('linha', selectedLinhaPending.replace('Linha ', ''));
    }
  }, [selectedLinhaPending, setValue]);`;

// Remove it from its current position
content = content.replace(targetEffect, '');

// Insert it right after the useForm block
const insertPoint = `    defaultValues: { opNumber: '', produto: '', linha: '', turno: '', horaInicial: '' }
  });`;

content = content.replace(insertPoint, insertPoint + '\n\n' + targetEffect);

fs.writeFileSync(appPath, content);
console.log('Moved useEffect');
