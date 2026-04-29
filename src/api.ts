import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, arrayRemove, arrayUnion } from 'firebase/firestore';

export interface Operation {
  id: string;
  opNumber: string;
  produto: string;
  linha: string;
  turno: string;
  horaInicial: string;
  carimboInicial?: string;
  litragem?: string;
}

export interface FinishedOperation extends Operation {
  quantidade: string;
  horaFinal: string;
  reportString?: string;
  reportDocId?: string;
  carimbo?: string;
}

const getCompactString = (op: any) => {
  return `${op.opNumber}|${op.linha}|${op.produto}|${op.litragem}|${op.quantidade}|${op.horaInicial}|${op.horaFinal}`;
};

export const getOperations = async () => [];

export const addOperation = async (op: Operation) => {
  await setDoc(doc(db, 'pendingOperations', op.id), op);
};

export const removeOperation = async (id: string) => {
  await deleteDoc(doc(db, 'pendingOperations', id));
};

export const markOperationFinished = async (id: string, quantidade: string, horaFinal: string) => {
  // get pending
  const pendingDoc = await getDoc(doc(db, 'pendingOperations', id));
  if(!pendingDoc.exists()) throw new Error("Not found");
  const data = pendingDoc.data() as Operation;
  
  const today = new Date();
  const dateStr = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-');
  const docId = `${dateStr}_${data.turno}`;

  // format
  const formattedLinha = data.linha ? (isNaN(Number(data.linha)) ? data.linha : `Linha ${data.linha}`) : '';
  const formatedCarimbo = new Date().toLocaleString();

  const finishedOp: FinishedOperation = {
    ...data,
    linha: formattedLinha,
    quantidade,
    horaFinal,
    reportDocId: docId,
    carimbo: formatedCarimbo,
  };
  const compactString = getCompactString(finishedOp);

  // append to sheets via fetch
  const payload = {
    carimbo: formatedCarimbo,
    op: data.opNumber,
    litragem: data.litragem || '',
    produto: data.produto,
    linha: formattedLinha,
    turno: data.turno,
    quantidade,
    horaInicial: data.horaInicial,
    horaFinal
  };
  try {
    const res = await fetch('/api/append', { method: 'POST', body: JSON.stringify(payload), headers: {'Content-Type': 'application/json'} });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || `Erro HTTP ${res.status} ao sincronizar com Planilha`);
    }
  } catch (error: any) {
    console.error("Sheets sync failed", error);
    throw new Error(`Aviso: Ocorreu um erro ao sincronizar com a Planilha (Google Sheets). Detalhes: ${error.message}`);
  }

  // remove from pending
  await removeOperation(id);

  // add to reports
  await setDoc(doc(db, 'reports', docId), { ops: arrayUnion(compactString) }, { merge: true });
};

