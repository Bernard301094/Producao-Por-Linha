import fetch from 'node-fetch';

async function testDelete() {
  const op = 'test-op-123';
  const linha = 'Linha 10';
  await fetch('http://localhost:3000/api/append', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      carimbo: 'test', op, litragem: 'test', produto: 'test', linha, turno: 'test', quantidade: '1', horaInicial: '00:00', horaFinal: '01:00'
    })
  });
  
  const resp = await fetch('http://localhost:3000/api/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ op: op, linha: linha })
  });
  console.log(resp.status);
  console.log(await resp.text());
}
testDelete();
