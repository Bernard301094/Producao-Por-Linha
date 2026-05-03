import fetch from 'node-fetch';

async function testAppend() {
  const op = 'test-op-123';
  const linha = 'Linha 10';
  const url = 'https://ais-dev-lr3elaaqn26vdipvtk4fc5-246875337716.us-east1.run.app/api/append';
  console.log("Fetching", url);
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      carimbo: 'test', op, litragem: 'test', produto: 'test', linha, turno: 'test', quantidade: '1', horaInicial: '00:00', horaFinal: '01:00'
    })
  });
  console.log(resp.status);
  console.log(await resp.text());
}
testAppend();
