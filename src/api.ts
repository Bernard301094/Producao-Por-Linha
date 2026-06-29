import { db, auth } from './firebase';
import { collection, doc, setDoc, getDocs, getDoc, deleteDoc, updateDoc, query, where, onSnapshot, limit, orderBy } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

export interface Parada {
  seq: number;
  tipologia: string;
  flag?: number;
  detalhamento?: string;
}

export interface ParadaRecord extends Parada {
  horaInicio: string;
  horaFim?: string;
  numeroOS?: string;
  observacao?: string;
}

export interface Operation {
  id: string;
  opNumber: string;
  produto: string;
  linha: string;
  turno: string;
  operador: string;
  horaInicial: string;
  carimboInicial?: string;
  litragem?: string;
  status?: string;
  paradas?: ParadaRecord[];
  isAvulsa?: boolean;
}

export interface FinishedOperation extends Operation {
  quantidade: string;
  horaFinal: string;
  observacoes?: string;
  reportString?: string;
  reportDocId?: string;
  carimbo?: string;
  paradas?: ParadaRecord[];
  syncStatus?: 'success' | 'error' | 'pending';
  syncError?: string;
}

export const subscribeToOperations = (linha: string | null, callback: (ops: Operation[]) => void) => {
  const conditions: any[] = [where('status', '==', 'pending')];
  if (linha && linha !== 'Todas') {
    conditions.push(where('linha', '==', linha));
  }
  
  const q = query(
    collection(db, 'operations'),
    ...conditions,
    limit(50)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Operation)));
  });
};

export const subscribeToFinishedOps = (linha: string | null, callback: (ops: FinishedOperation[]) => void) => {
  const conditions: any[] = [where('status', '==', 'finished')];
  if (linha && linha !== 'Todas') {
    conditions.push(where('linha', '==', linha));
  }

  const q = query(
    collection(db, 'operations'),
    ...conditions,
    orderBy('carimboInicial', 'desc'),
    limit(75)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as FinishedOperation)));
  });
};

// --- Cache variables for Master Data ---
let cacheParadas: Parada[] | null = null;
let cacheLinhas: string[] | null = null;
let cacheProfiles: {name: string}[] | null = null;
let cacheProdutos: {produto: string, litragem: string}[] | null = null;

export const invalidateCaches = () => {
  cacheParadas  = null;
  cacheLinhas   = null;
  cacheProfiles = null;
  cacheProdutos = null;
};

export const getOperations = async (): Promise<Operation[]> => {
  const q = query(collection(db, 'operations'), where('status', '==', 'pending'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Operation));
};