export const getProducts = async (): Promise<{produto: string, litragem: string}[]> => {
  const snap = await getDocs(collection(db, 'products'));
  const dbProds = snap.docs.map(d => d.data() as {produto: string, litragem: string});
  
  const DEFAULT_PRODUCTS = [
  { produto: 'ALUMAX 1,5L', litragem: '1,5L' },
  { produto: 'ALUMAX 20L', litragem: '20L' },
  { produto: 'ALUMAX 5L', litragem: '5L' },
  { produto: 'AROMINHA GEL CARRO NOVO 60G', litragem: '60G' },
  { produto: 'AROMINHA GEL FRUTAL 60G', litragem: '60G' },
  { produto: 'AROMINHA GEL UVA 60G', litragem: '60G' },
  { produto: 'AROMINHA GEL VONIXX FRESH 60G', litragem: '60G' },
  { produto: 'AROMINHA SPRAY BOMAR 60ML', litragem: '60ML' },
  { produto: 'AROMINHA SPRAY CARRO NOVO 60ML', litragem: '60ML' },
  { produto: 'AROMINHA SPRAY MORANGO 60ML', litragem: '60ML' },
  { produto: 'AROMINHA SPRAY VONIXX FRESH 60ML', litragem: '60ML' },
  { produto: 'BACTRAN 1,5L', litragem: '1,5L' },
  { produto: 'BACTRAN 3L', litragem: '3L' },
  { produto: 'BACTRAN 5L', litragem: '5L' },
  { produto: 'BLEND 100ML', litragem: '100ML' },
  { produto: 'BLEND ALL IN ONE 240ML', litragem: '240ML' },
  { produto: 'BLEND ALL IN ONE 500ML', litragem: '500ML' },
  { produto: 'BLEND BLACK 100ML', litragem: '100ML' },
  { produto: 'BLEND CLEANER BLACK WAX 500ML', litragem: '500ML' },
  { produto: 'BLEND CLEANER WAX 500ML', litragem: '500ML' },
  { produto: 'BLEND METAL POLISH 150G', litragem: '150G' },
  { produto: 'BLEND SPRAY 500ML', litragem: '500ML' },
  { produto: 'BLEND SPRAY BLACK 500ML', litragem: '500ML' },
  { produto: 'BLOKER 240ML', litragem: '240ML' },
  { produto: 'CARNAUBA EXPRESS 1,5L', litragem: '1,5L' },
  { produto: 'CARNAUBA HYBRID WAX 120ML', litragem: '120ML' },
  { produto: 'CARNAUBA HYBRID WAX 240ML', litragem: '240ML' },
  { produto: 'CARNAUBA PLUS 1,5L', litragem: '1,5L' },
  { produto: 'CARNAUBA PLUS 3L', litragem: '3L' },
  { produto: 'CARNAUBA PLUS 500ML', litragem: '500ML' },
  { produto: 'CARNAUBA TOK FINAL 500ML', litragem: '500ML' },
  { produto: 'CERA EXPRESS 500ML', litragem: '500ML' },
  { produto: 'CHERRY WAX 1L', litragem: '1L' },
  { produto: 'CHERRY WAX 500ML', litragem: '500ML' },
  { produto: 'CITRON SHAMPOO DESENGRAXANTE 1,5L', litragem: '1,5L' },
  { produto: 'DARKER 1,5L', litragem: '1,5L' },
  { produto: 'DARKER 500ML', litragem: '500ML' },
  { produto: 'DARKER 5L', litragem: '5L' },
  { produto: 'DELET 1,5L', litragem: '1,5L' },
  { produto: 'DELET 500ML', litragem: '500ML' },
  { produto: 'DELET 5L', litragem: '5L' },
  { produto: 'DESENGRAXANTE BIO 5L', litragem: '5L' },
  { produto: 'DRACCO 240ML', litragem: '240ML' },
  { produto: 'DUOXY 240ML', litragem: '240ML' },
  { produto: 'DURAX AEROSSOL 400ML', litragem: '400ML' },
  { produto: 'ECOBLACK 1,5L', litragem: '1,5L' },
  { produto: 'ECOBLACK 20L', litragem: '20L' },
  { produto: 'ECOBLACK 5L', litragem: '5L' },
  { produto: 'ECOZUX 240ML', litragem: '240ML' },
  { produto: 'EXTRACTUS 1,5L', litragem: '1,5L' },
  { produto: 'EXTRACTUS 3L', litragem: '3L' },
  { produto: 'EXTRACTUS 5L', litragem: '5L' },
  { produto: 'EXTRACTUS SENSITIVE 1,5L', litragem: '1,5L' },
  { produto: 'EXTRACTUS SENSITIVE 3L', litragem: '3L' },
  { produto: 'FLEXUS 500ML', litragem: '500ML' },
  { produto: 'FLOW 1L', litragem: '1L' },
  { produto: 'FLOW 240ML', litragem: '240ML' },
  { produto: 'FOCUS 240ML', litragem: '240ML' },
  { produto: 'FOXY 1L', litragem: '1L' },
  { produto: 'FOXY 240ML', litragem: '240ML' },
  { produto: 'GLADIUS 500ML', litragem: '500ML' },
  { produto: 'GLAZOX 500ML ZACS', litragem: '500ML' },
  { produto: 'GLAZY 1,5L', litragem: '1,5L' },
  { produto: 'GLAZY 500ML', litragem: '500ML' },
  { produto: 'GLAZY 5L', litragem: '5L' },
  { produto: 'GLIZZ 500ML', litragem: '500ML' },
  { produto: 'HIDRACOURO 500ML', litragem: '500ML' },
  { produto: 'HIGICOURO 500ML', litragem: '500ML' },
  { produto: 'HYDROX FAST 500ML', litragem: '500ML' },
  { produto: 'HYDROX PRO 240ML', litragem: '240ML' },
  { produto: 'HYDROX PRO 500ML', litragem: '500ML' },
  { produto: 'IMPACT 1,5L', litragem: '1,5L' },
  { produto: 'IMPACT 3L', litragem: '3L' },
  { produto: 'IMPACT 5L', litragem: '5L' },
  { produto: 'IMPERMAX 1,5L', litragem: '1,5L' },
  { produto: 'INTENSE 1,5L', litragem: '1,5L' },
  { produto: 'INTENSE 240ML', litragem: '240ML' },
  { produto: 'INTENSE 500ML', litragem: '500ML' },
  { produto: 'IZER 1,5L', litragem: '1,5L' },
  { produto: 'IZER 1000L', litragem: '1000L' },
  { produto: 'IZER 3L', litragem: '3L' },
  { produto: 'IZER 500ML', litragem: '500ML' },
  { produto: 'KAZAN RED 240ML', litragem: '240ML' },
  { produto: 'KOUREX 240ML', litragem: '240ML' },
  { produto: 'KOURUM 240ML', litragem: '240ML' },
  { produto: 'LAVA AUTOS 1,5L', litragem: '1,5L' },
  { produto: 'LAVA AUTOS 20L', litragem: '20L' },
  { produto: 'LAVA AUTOS 500ML', litragem: '500ML' },
  { produto: 'LAVA AUTOS 5L', litragem: '5L' },
  { produto: 'LIMPA ESTOFADOS 1,5L', litragem: '1,5L' },
  { produto: 'LIMPA ESTOFADOS 5L', litragem: '5L' },
  { produto: 'LIMPA VIDROS 1,5L', litragem: '1,5L' },
  { produto: 'LIMPA VIDROS 500ML', litragem: '500ML' },
  { produto: 'LIMPA VIDROS 5L', litragem: '5L' },
  { produto: 'LIMPA VIDROS PRO 1,5L', litragem: '1,5L' },
  { produto: 'LIMPADOR MULTIACAO 1,5L', litragem: '1,5L' },
  { produto: 'LIMPADOR MULTIACAO 500ML', litragem: '500ML' },
  { produto: 'LIMPADOR MULTIACAO 5L', litragem: '5L' },
  { produto: 'MASSA DE POLIR 1,8KG', litragem: '1,8KG' },
  { produto: 'MASSA DE POLIR 590G', litragem: '590G' },
  { produto: 'METALUX 100G', litragem: '100G' },
  { produto: 'MICROLAV 1,5L', litragem: '1,5L' },
  { produto: 'MICROLAV 500ML', litragem: '500ML' },
  { produto: 'MITTUS 500ML - ZACS', litragem: '500ML' },
  { produto: 'MOKER 1L', litragem: '1L' },
  { produto: 'MOKER 240ML', litragem: '240ML' },
  { produto: 'MOTO-V LAVA MOTOS 1,5L', litragem: '1,5L' },
  { produto: 'MOTO-V LAVA MOTOS 500ML', litragem: '500ML' },
  { produto: 'MOTUX 1L', litragem: '1L' },
  { produto: 'MOTUX 240ML', litragem: '240ML' },
  { produto: 'NATIVE 100ML', litragem: '100ML' },
  { produto: 'NATIVE BLACK 100ML', litragem: '100ML' },
  { produto: 'NATIVE CLEANER WAX 500ML', litragem: '500ML' },
  { produto: 'NATIVE SPRAY WAX 500ML', litragem: '500ML' },
  { produto: 'NUBER 240ML', litragem: '240ML' },
  { produto: 'OPTY 240ML', litragem: '240ML' },
  { produto: 'PASTA MULTIACAO 500G', litragem: '500G' },
  { produto: 'PNEU PRETINHO 1,5L', litragem: '1,5L' },
  { produto: 'PNEU PRETINHO 20L', litragem: '20L' },
  { produto: 'PNEU PRETINHO 500ML', litragem: '500ML' },
  { produto: 'PNEU PRETINHO 5L', litragem: '5L' },
  { produto: 'PRIZM 1,5L', litragem: '1,5L' },
  { produto: 'PRIZM 500ML', litragem: '500ML' },
  { produto: 'PULVIFLEX 1,5L', litragem: '1,5L' },
  { produto: 'PULVIFLEX 20L', litragem: '20L' },
  { produto: 'PULVIFLEX 5L', litragem: '5L' },
  { produto: 'QUANT - PULVERIZADOR DE DILUIÇÃO 500ML', litragem: '500ML' },
  { produto: 'REFLECT 500ML', litragem: '500ML' },
  { produto: 'REJUVEX 400G', litragem: '400G' },
  { produto: 'REJUVEX BLACK 400G', litragem: '400G' },
  { produto: 'REMOVEDOR DE CIMENTOS 5L', litragem: '5L' },
  { produto: 'REMOVEX 1,5L', litragem: '1,5L' },
  { produto: 'REMOVEX 20L', litragem: '20L' },
  { produto: 'REMOVEX 5L', litragem: '5L' },
  { produto: 'RENOVA PLASTICOS 1,5L', litragem: '1,5L' },
  { produto: 'RENOVA PLASTICOS 200G', litragem: '200G' },
  { produto: 'RENOVA PLASTICOS 3L', litragem: '3L' },
  { produto: 'RENOVA PLÁTICOS 500ML', litragem: '500ML' },
  { produto: 'RESTAURAX 1,5L', litragem: '1,5L' },
  { produto: 'RESTAURAX 240ML', litragem: '240ML' },
  { produto: 'RESTAURAX 500ML', litragem: '500ML' },
  { produto: 'RESTAURAX AEROSSOL 400ML', litragem: '400ML' },
  { produto: 'REVELAX 3L', litragem: '3L' },
  { produto: 'REVELAX 500ML', litragem: '500ML' },
  { produto: 'REVELAX 5L', litragem: '5L' },
  { produto: 'REVOX 1,5L', litragem: '1,5L' },
  { produto: 'REVOX 500ML', litragem: '500ML' },
  { produto: 'REZET 500ML ZACS', litragem: '500ML' },
  { produto: 'SANITIZANTE BOM AR 1,5L', litragem: '1,5L' },
  { produto: 'SANITIZANTE BOM AR 5L', litragem: '5L' },
  { produto: 'SANITIZANTE CARRO NOVO 1,5L', litragem: '1,5L' },
  { produto: 'SANITIZANTE CARRO NOVO 5L', litragem: '5L' },
  { produto: 'SANITIZANTE FINALIZADOR 1,5L', litragem: '1,5L' },
  { produto: 'SANITIZANTE FINALIZADOR 3L', litragem: '3L' },
  { produto: 'SANITIZANTE FINALIZADOR 5L', litragem: '5L' },
  { produto: 'SANITIZANTE FRUTAL 1,5L', litragem: '1,5L' },
  { produto: 'SANITIZANTE FRUTAL 5L', litragem: '5L' },
  { produto: 'SANITIZANTE VINTEX FRESH 1,5L', litragem: '1,5L' },
  { produto: 'SANITIZANTE VINTEX FRESH 5L', litragem: '5L' },
  { produto: 'SHINY 1,5L', litragem: '1,5L' },
  { produto: 'SHINY 240ML', litragem: '240ML' },
  { produto: 'SHINY 500ML', litragem: '500ML' },
  { produto: 'SILICONE LIQUIDO 1,5L', litragem: '1,5L' },
  { produto: 'SILVERT 240ML', litragem: '240ML' },
  { produto: 'SINERGY PAINT 500ML', litragem: '500ML' },
  { produto: 'SINERGY PLASTIC 500ML', litragem: '500ML' },
  { produto: 'SINERGY WHEEL 500ML', litragem: '500ML' },
  { produto: 'SINTRA FAST 500ML', litragem: '500ML' },
  { produto: 'SINTRA PRO 1,5L', litragem: '1,5L' },
  { produto: 'SINTRA PRO 3L', litragem: '3L' },
  { produto: 'SINTRA PRO 5L', litragem: '5L' },
  { produto: 'SIO2-PRO 500ML', litragem: '500ML' },
  { produto: 'SOULT FAST - LIMPADOR DE BOINAS 500ML', litragem: '500ML' },
  { produto: 'SOULT PRO - LIMPADOR DE BOINAS 3L', litragem: '3L' },
  { produto: 'SPELL 500ML', litragem: '500ML' },
  { produto: 'STRIKE 1,5L', litragem: '1,5L' },
  { produto: 'STRIKE 500ML', litragem: '500ML' },
  { produto: 'SUPER CERA 1,5L', litragem: '1,5L' },
  { produto: 'SUPER CERA 200G', litragem: '200G' },
  { produto: 'SUPER CERA 3L', litragem: '3L' },
  { produto: 'SUPER CERA 500ML', litragem: '500ML' },
  { produto: 'TARGUS 500ML ZACS', litragem: '500ML' },
  { produto: 'TRICOVER 20ML', litragem: '20ML' },
  { produto: 'TYRANT 240ML', litragem: '240ML' },
  { produto: 'V-CUT POLIDOR CORTE PREMIUM 500ML', litragem: '500ML' },
  { produto: 'V-ECO 1,5L', litragem: '1,5L' },
  { produto: 'V-ECO FAST 500ML', litragem: '500ML' },
  { produto: 'V-ENERGY 50ML', litragem: '50ML' },
  { produto: 'V-FINISH POLIDOR LUSTRO PREMIUM 500ML', litragem: '500ML' },
  { produto: 'V-FLOC 1,5L', litragem: '1,5L' },
  { produto: 'V-FLOC 3L', litragem: '3L' },
  { produto: 'V-FLOC 500ML', litragem: '500ML' },
  { produto: 'V-FLOC 5L', litragem: '5L' },
  { produto: 'V-LEATHER PRO 50ML', litragem: '50ML' },
  { produto: 'V-LIGHT 20ML', litragem: '20ML' },
  { produto: 'V-LIGHT PRO 50ML', litragem: '50ML' },
  { produto: 'V-LUB 3L', litragem: '3L' },
  { produto: 'V-LUB 500ML', litragem: '500ML' },
  { produto: 'V-MOL 1,5L', litragem: '1,5L' },
  { produto: 'V-MOL 500ML', litragem: '500ML' },
  { produto: 'V-MOL 5L', litragem: '5L' },
  { produto: 'V-PAINT 20ML', litragem: '20ML' },
  { produto: 'V-PAINT PRO 50ML', litragem: '50ML' },
  { produto: 'V-PLASTIC 20ML', litragem: '20ML' },
  { produto: 'V-PLASTIC PRO 50ML', litragem: '50ML' },
  { produto: 'V-POLISH POLIDOR REFINO PREMIUM 500ML', litragem: '500ML' },
  { produto: 'V10-CORTE VERNIZ ASIÁTICO 500ML', litragem: '500ML' },
  { produto: 'V20 - REFINO VERNIZ ASIÁTICO 500ML', litragem: '500ML' },
  { produto: 'V30-LUSTRO VERNIZ ASIÁTICO 500ML', litragem: '500ML' },
  { produto: 'V40 4EM1 500ML', litragem: '500ML' },
  { produto: 'V80 SELANTE SINTETICO 500ML', litragem: '500ML' },
  { produto: 'VASELINA LIQUIDA 5L', litragem: '5L' },
  { produto: 'VERNIZ DE MOTOR 1,5L', litragem: '1,5L' },
  { produto: 'VERNIZ DE MOTOR AEROSSOL 400ML', litragem: '400ML' },
  { produto: 'VEROM 1,5L', litragem: '1,5L' },
  { produto: 'VERSE 1,5L', litragem: '1,5L' },
  { produto: 'VERSE 500ML', litragem: '500ML' },
  { produto: 'VERTEX 1,5L', litragem: '1,5L' },
  { produto: 'VERTEX 500ML', litragem: '500ML' },
  { produto: 'VERTEX 5L', litragem: '5L' },
  { produto: 'VEXUS 1,5L', litragem: '1,5L' },
  { produto: 'VEXUS 500ML', litragem: '500ML' },
  { produto: 'VEXUS 5L', litragem: '5L' },
  { produto: 'Z CUT FAST 1L - ZACS', litragem: '1L' },
  { produto: 'ZUCS 500ML', litragem: '500ML' },
  { produto: 'ΚΑΖΑΝ BLUE 240ML', litragem: '240ML' },
  { produto: 'V-FLOC 240ML', litragem: '240ML' },
  { produto: 'ACIDUS PRO 1,5L', litragem: '1,5L' },
  { produto: 'HYDROX WASH 500ML', litragem: '500ML' },
  { produto: 'HYDROX WASH 240ML', litragem: '240ML' },
  { produto: 'BARRA DESCONTAMINANTE 50G', litragem: '50G' },
  { produto: 'MAKKER 2.0 500ML', litragem: '500ML' },
  { produto: 'MINUX 500ML', litragem: '500ML' },
  { produto: 'GLAZY ANTI-FOG 500ML', litragem: '500ML' },
  { produto: 'REXER 500ML', litragem: '500ML' },
  { produto: 'MINUX 1L', litragem: '1L' },
  { produto: 'EVOPLASTIC BLACK 400G', litragem: '400G' },
  { produto: 'SEM PROGRAMAÇÃO', litragem: '' },
  { produto: 'CITRUS 500ML', litragem: '500ML' },
  { produto: 'TRYON 240ML', litragem: '240ML' },
  { produto: 'REXER 240ML', litragem: '240ML' },
  { produto: 'BLEND PASTE WAX 100ML', litragem: '100ML' },
  { produto: 'KAZAN BLUE 240ML', litragem: '240ML' },
  { produto: 'GLICOSE IBC', litragem: 'IBC' },
  { produto: 'DARKER IBC', litragem: 'IBC' },
  { produto: 'SUPER BRILHO 500ML', litragem: '500ML' },
  { produto: 'ACIDUS FAST 500ML', litragem: '500ML' },
  { produto: 'EVO200 POLIDOR DE CORTE 500ML', litragem: '500ML' },
  { produto: 'CERAMIC PASTE WAX 200G', litragem: '200G' },
  { produto: 'EVO300 500ML', litragem: '500ML' },
  { produto: 'ZYON 500ML', litragem: '500ML' },
  { produto: 'SEM INFORMAÇÃO', litragem: '' },
  { produto: 'MITTUS 1L - ZACS', litragem: '1L' },
  { produto: 'LUSTER CERA CLEANER SPRAY 500ML', litragem: '500ML' },
  { produto: 'ENVASADORA INOPERANTE', litragem: 'ENVASADORA INOPERANTE' },
  { produto: 'MITTUS 200ML - ZACS', litragem: '200ML' },
  { produto: 'LAURIL IBC', litragem: 'IBC' },
  { produto: 'Indisponibilidade de maquinário', litragem: '' },
  { produto: 'SINTRA MULTI PY 500ML', litragem: '500ML' },
  { produto: 'MANUTENÇÃO PREVENTIVA', litragem: '' },
  { produto: 'REFLECT 200ML', litragem: '200ML' },
  { produto: 'TRYON 500ML', litragem: '500ML' },
  { produto: 'TRYON 1,5L', litragem: '1,5L' },
  { produto: 'CHERRY WAX 200ML', litragem: '200ML' },
  { produto: 'MAKKER 2.0 240ML', litragem: '240ML' },
  { produto: 'ACIDUS PRO 5L', litragem: '5L' },
  { produto: 'PI 0004 IBC', litragem: 'IBC' }
];

  const map = new Map<string, {produto: string, litragem: string}>();
  DEFAULT_PRODUCTS.forEach(p => {
    const l = p.litragem || '';
    map.set(`${p.produto.toUpperCase()}_${l.toUpperCase()}`, p);
  });
  dbProds.forEach(p => {
    const l = p.litragem || '';
    map.set(`${p.produto.toUpperCase()}_${l.toUpperCase()}`, p);
  });

  return Array.from(map.values()).sort((a,b) => a.produto.localeCompare(b.produto));
};

