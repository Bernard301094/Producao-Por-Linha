const fs = require('fs');
const path = require('path');

const appPath = path.join('/home/bernard/Producao-Por-Linha/src/App.tsx');
let content = fs.readFileSync(appPath, 'utf8');

// The multi-replace messed up from normalizeLinha to finishedLinhas.
// Let's replace the whole section.
const badRegex = /\/\/ Normalize linha names[\s\S]*?\}, \[myFinishedOps\]\);/m;

const goodContent = `  // Normalize linha names: 'Linha 05' and '05' both become '05'
  const normalizeLinha = (l: string) => {
    if (!l) return l;
    const match = l.trim().match(/\\d+/);
    return match ? match[0] : l.trim();
  };

  const pendingLinhas = useMemo(() => {
    if (selectedLinhaPending !== 'Todas') return [selectedLinhaPending, 'Todas'];
    const lines = new Set(myPendingOps.map(op => normalizeLinha(op.linha)).filter(Boolean));
    return ['Todas', ...Array.from(lines).sort((a, b) => {
      const matchA = a.match(/\\d+/);
      const matchB = b.match(/\\d+/);
      if (matchA && matchB) return parseInt(matchA[0], 10) - parseInt(matchB[0], 10);
      return a.localeCompare(b);
    })];
  }, [myPendingOps, selectedLinhaPending]);

  const finishedLinhas = useMemo(() => {
    if (selectedLinhaFinished !== 'Todas') return [selectedLinhaFinished, 'Todas'];
    const lines = new Set(myFinishedOps.map(op => normalizeLinha(op.linha)).filter(Boolean));
    return ['Todas', ...Array.from(lines).sort((a, b) => {
      const matchA = a.match(/\\d+/);
      const matchB = b.match(/\\d+/);
      if (matchA && matchB) return parseInt(matchA[0], 10) - parseInt(matchB[0], 10);
      return a.localeCompare(b);
    })];
  }, [myFinishedOps, selectedLinhaFinished]);`;

content = content.replace(badRegex, goodContent);

fs.writeFileSync(appPath, content);
console.log('App.tsx fixed');