export const getParadas = async (): Promise<Parada[]> => {
  if (cacheParadas) return cacheParadas;
  const q = query(collection(db, 'paradas'));
  const snap = await getDocs(q);
  cacheParadas = snap.docs.map(d => ({ ...d.data() } as Parada)).sort((a,b) => a.seq - b.seq);
  return cacheParadas;
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

const API_BASE = import.meta.env?.VITE_API_URL || (isCapacitor ? 'https://producao-por-linha.vercel.app' : '');

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
  observacoes: string,
  paradas: ParadaRecord[],
  onOneDriveSync?: (success: boolean, error?: string) => void
) => {
  const formattedLinha = op.linha ? (isNaN(Number(op.linha)) ? op.linha : `Linha ${op.linha}`) : '';

  const now = new Date(Date.now()); // Fallback or imported getServerTime if imported
  const DD = String(now.getDate()).padStart(2, '0');
  const MM = String(now.getMonth() + 1).padStart(2, '0');
  const YYYY = now.getFullYear();
  const formatedCarimbo = `${DD}/${MM}/${YYYY}`;

  const paradasFinais: ParadaRecord[] = 
    (paradas && paradas.length > 0) 
      ? paradas 
      : (op.paradas && op.paradas.length > 0) 
        ? op.paradas 
        : [];

  const finishedOp: FinishedOperation = {
    ...op,
    linha: formattedLinha,
    quantidade,
    horaFinal,
    observacoes: observacoes || '',
    carimbo: formatedCarimbo,
    paradas: paradasFinais,
    syncStatus: 'pending'
  };

  // 1. Write to Firebase FIRST
  try {
    await setDoc(doc(db, 'operations', op.id), { 
      ...finishedOp, 
      status: 'finished'
    }, { merge: true });
  } catch (firebaseErr: any) {
    console.error("Firebase updateDoc failed", firebaseErr);
    throw new Error(`Erro ao salvar na nuvem: ${firebaseErr.message}`);
  }

  // 2. Sync SharePoint in background
  const payload = {
    carimbo:     `'${formatedCarimbo}`,
    op:          op.opNumber,
    produto:     op.produto,
    linha:       formattedLinha,
    turno:       op.turno,
    operador:    op.operador || '',
    quantidade,
    horaInicial: op.horaInicial,
    horaFinal,
    paradas:     paradasFinais,
    observacoes: observacoes || ''
  };

  try {
    const res = await authedFetch(`${API_BASE}/api/append`, JSON.stringify(payload));
    if (!res.ok) {
      const errText = await res.text();
      await updateDoc(doc(db, 'operations', op.id), { syncStatus: 'error', syncError: errText });
      onOneDriveSync?.(false, errText);
      throw new Error(errText);
    } else {
      await updateDoc(doc(db, 'operations', op.id), { syncStatus: 'success', syncError: '' });
      onOneDriveSync?.(true);
    }
  } catch (error: any) {
    console.error("SharePoint sync failed", error);
    await updateDoc(doc(db, 'operations', op.id), { syncStatus: 'error', syncError: error.message });
    onOneDriveSync?.(false, error.message);
    throw error;
  }
};

export const getProducts = async (): Promise<{produto: string, litragem: string}[]> => {
  if (cacheProdutos) return cacheProdutos;
  const q = query(collection(db, 'produtos'));
  const snap = await getDocs(q);
  cacheProdutos = snap.docs.map(d => ({ produto: d.data().produto || d.id, litragem: d.data().litragem || '' })).sort((a,b) => a.produto.localeCompare(b.produto));
  return cacheProdutos;
};

export const getLinhas = async (): Promise<string[]> => {
  if (cacheLinhas) return cacheLinhas;
  const q = query(collection(db, 'linhas'));
  const snap = await getDocs(q);
  cacheLinhas = snap.docs.map(d => d.data().nome || d.id).sort((a, b) => a.localeCompare(b));
  return cacheLinhas;
};

export const addProduct = async (produto: string, litragem: string) => {
  await setDoc(doc(db, 'produtos', produto.toUpperCase()), { produto: produto.toUpperCase(), litragem });
  cacheProdutos = null;
};

export const updateProduct = async (oldName: string, newName: string, newLitragem: string) => {
  const oldRef = doc(db, 'produtos', oldName.toUpperCase());
  const newRef = doc(db, 'produtos', newName.toUpperCase());
  
  if (oldName.toUpperCase() !== newName.toUpperCase()) {
    await setDoc(newRef, { produto: newName.toUpperCase(), litragem: newLitragem });
    await deleteDoc(oldRef);
  } else {
    await updateDoc(oldRef, { litragem: newLitragem });
  }
  cacheProdutos = null;
};

export const removeProduct = async (produto: string) => {
  await deleteDoc(doc(db, 'produtos', produto.toUpperCase()));
  cacheProdutos = null;
};

export const removeFinishedOperation = async (id: string, _turno: string) => {
  const opDocRef = doc(db, 'operations', id);
  const docSnap = await getDoc(opDocRef);
  
  if (docSnap.exists()) {
    const data = docSnap.data();
    authedFetch(`${API_BASE}/api/delete`, JSON.stringify({ op: data.opNumber, linha: data.linha, produto: data.produto })).catch(e => console.error('Delete API error', e));
  }
  
  try {
    await deleteDoc(opDocRef);
  } catch (firebaseErr: any) {
    console.error("Firebase deleteDoc failed", firebaseErr);
    throw new Error(`Erro ao deletar da nuvem: ${firebaseErr.message}`);
  }
};

