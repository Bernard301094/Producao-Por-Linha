const normalizeLinha = (l) => {
  if (!l) return l;
  const match = l.trim().match(/\d+/);
  return match ? parseInt(match[0], 10).toString() : l.trim().toLowerCase();
};

const myPendingOps = [
  { id: 1, linha: 'Linha 01' },
  { id: 2, linha: 'Linha 02' },
  { id: 3, linha: '03' }
];

const selectedLinha = '1';

const visiblePendingOps = myPendingOps.filter(op => {
  if (selectedLinha !== 'Todas' && normalizeLinha(op.linha) !== selectedLinha) return false;
  return true;
});

console.log(visiblePendingOps);