export const addProduct = async (produto: string, litragem: string) => {
  const safeId = produto.replace(/[^a-zA-Z0-9]/g, '_');
  await setDoc(doc(db, 'products', safeId), { produto, litragem }, { merge: true });
};

export const removeFinishedOperation = async (id: string, turno: string) => {
  const opStr = id;
  const parts = opStr.split('|');
  if(parts.length < 7) return;
  const [opNumber, linha, produto, litragem, quantidade, horaInicial, horaFinal] = parts;

  const today = new Date();
  const dateStr = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-');
  const docId = `${dateStr}_${turno}`;

  try {
    const res = await fetch('/api/delete', { method: 'POST', body: JSON.stringify({ op: opNumber, produto, horaInicial }), headers: {'Content-Type': 'application/json'} });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || `Erro HTTP ${res.status} ao sincronizar (delete) com Planilha`);
    }
  } catch (error: any) {
    console.error("Sheets delete failed", error);
    throw new Error(`Aviso: Falha ao deletar da Planilha: ${error.message}`);
  }

  await setDoc(doc(db, 'reports', docId), { ops: arrayRemove(opStr) }, { merge: true });
};

export const moveFinishedToPending = async (id: string, turno: string) => {
  console.log("moveFinishedToPending called", id, turno);
  try {
    await removeFinishedOperation(id, turno);
    console.log("removeFinishedOperation ok");
    const parts = id.split('|');
    
    const uuid = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : Date.now().toString(36) + Math.random().toString(36).substring(2);

    const newOp: Operation = {
      id: uuid,
      opNumber: parts[0] || '',
      linha: parts[1] || '',
      produto: parts[2] || '',
      litragem: parts[3] || '',
      turno: turno || 'A',
      horaInicial: parts[5] || '',
      carimboInicial: new Date().toISOString()
    };
    console.log("newOp details:", newOp);

    await addOperation(newOp);
    console.log("addOperation ok");
  } catch(e) {
    console.error("moveFinishedToPending FAILED", e);
    throw e;
  }
};

