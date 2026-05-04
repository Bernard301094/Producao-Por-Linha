import { PRODUCTS } from './data';
import { db } from './firebase';
import { collection, doc, setDoc, getDocs, getDoc, deleteDoc, updateDoc, query, where, onSnapshot } from 'firebase/firestore';

export interface Parada {
  seq: number;
  tipologia: string;
  flag?: number;
  detalhamento?: string;
}

export interface ParadaRecord extends Parada {
  horaInicio: string;
  horaFim: string;
}

export interface Operation {
  id: string;
  opNumber: string;
  produto: string;
  linha: string;
  turno: string;
  horaInicial: string;
  carimboInicial?: string;
  litragem?: string;
  status?: string;
  paradas?: ParadaRecord[];
}

export interface FinishedOperation extends Operation {
  quantidade: string;
  horaFinal: string;
  qntReprocesso?: string;
  reportString?: string;
  reportDocId?: string;
  carimbo?: string;
  paradas?: ParadaRecord[];
}

const STORAGE_KEYS = {
  PRODUCTS: 'v-ops-products',
};

// LOCAL STORAGE HELPERS
const getLocal = <T>(key: string): T[] => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

const saveLocal = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify(data));
};

export const subscribeToOperations = (callback: (ops: Operation[]) => void) => {
  const q = query(collection(db, 'operations'), where('status', '==', 'pending'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Operation)));
  });
};

export const subscribeToFinishedOps = (callback: (ops: FinishedOperation[]) => void) => {
  const q = query(collection(db, 'operations'), where('status', '==', 'finished'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as FinishedOperation)));
  });
};

export const getOperations = async (): Promise<Operation[]> => {
  const q = query(collection(db, 'operations'), where('status', '==', 'pending'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Operation));
};

export const getParadas = async (): Promise<Parada[]> => {
  const q = query(collection(db, 'paradas'));
  const snap = await getDocs(q);
  
  if (snap.empty) {
    const defaultParadas: Parada[] = [
      { seq: 1, tipologia: 'TROCA DE FORMATO (SETUP)' },
      { seq: 2, tipologia: 'MANUTENÇÃO MECÂNICA' },
      { seq: 3, tipologia: 'MANUTENÇÃO ELÉTRICA' },
      { seq: 4, tipologia: 'FALTA DE MATERIAL/INSUMO' },
      { seq: 5, tipologia: 'LIMPEZA/HIGIENIZAÇÃO' },
      { seq: 6, tipologia: 'REFEIÇÃO / INTERVALO' },
      { seq: 7, tipologia: 'FALTA DE ENERGIA / UTILIDADES' },
      { seq: 8, tipologia: 'REUNIÃO / TREINAMENTO' },
      { seq: 9, tipologia: 'AGUARDANDO CQ (QUALIDADE)' },
      { seq: 10, tipologia: 'INOPERANTE / FALTA DE DEMANDA' }
    ];
    
    // Seed the database
    try {
      await Promise.all(defaultParadas.map(p => 
        setDoc(doc(db, 'paradas', p.seq.toString()), p)
      ));
    } catch (e) {
      console.error("Error seeding default paradas", e);
    }
    
    return defaultParadas;
  }
  
  return snap.docs.map(d => ({ ...d.data() } as Parada)).sort((a,b) => a.seq - b.seq);
};

export const addOperation = async (op: Operation) => {
  await setDoc(doc(db, 'operations', op.id), { ...op, status: 'pending' });
};

export const removeOperation = async (id: string) => {
  await deleteDoc(doc(db, 'operations', id));
};


// Detect if running inside Capacitor
import { Capacitor } from '@capacitor/core';
const isCapacitor = Capacitor.isNativePlatform();

/**
 * DETERMINISTIC API BASE URL
 * In Capacitor native environments, nested fetch('/api/...') calls default to capacitor://localhost/api/...
 * which doesn't exist. We must point to the absolute URL of the deployed backend.
 * We MUST point to the Shared App URL (ais-pre) because the Dev URL (ais-dev) is protected and denies access from the mobile phone.
 * The user must click "Share" in the AI Studio platform to publish the backend.
 */
// @ts-ignore
const API_BASE = import.meta.env?.VITE_API_URL || (isCapacitor ? 'https://ais-pre-lr3elaaqn26vdipvtk4fc5-246875337716.us-east1.run.app' : '');

