const payload = {
  carimbo: "24/06/2026",
  op: "TEST-APK-999",
  produto: "Produto Teste APK",
  linha: "Linha Teste",
  turno: "T1",
  operador: "Sistema AI",
  quantidade: "100",
  horaInicial: "08:00",
  horaFinal: "09:00",
  isAvulsa: false,
  paradas: [
    {
      seq: 1,
      tipologia: "Setup",
      observacao: "Teste parada APK",
      horaInicio: "08:30",
      horaFim: "08:45",
      numeroOS: "12345"
    }
  ]
};

const run = async () => {
  try {
    console.log("Enviando requisição POST para https://producao-por-linha.vercel.app/api/append...");
    const res = await fetch("https://producao-por-linha.vercel.app/api/append", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const text = await res.text();
    console.log(`Status HTTP: ${res.status}`);
    console.log(`Resposta: ${text}`);
  } catch(e) {
    console.error("Erro na requisição:", e);
  }
};

run();