export const updateFinishedOperation = async (id: string, data: Partial<FinishedOperation>, turno: string) => {
  const today = new Date();
  const dateStr = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-');
  const docId = `${dateStr}_${turno}`;

  const oldString = id; 
  const newString = getCompactString(data);

  // Attempt to update sheets
  try {
    const oldParts = oldString.split('|');
    const oldOp = oldParts[0];
    const oldProduto = oldParts[2];
    const oldHoraInicial = oldParts[5];

    // the spreadsheet needs the old data to find the row, specifically op and horaInicial or carimbo
    const res = await fetch('/api/update', { 
      method: 'POST', 
      body: JSON.stringify({ 
        oldOp, 
        oldProduto,
        oldHoraInicial,
        newData: data 
      }), 
      headers: {'Content-Type': 'application/json'} 
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || `Erro HTTP ${res.status} ao sincronizar (update) com Planilha`);
    }
  } catch (error: any) {
    console.error("Sheets update failed", error);
    throw new Error(`Aviso: Ocorreu um erro ao atualizar a Planilha: ${error.message}`);
  }

  await setDoc(doc(db, 'reports', docId), { ops: arrayRemove(oldString) }, { merge: true });
  await setDoc(doc(db, 'reports', docId), { ops: arrayUnion(newString) }, { merge: true });
};

export const updateOperation = async (id: string, data: Partial<Operation>) => {
  await updateDoc(doc(db, 'pendingOperations', id), data);
};

export const getReportForDateAndShift = async (date: string, shift: string) => {
  const docId = `${date}_${shift}`;
  const snap = await getDoc(doc(db, 'reports', docId));
  if(!snap.exists()) return [];
  const ops = snap.data().ops || [];
  return ops.map((s: string) => {
     if (typeof s !== 'string') return { opNumber: '', linha: '', produto: '', litragem: '', quantidade: '', horaInicial: '', horaFinal: '' };
     const [opNumber, linha, produto, litragem, quantidade, horaInicial, horaFinal] = s.split('|');
     return { opNumber, linha, produto, litragem, quantidade, horaInicial, horaFinal };
  });
};

export const getAuthProfile = async (profileName: string) => {
  const snap = await getDoc(doc(db, 'authProfiles', profileName));
  if(snap.exists()) return snap.data();
  return null;
};
