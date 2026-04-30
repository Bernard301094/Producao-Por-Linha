import { PRODUCTS } from './data';

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
  qntReprocesso?: string;
  reportString?: string;
  reportDocId?: string;
  carimbo?: string;
}

const STORAGE_KEYS = {
  PENDING_OPS: 'v-ops-pending',
  PRODUCTS: 'v-ops-products',
  FINISHED_HISTORY: 'v-ops-finished-local' // Local cache of recent finishes
};

const getCompactString = (op: any) => {
  return `${op.opNumber}|${op.linha}|${op.produto}|${op.litragem}|${op.quantidade}|${op.horaInicial}|${op.horaFinal}|${op.qntReprocesso || ''}`;
};

// LOCAL STORAGE HELPERS
const getLocal = <T>(key: string): T[] => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

const saveLocal = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify(data));
};

export const getOperations = async (): Promise<Operation[]> => {
  return getLocal<Operation>(STORAGE_KEYS.PENDING_OPS);
};

export const addOperation = async (op: Operation) => {
  const ops = await getOperations();
  saveLocal(STORAGE_KEYS.PENDING_OPS, [...ops, op]);
};

export const removeOperation = async (id: string) => {
  const ops = await getOperations();
  saveLocal(STORAGE_KEYS.PENDING_OPS, ops.filter(o => o.id !== id));
};

const formatSheetLitragem = (l: string) => {
  if (!l) return '';
  const val = l.trim().toUpperCase();
  if (val.endsWith('L') && !val.endsWith('ML')) {
    return l.trim().slice(0, -1).trim() + ' Litros';
  }
  return l;
};

export const markOperationFinished = async (id: string, quantidade: string, horaFinal: string, qntReprocesso?: string) => {
  const ops = await getOperations();
  const data = ops.find(o => o.id === id);
  if (!data) throw new Error("Operação pendente não encontrada.");
  
  const formattedLinha = data.linha ? (isNaN(Number(data.linha)) ? data.linha : `Linha ${data.linha}`) : '';
  const formatedCarimbo = new Date().toLocaleDateString('pt-BR');

  const finishedOp: FinishedOperation = {
    ...data,
    linha: formattedLinha,
    quantidade,
    horaFinal,
    carimbo: formatedCarimbo,
  };

  // Sync with OneDrive
  const payload = {
    carimbo: formatedCarimbo,
    op: data.opNumber,
    litragem: formatSheetLitragem(data.litragem || ''),
    produto: data.produto,
    linha: formattedLinha,
    turno: data.turno,
    quantidade,
    qntReprocesso: qntReprocesso || '',
    horaInicial: data.horaInicial,
    horaFinal
  };

  try {
    const res = await fetch('/api/append', { 
      method: 'POST', 
      body: JSON.stringify(payload), 
      headers: {'Content-Type': 'application/json'} 
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OneDrive: ${errText}`);
    }
  } catch (error: any) {
    console.error("OneDrive sync failed", error);
    throw new Error(`Aviso: Ocorreu um erro ao sincronizar com o OneDrive. Detalhes: ${error.message}`);
  }

  // Remove from pending
  await removeOperation(id);

  // Add to local history cache (since we don't have Firestore reports anymore)
  const history = getLocal<string>(STORAGE_KEYS.FINISHED_HISTORY);
  const compact = getCompactString(finishedOp);
  saveLocal(STORAGE_KEYS.FINISHED_HISTORY, [compact, ...history].slice(0, 50)); // Keep last 50
};

export const getProducts = async (): Promise<{produto: string, litragem: string}[]> => {
  const localProds = getLocal<{produto: string, litragem: string}>(STORAGE_KEYS.PRODUCTS);
  
  const DEFAULT_PRODUCTS = PRODUCTS.map(([produto, litragem]) => ({ produto, litragem }));

  const map = new Map<string, {produto: string, litragem: string}>();
  DEFAULT_PRODUCTS.forEach(p => map.set(`${p.produto.toUpperCase()}`, p));
  localProds.forEach(p => map.set(`${p.produto.toUpperCase()}`, p));

  return Array.from(map.values()).sort((a,b) => a.produto.localeCompare(b.produto));
};

export const addProduct = async (produto: string, litragem: string) => {
  const prods = getLocal<{produto: string, litragem: string}>(STORAGE_KEYS.PRODUCTS);
  if (!prods.find(p => p.produto === produto)) {
    saveLocal(STORAGE_KEYS.PRODUCTS, [...prods, { produto, litragem }]);
  }
};

export const removeFinishedOperation = async (id: string, _turno: string) => {
  // Local history removal
  const history = getLocal<string>(STORAGE_KEYS.FINISHED_HISTORY);
  saveLocal(STORAGE_KEYS.FINISHED_HISTORY, history.filter(s => s !== id));
  // Note: deletion from OneDrive is not implemented in server.ts
};

export const moveFinishedToPending = async (id: string, turno: string) => {
  const parts = id.split('|');
  const uuid = Math.random().toString(36).substring(2);
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
  await addOperation(newOp);
  const history = getLocal<string>(STORAGE_KEYS.FINISHED_HISTORY);
  saveLocal(STORAGE_KEYS.FINISHED_HISTORY, history.filter(s => s !== id));
};

export const updateFinishedOperation = async (oldId: string, data: Partial<FinishedOperation>, _turno: string) => {
  // Update local history
  const history = getLocal<string>(STORAGE_KEYS.FINISHED_HISTORY);
  const newCompact = getCompactString(data);
  saveLocal(STORAGE_KEYS.FINISHED_HISTORY, history.map(s => s === oldId ? newCompact : s));
  
  // Note: OneDrive update not implemented
};

export const updateOperation = async (id: string, data: Partial<Operation>) => {
  const ops = await getOperations();
  saveLocal(STORAGE_KEYS.PENDING_OPS, ops.map(o => o.id === id ? { ...o, ...data } : o));
};

export const checkSheetConnection = async () => {
  try {
    const response = await fetch('/api/config-check');
    return await response.json();
  } catch (err) {
    return { status: 'Error', error: String(err) };
  }
};

export const getReportForDateAndShift = async (_date: string, _shift: string) => {
  // Since we don't have Firestore reports, we'll return the local history
  // filtered by some criteria if needed, or just the history.
  const history = getLocal<string>(STORAGE_KEYS.FINISHED_HISTORY);
  return history.map((s: string) => {
     const [opNumber, linha, produto, litragem, quantidade, horaInicial, horaFinal, qntReprocesso] = s.split('|');
     return { opNumber, linha, produto, litragem, quantidade, horaInicial, horaFinal, qntReprocesso };
  });
};

export const getAuthProfile = async (_profileName: string) => {
  // Simplified auth: anyone can login since Firebase is gone
  return { pin: '1234' }; // Fallback PIN
};