const formatSheetLitragem = (l: string) => {
  if (!l) return '';
  const val = l.trim().toUpperCase();
  if (val.endsWith('L') && !val.endsWith('ML')) {
    return l.trim().slice(0, -1).trim() + ' Litros';
  }
  return l;
};

export const markOperationFinished = async (
  op: Operation,
  quantidade: string,
  horaFinal: string,
  qntReprocesso?: string,
  paradas?: ParadaRecord[],
  onOneDriveSync?: (success: boolean, error?: string) => void
) => {
  const formattedLinha = op.linha ? (isNaN(Number(op.linha)) ? op.linha : `Linha ${op.linha}`) : '';

  const now = new Date();
  const DD = String(now.getDate()).padStart(2, '0');
  const MM = String(now.getMonth() + 1).padStart(2, '0');
  const YYYY = now.getFullYear();
  const formatedCarimbo = `${DD}/${MM}/${YYYY}`;

  const finishedOp: FinishedOperation = {
    ...op,
    linha: formattedLinha,
    quantidade,
    horaFinal,
    qntReprocesso: qntReprocesso || '',
    carimbo: formatedCarimbo,
    paradas: (paradas && paradas.length > 0) ? paradas : (op.paradas || []),
  };

  // 1. Write to Firebase FIRST — instant due to offline cache
  try {
    await updateDoc(doc(db, 'operations', op.id), { ...finishedOp, status: 'finished' });
  } catch (firebaseErr: any) {
    console.error("Firebase updateDoc failed", firebaseErr);
    throw new Error(`Erro ao salvar na nuvem: ${firebaseErr.message}`);
  }

  // 2. Sync OneDrive in background — fire and forget
  const payload = {
    carimbo: `'${formatedCarimbo}`,
    op: op.opNumber,
    litragem: formatSheetLitragem(op.litragem || ''),
    produto: op.produto,
    linha: formattedLinha,
    turno: op.turno,
    quantidade,
    qntReprocesso: qntReprocesso || '',
    horaInicial: op.horaInicial,
    horaFinal
  };

  fetch(`${API_BASE}/api/append`, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' }
  }).then(async res => {
    if (!res.ok) {
      const errText = await res.text();
      onOneDriveSync?.(false, errText);
    } else {
      // Sync paradas if exist
      if (paradas && paradas.length > 0) {
        const paradasPayload = {
          carimbo: formatedCarimbo,
          op: op.opNumber,
          litragem: formatSheetLitragem(op.litragem || ''),
          produto: op.produto,
          linha: formattedLinha,
          turno: op.turno,
          paradas: paradas
        };
        fetch(`${API_BASE}/api/append-paradas`, {
          method: 'POST',
          body: JSON.stringify(paradasPayload),
          headers: { 'Content-Type': 'application/json' }
        }).catch(e => console.error("Error syncing paradas:", e));
      }
      onOneDriveSync?.(true);
    }
  }).catch(error => {
    console.error("OneDrive sync failed", error);
    onOneDriveSync?.(false, error.message);
  });
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
  const docSnap = await getDocs(query(collection(db, 'operations'), where('__name__', '==', id)));
  let apiError = null;
  if (!docSnap.empty) {
    const data = docSnap.docs[0].data();
    try {
      const resp = await fetch(`${API_BASE}/api/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op: data.opNumber, linha: data.linha, produto: data.produto })
      });
      if (!resp.ok) {
        apiError = await resp.text();
      }
    } catch (e: any) {
      console.error('Delete API error', e);
      apiError = e.message;
    }
  }
  
  try {
    await deleteDoc(doc(db, 'operations', id));
  } catch (firebaseErr: any) {
    console.error("Firebase deleteDoc failed", firebaseErr);
    throw new Error(`Erro ao deletar da nuvem: ${firebaseErr.message}`);
  }

  if (apiError) {
    // Only throw after successfully deleting from Firebase so state isn't stuck
    throw new Error(`Aviso: Operação removida do aplicativo, mas ocorreu um erro ao apagar da planilha: ${apiError}`);
  }
};

export const moveFinishedToPending = async (id: string, turno: string) => {
  const docSnap = await getDocs(query(collection(db, 'operations'), where('__name__', '==', id)));
  if (!docSnap.empty) {
    const data = docSnap.docs[0].data() as FinishedOperation;
    
    // Attempt to remove from spreadsheet
    try {
      await fetch(`${API_BASE}/api/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op: data.opNumber, linha: data.linha, produto: data.produto })
      });
    } catch (e) {
      console.error('API delete error in revert', e);
    }
    
    // Clean up finished-specific fields
    const newOp: Operation = {
      id: id,
      opNumber: data.opNumber || '',
      linha: data.linha || '',
      produto: data.produto || '',
      litragem: data.litragem || '',
      turno: turno || 'A',
      horaInicial: data.horaInicial || '',
      carimboInicial: data.carimboInicial || new Date().toISOString(),
      status: 'pending',
      paradas: data.paradas || []
    };

    await setDoc(doc(db, 'operations', id), newOp);
  }
};

