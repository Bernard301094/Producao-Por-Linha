import { PRODUCTS } from './data';
import { db } from './firebase';
import { collection, doc, setDoc, getDocs, getDoc, deleteDoc, updateDoc, query, where, onSnapshot } from 'firebase/firestore';

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
const API_BASE = import.meta.env.VITE_API_URL || (isCapacitor ? 'https://ais-pre-lr3elaaqn26vdipvtk4fc5-246875337716.us-east1.run.app' : '');

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
    const res = await fetch(`${API_BASE}/api/append`, { 
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

  // Add to Firebase finished ops
  await setDoc(doc(db, 'operations', id), { ...finishedOp, status: 'finished' });
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
  if (!docSnap.empty) {
    const data = docSnap.docs[0].data();
    try {
      const resp = await fetch(`${API_BASE}/api/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op: data.opNumber, linha: data.linha, produto: data.produto })
      });
      if (!resp.ok) {
        throw new Error(await resp.text());
      }
    } catch (e: any) {
      console.error('Delete API error', e);
      throw new Error(`Erro ao apagar planilha: ${e.message}`);
    }
  }
  await deleteDoc(doc(db, 'operations', id));
};

export const moveFinishedToPending = async (id: string, turno: string) => {
  const docSnap = await getDocs(query(collection(db, 'operations'), where('__name__', '==', id)));
  if (!docSnap.empty) {
    const data = docSnap.docs[0].data() as FinishedOperation;
    
    await removeFinishedOperation(id, turno);
    
    const newOp: Operation = {
      id: Math.random().toString(36).substring(2),
      opNumber: data.opNumber || '',
      linha: data.linha || '',
      produto: data.produto || '',
      litragem: data.litragem || '',
      turno: turno || 'A',
      horaInicial: data.horaInicial || '',
      carimboInicial: new Date().toISOString()
    };
    await addOperation(newOp);
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
