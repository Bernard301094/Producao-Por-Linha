import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';

const firebaseConfig = JSON.parse(readFileSync('./Producao-Por-Linha-main/firebase-applet-config.json', 'utf8'));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const paradas = [
  { seq: 1, tipologia: "ACIDENTE / SEGURANÇA", flag: 0, detalhamento: "Utilizada quando a linha para por acidente ou sinistro ocorrido na fábrica." },
  { seq: 2, tipologia: "AGUARDANDO ANÁLISE DO MANIPULADO", flag: 0, detalhamento: "Tempo destinado para analisar o retem do produto no termino da manipulação." },
  { seq: 3, tipologia: "AGUARDANDO LIBERAÇÃO DO PRODUTO ACABADO", flag: 0, detalhamento: "Tempo destinado para analisar o produto após liberação do manipulado." },
  { seq: 4, tipologia: "AGUARDANDO MANIPULAÇÃO DE PRODUTO", flag: 0, detalhamento: "Utilizada quando há um gargalo ou falha no fluxo de manipulação que impede a chegada do produto até a máquina." },
  { seq: 5, tipologia: "FALTA DE AR", flag: 0, detalhamento: "Parada por queda na pressão ou ausência de ar comprimido para os equipamentos pneumáticos." },
  { seq: 6, tipologia: "FALTA DE ENERGIA", flag: 0, detalhamento: "Interrupção no fornecimento de energia elétrica" },
  { seq: 7, tipologia: "FALTA DE GÁS", flag: 0, detalhamento: "Parada por falta de GLP ou outro gás específico utilizado na linha de produção." },
  { seq: 8, tipologia: "FALTA DE INSUMOS", flag: 0, detalhamento: "Ausência de materiais auxiliares como Fitas adesivas, Caixas, Etiquetas e etc." },
  { seq: 9, tipologia: "FALTA DE PALETE", flag: 0, detalhamento: "Quando a linha para porque não há paletes disponíveis para o empilhamento do produto acabado." },
  { seq: 10, tipologia: "INICIO DE TURNO", flag: 1, detalhamento: "Tempo gasto com a organização inicial, conferência de escala e passagens de turno." },
  { seq: 11, tipologia: "INSPEÇÃO DE LINHA", flag: 0, detalhamento: "Tempo destinado para que um Inspetor de Qualidade faça a inspeção dos Insumos que serão utilizados na linha de produção." },
  { seq: 12, tipologia: "LIMPEZA / 5S", flag: 0, detalhamento: "Tempo dedicado à higienização da máquina, organização do posto de trabalho e aplicação do 5S." },
  { seq: 13, tipologia: "MANUTENÇÃO AUTÔNOMA", flag: 0, detalhamento: "Pequenos ajustes, inspeções e lubrificações realizados pelo próprio operador conforme o plano." },
  { seq: 14, tipologia: "MANUTENÇÃO CORRETIVA", flag: 0, detalhamento: "Parada não programada para conserto de quebras ou falhas inesperadas no equipamento." },
  { seq: 15, tipologia: "MANUTENÇÃO PREVENTIVA", flag: 1, detalhamento: "Parada programada para revisões técnicas visando evitar quebras futuras." },
  { seq: 16, tipologia: "PARADA PROGRAMADA", flag: 1, detalhamento: "Parada programada para acontecimento intensional no setor, ex: mudança na insfraestrutura do layout." },
  { seq: 17, tipologia: "REAJUSTE DE PRODUTO", flag: 0, detalhamento: "Quando o produto está sendo reajustado pela manipulação para uma nova análise." },
  { seq: 18, tipologia: "REFEIÇÃO", flag: 1, detalhamento: "Intervalo padrão para almoço/janta ou lanche dos operadores, caso a máquina pare para isso." },
  { seq: 19, tipologia: "REPROCESSO/RETRABALHO", flag: 0, detalhamento: "Quando a máquina é interrompida ou não iniciada para corrigir produtos que saíram fora do padrão de qualidade." },
  { seq: 20, tipologia: "REUNIÃO/TREINAMENTO", flag: 1, detalhamento: "Parada para reuniões de resultados, treinamentos técnicos, reuniões de ultima hora." },
  { seq: 21, tipologia: "SEM PROGRAMAÇÃO (PCP)", flag: 0, detalhamento: "Quando a máquina está disponível, mas não há demanda ou plano de produção emitido pelo PCP." },
  { seq: 22, tipologia: "SETUP", flag: 0, detalhamento: "Tempo de troca de formato, moldes ou ferramentas para iniciar a produção de um item diferente." },
  { seq: 23, tipologia: "TROCA DE ROTULO", flag: 0, detalhamento: "Parada rápida para substituição da bobina de rótulos quando a mesma acaba durante o processo." }
];

async function seed() {
  for (const parada of paradas) {
    const docRef = doc(db, 'paradas', parada.seq.toString());
    await setDoc(docRef, parada);
    console.log(`Adicionada parada: ${parada.tipologia}`);
  }
  console.log('Finalizado.');
  process.exit(0);
}

seed().catch(console.error);