export const updateFinishedOperation = async (oldId: string, data: Partial<FinishedOperation>, _turno: string) => {
  const docSnap = await getDocs(query(collection(db, 'operations'), where('__name__', '==', oldId)));
  if (!docSnap.empty) {
    const original = docSnap.docs[0].data();
    try {
      await fetch(`${API_BASE}/api/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          originalData: { op: original.opNumber, linha: original.linha, produto: original.produto }, 
          updates: data 
        })
      });
    } catch (e) {
      console.error('Update API error', e);
    }
    await updateDoc(doc(db, 'operations', oldId), data);
  }
};

export const updateOperation = async (id: string, data: Partial<Operation>) => {
  await updateDoc(doc(db, 'operations', id), data);
};

export const getReportForDateAndShift = async (_date: string, _shift: string) => {
  const q = query(collection(db, 'operations'), where('status', '==', 'finished'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as FinishedOperation));
};

export const clearTurnoRecords = async (turno: string) => {
  const q = query(collection(db, 'operations'), where('turno', '==', turno));
  const snap = await getDocs(q);
  for (const item of snap.docs) {
    if (item.data().status === 'finished') {
       await deleteDoc(doc(db, 'operations', item.id));
    }
  }
};


export const getAuthProfile = async (profileName: string) => {
  try {
    const docRef = doc(db, 'profiles', profileName);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
  } catch (err) {
    console.error("Firestore get profile error", err);
  }

  const customAuth = getLocal<any>('v-ops-auth') || [];
  const profile = customAuth.find((p: any) => p.name === profileName);
  return profile || null;
};

export const checkSheetConnection = async () => {
  try {
    const response = await fetch(`${API_BASE}/api/config-check`);
    if (!response.ok) {
      throw new Error(`Erro na API: ${response.status}`);
    }
    return await response.json();
  } catch (err) {
    return { status: 'Error', error: String(err) };
  }
};

export const updateAuthProfile = async (profileName: string, newPassword: string) => {
  const now = new Date().toISOString();
  
  let existing: any = null;
  try {
    const docRef = doc(db, 'profiles', profileName);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      existing = docSnap.data();
    }
  } catch (err) {
    console.warn("Could not fetch profile from firestore", err);
  }

  if (!existing) {
    const customAuth = getLocal<any>('v-ops-auth') || [];
    existing = customAuth.find((p: any) => p.name === profileName);
  }

  if (existing && existing.lastChangedAt) {
    const lastChanged = new Date(existing.lastChangedAt);
    const differenceInDays = (new Date().getTime() - lastChanged.getTime()) / (1000 * 3600 * 24);
    if (differenceInDays < 30) {
      throw new Error(`A senha só pode ser alterada uma vez a cada 30 dias. Tente novamente em ${Math.ceil(30 - differenceInDays)} dias.`);
    }
  }

  const newProfile = { name: profileName, password: newPassword, lastChangedAt: now };
  
  try {
    await setDoc(doc(db, 'profiles', profileName), newProfile, { merge: true });
  } catch (err: any) {
    console.error("Error saving profile to firestore", err);
    throw new Error(`Erro ao salvar na nuvem: ${err?.message || err}`);
  }

  const customAuth = getLocal<any>('v-ops-auth') || [];
  const filtered = customAuth.filter((p: any) => p.name !== profileName);
  saveLocal('v-ops-auth', [...filtered, newProfile]);
};