export const moveFinishedToPending = async (id: string, turno: string) => {
  const opDocRef = doc(db, 'operations', id);
  const docSnap = await getDoc(opDocRef);
  if (docSnap.exists()) {
    const data = docSnap.data() as FinishedOperation;
    
    authedFetch(`${API_BASE}/api/delete`, JSON.stringify({ op: data.opNumber, linha: data.linha, produto: data.produto })).catch(e => console.error('API delete error in revert', e));
    
    const newOp: Operation = {
      id,
      opNumber:       data.opNumber      || '',
      linha:          data.linha         || '',
      produto:        data.produto       || '',
      litragem:       data.litragem      || '',
      turno:          turno              || 'A',
      operador:       data.operador      || '',
      horaInicial:    data.horaInicial   || '',
      carimboInicial: data.carimboInicial || new Date(Date.now()).toISOString(),
      status:         'pending',
      paradas:        data.paradas       || []
    };

    await setDoc(opDocRef, newOp);
  }
};

export const syncFinishedOperation = async (opId: string) => {
  const opDocRef = doc(db, 'operations', opId);
  const docSnap = await getDoc(opDocRef);
  if (!docSnap.exists()) return;
  const data = docSnap.data() as FinishedOperation;

  const payload = {
    originalData: {
      op:    data.opNumber,
      linha: data.linha
    },
    updates: {
      opNumber:    data.opNumber,
      horaInicial: data.horaInicial,
      horaFinal:   data.horaFinal,
      produto:     data.produto,
      linha:       data.linha,
      turno:       data.turno,
      operador:    data.operador || '',
      quantidade:  data.quantidade,
      paradas:     data.paradas || [],
      observacoes: data.observacoes || ''
    }
  };

  try {
    const resp = await authedFetch(`${API_BASE}/api/update`, JSON.stringify(payload));
    
    if (resp.status === 404) {
      const appendPayload = {
        carimbo:     `'${data.carimbo}`,
        op:          data.opNumber,
        produto:     data.produto,
        linha:       data.linha,
        turno:       data.turno,
        operador:    data.operador || '',
        quantidade:  data.quantidade,
        horaInicial: data.horaInicial,
        horaFinal:   data.horaFinal,
        paradas:     data.paradas || [],
        observacoes: data.observacoes || ''
      };
      
      const appendResp = await authedFetch(`${API_BASE}/api/append`, JSON.stringify(appendPayload));
      if (!appendResp.ok) throw new Error(await appendResp.text());
    } else if (!resp.ok) {
      throw new Error(await resp.text());
    }
    
    await updateDoc(opDocRef, { syncStatus: 'success', syncError: '' });
  } catch (error: any) {
    console.error("Manual sync failed", error);
    await updateDoc(opDocRef, { syncStatus: 'error', syncError: error.message });
    throw error;
  }
};

export const updateFinishedOperation = async (oldId: string, data: Partial<FinishedOperation>, _turno: string) => {
  const opDocRef = doc(db, 'operations', oldId);
  const docSnap = await getDoc(opDocRef);
  if (!docSnap.exists()) return;

  const original = docSnap.data() as FinishedOperation;
  const mergedOp = { ...original, ...data } as FinishedOperation;

  const cleanData = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));
  await updateDoc(opDocRef, { ...cleanData, syncStatus: 'pending' });

  try {
    const resp = await authedFetch(`${API_BASE}/api/update`, JSON.stringify({
      originalData: {
        op:       original.opNumber,
        linha:    original.linha,
        produto:  original.produto,
        carimbo:  original.carimbo,
        turno:    original.turno,
        operador: original.operador || ''
      },
      updates: { ...data, operador: (data.operador ?? original.operador) || '' }
    }));

    if (resp.status === 404) {
      const appendResp = await authedFetch(`${API_BASE}/api/append`, JSON.stringify({
        carimbo:     `'${mergedOp.carimbo}`,
        op:          mergedOp.opNumber,
        produto:     mergedOp.produto,
        linha:       mergedOp.linha,
        turno:       mergedOp.turno,
        operador:    mergedOp.operador || '',
        quantidade:  mergedOp.quantidade || '0',
        horaInicial: mergedOp.horaInicial,
        horaFinal:   mergedOp.horaFinal,
        paradas:     mergedOp.paradas || [],
        observacoes: mergedOp.observacoes || ''
      }));
      if (!appendResp.ok) {
        const errText = await appendResp.text();
        await updateDoc(opDocRef, { syncStatus: 'error', syncError: errText });
        throw new Error(errText);
      } else {
        await updateDoc(opDocRef, { syncStatus: 'success', syncError: '' });
      }
    } else if (!resp.ok) {
      const errText = await resp.text();
      await updateDoc(opDocRef, { syncStatus: 'error', syncError: errText });
      throw new Error(errText);
    } else {
      await updateDoc(opDocRef, { syncStatus: 'success', syncError: '' });
    }
  } catch (e: any) {
    console.error('Update API error', e);
    await updateDoc(opDocRef, { syncStatus: 'error', syncError: e.message });
    throw e;
  }
};

export const updateOperation = async (id: string, data: Partial<Operation>) => {
  const cleanData = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));
  await updateDoc(doc(db, 'operations', id), cleanData);
};

export const convertAvulsaToOp = async (
  opId: string,
  horaInicial: string,
  horaFinal: string,
  quantidade: string,
  onSync?: (success: boolean, error?: string) => void
) => {
  const opDocRef = doc(db, 'operations', opId);
  const docSnap  = await getDoc(opDocRef);
  if (!docSnap.exists()) throw new Error('Operação não encontrada.');

  const original = docSnap.data() as FinishedOperation;

  await updateDoc(opDocRef, {
    horaInicial,
    horaFinal,
    quantidade,
    syncStatus: 'pending',
    syncError:  ''
  });

  const payload = {
    carimbo:     `'${original.carimbo}`,
    op:          original.opNumber,
    produto:     original.produto,
    linha:       original.linha,
    turno:       original.turno,
    operador:    original.operador || '',
    quantidade:  quantidade || '0',
    horaInicial,
    horaFinal,
    paradas:     [],
    isAvulsa:    false
  };

  authedFetch(`${API_BASE}/api/append`, JSON.stringify(payload)).then(async res => {
    if (!res.ok) {
      const err = await res.text();
      await updateDoc(opDocRef, { syncStatus: 'error', syncError: err });
      onSync?.(false, err);
    } else {
      await updateDoc(opDocRef, { syncStatus: 'success', syncError: '' });
      onSync?.(true);
    }
  }).catch(async error => {
    await updateDoc(opDocRef, { syncStatus: 'error', syncError: error.message });
    onSync?.(false, error.message);
  });
};

export const getReportForDateAndShift = async (date: string, shift: string) => {
  const q = query(
    collection(db, 'operations'), 
    where('status', '==', 'finished'),
    where('carimbo', '==', date),
    where('turno', '==', shift)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as FinishedOperation));
};

export const cleanSyncedRecords = async () => {
  // Find finished records that were successfully synced and are older than 48h
  const q = query(
    collection(db, 'operations'), 
    where('status', '==', 'finished'),
    where('syncStatus', '==', 'success')
  );
  const snap = await getDocs(q);
  const now = Date.now();
  const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000;

  for (const item of snap.docs) {
    const data = item.data();
    if (data.carimboInicial) {
      const createdTime = new Date(data.carimboInicial).getTime();
      if (now - createdTime > FORTY_EIGHT_HOURS) {
        console.log(`Cleaning old synced record: ${item.id}`);
        await deleteDoc(doc(db, 'operations', item.id));
      }
    }
  }
};


// ─── Firebase Auth helpers ──────────────────────────────────────────────────

const PROFILE_EMAIL_MAP: Record<string, string> = {
  'Turno A':    'turnoa@vonixx.com',
  'Turno B':    'turnob@vonixx.com',
  'Turno C':    'turnoc@vonixx.com',
  'Turno D':    'turnod@vonixx.com',
  'Supervisor': 'supervisao@vonixx.com',
};

const profileToEmail = (profileName: string): string => {
  if (PROFILE_EMAIL_MAP[profileName]) return PROFILE_EMAIL_MAP[profileName];
  const slug = profileName
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9.]/g, '');
  return `${slug}@vonixx.com`;
};

export const signInToFirebase = async (profileName: string, password: string) => {
  const email = profileToEmail(profileName);
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err: any) {
    if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
      try {
        await createUserWithEmailAndPassword(auth, email, password);
        return;
      } catch (createErr: any) {
        if (createErr.code === 'auth/email-already-in-use') throw err;
        throw createErr;
      }
    }
    throw err;
  }
};

export const signOutFromFirebase = async () => {
  await signOut(auth);
};

export const reauthenticateCurrentUser = async (profileName: string, password: string) => {
  const user = auth.currentUser;
  if (!user) throw new Error('Nenhum usuário autenticado.');
  const credential = EmailAuthProvider.credential(profileToEmail(profileName), password);
  await reauthenticateWithCredential(user, credential);
};

export const verifySupervisorPassword = async (password: string): Promise<boolean> => {
  try {
    const apiKey = (firebaseConfig as any).apiKey;
    const resp = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: profileToEmail('Supervisor'), password, returnSecureToken: false })
      }
    );
    return resp.ok;
  } catch {
    return false;
  }
};

const getApiHeaders = async (): Promise<Record<string, string>> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    if (auth.currentUser) {
      const token = await auth.currentUser.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch (e) {
    console.warn('Could not attach auth token to request:', e);
  }
  return headers;
};

const authedFetch = (url: string, body: string): Promise<Response> =>
  getApiHeaders().then(headers => fetch(url, { method: 'POST', headers, body }));

// ─────────────────────────────────────────────────────────────────────────────

export const getProfiles = async (): Promise<{name: string}[]> => {
  if (cacheProfiles) return cacheProfiles;
  const q = query(collection(db, 'profiles'));
  const snap = await getDocs(q);
  cacheProfiles = snap.docs.map(d => ({ name: d.id })).sort((a,b) => a.name.localeCompare(b.name));
  return cacheProfiles;
};

export const getAuthProfile = async (profileName: string) => {
  try {
    const docRef = doc(db, 'profiles', profileName);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) return docSnap.data();
  } catch (err) {
    console.error("Firestore get profile error", err);
  }
  return null;
};

export const checkSheetConnection = async () => {
  try {
    const response = await fetch(`${API_BASE}/api/config-check`);
    if (!response.ok) throw new Error(`Erro na API: ${response.status}`);
    return await response.json();
  } catch (err) {
    return { status: 'Error', error: String(err) };
  }
};

export const updateAuthProfile = async (profileName: string, dataOrPassword: string | Record<string, any>) => {
  const now = new Date(Date.now()).toISOString();
  const safeProfileName = String(profileName).replace(/\//g, '_');

  if (typeof dataOrPassword === 'string') {
    if (auth.currentUser) await updatePassword(auth.currentUser, dataOrPassword);
    try {
      await setDoc(doc(db, 'profiles', safeProfileName), { name: profileName, lastChangedAt: now }, { merge: true });
      cacheProfiles = null;
    } catch (err) {
      console.warn('Could not update Firestore profile metadata:', err);
    }
    return;
  }

  const { password: _pw, senha: _senha, ...safeMeta } = dataOrPassword as Record<string, any>;
  try {
    await setDoc(doc(db, 'profiles', safeProfileName), { ...safeMeta, name: profileName, lastChangedAt: now }, { merge: true });
    cacheProfiles = null;
  } catch (err: any) {
    console.error('Error saving profile to Firestore:', err);
    throw new Error(`Erro ao salvar na nuvem: ${err?.message || err}`);
  }
};
