import { db } from './firebase';
import { collection, doc, setDoc, getDocs, getDoc, deleteDoc, updateDoc, query, where, onSnapshot, limit, orderBy } from 'firebase/firestore';

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
  isAvulsa?: boolean;
}

export interface FinishedOperation extends Operation {
  quantidade: string;
  horaFinal: string;
  qntReprocesso?: string;
  reportString?: string;
  reportDocId?: string;
  carimbo?: string;
  paradas?: ParadaRecord[];
  syncStatus?: 'success' | 'error' | 'pending';
  syncError?: string;
  isAvulsa?: boolean;
}

export const subscribeToOperations = (callback: (ops: Operation[]) => void) => {
  const q = query(
    collection(db, 'operations'), 
    where('status', '==', 'pending'),
    limit(500)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Operation)));
  });
};

export const subscribeToFinishedOps = (callback: (ops: FinishedOperation[]) => void) => {
  const q = query(
    collection(db, 'operations'), 
    where('status', '==', 'finished'),
    orderBy('carimboInicial', 'desc'),
    limit(1000)
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
    qntReprocesso: qntReprocesso || '',
    carimbo: formatedCarimbo,
    paradas: paradasFinais,
    syncStatus: 'pending'
  };

  // 1. Write to Firebase FIRST — instant due to offline cache
  try {
    await setDoc(doc(db, 'operations', op.id), { 
      ...finishedOp, 
      status: 'finished',
      isAvulsa: op.isAvulsa
    }, { merge: true });
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
    horaFinal,
    paradas: paradasFinais,
    isAvulsa: op.isAvulsa
  };

  fetch(`${API_BASE}/api/append`, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' }
  }).then(async res => {
    if (!res.ok) {
      const errText = await res.text();
      await updateDoc(doc(db, 'operations', op.id), { syncStatus: 'error', syncError: errText });
      onOneDriveSync?.(false, errText);
    } else {
      await updateDoc(doc(db, 'operations', op.id), { syncStatus: 'success', syncError: '' });
      onOneDriveSync?.(true);
    }
  }).catch(async error => {
    console.error("OneDrive sync failed", error);
    await updateDoc(doc(db, 'operations', op.id), { syncStatus: 'error', syncError: error.message });
    onOneDriveSync?.(false, error.message);
  });
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
  cacheProdutos = null; // invalidar cache
};

export const updateProduct = async (oldName: string, newName: string, newLitragem: string) => {
  const oldRef = doc(db, 'produtos', oldName.toUpperCase());
  const newRef = doc(db, 'produtos', newName.toUpperCase());
  
  if (oldName.toUpperCase() !== newName.toUpperCase()) {
    // If name changed, we need to move the data
    await setDoc(newRef, { produto: newName.toUpperCase(), litragem: newLitragem });
    await deleteDoc(oldRef);
  } else {
    // Just update litragem
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
    fetch(`${API_BASE}/api/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ op: data.opNumber, linha: data.linha, produto: data.produto, isAvulsa: data.isAvulsa })
    }).catch(e => console.error('Delete API error', e));
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
    
    // Attempt to remove from spreadsheet (fire and forget)
    fetch(`${API_BASE}/api/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ op: data.opNumber, linha: data.linha, produto: data.produto, isAvulsa: data.isAvulsa })
    }).catch(e => console.error('API delete error in revert', e));
    
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

    await setDoc(opDocRef, newOp);
  }
};

export const syncFinishedOperation = async (opId: string) => {
  const opDocRef = doc(db, 'operations', opId);
  const docSnap = await getDoc(opDocRef);
  if (!docSnap.exists()) return;
  const data = docSnap.data() as FinishedOperation;

  // We use /api/update which searches for the existing row by OP and Linha and updates it.
  // Importantly, /api/update completely deletes old paradas for this OP and inserts the ones in updates.paradas.
  // This achieves idempotency: no duplicates even if we run it multiple times.
  const payload = {
    originalData: {
      op: data.opNumber,
      linha: data.linha
    },
    updates: {
      opNumber: data.opNumber,
      horaInicial: data.horaInicial,
      horaFinal: data.horaFinal,
      litragem: data.litragem,
      produto: data.produto,
      linha: data.linha,
      turno: data.turno,
      quantidade: data.quantidade,
      qntReprocesso: data.qntReprocesso,
      paradas: data.paradas || [],
      isAvulsa: data.isAvulsa
    }
  };

  try {
    const resp = await fetch(`${API_BASE}/api/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    // Fallback: If /api/update returns 404, it means the OP was NEVER appended to the main sheet originally.
    if (resp.status === 404) {
      const appendPayload = {
        carimbo: `'${data.carimbo}`,
        op: data.opNumber,
        litragem: formatSheetLitragem(data.litragem || ''),
        produto: data.produto,
        linha: data.linha,
        turno: data.turno,
        quantidade: data.quantidade,
        qntReprocesso: data.qntReprocesso || '',
        horaInicial: data.horaInicial,
        horaFinal: data.horaFinal,
        paradas: data.paradas || [],
        isAvulsa: data.isAvulsa
      };
      
      const appendResp = await fetch(`${API_BASE}/api/append`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appendPayload)
      });
      
      if (!appendResp.ok) {
        throw new Error(await appendResp.text());
      }
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
  if (docSnap.exists()) {
    const original = docSnap.data();
    
    // Background fetch to update spreadsheet
    fetch(`${API_BASE}/api/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        originalData: { 
          op: original.opNumber, 
          linha: original.linha, 
          produto: original.produto, 
          isAvulsa: original.isAvulsa,
          carimbo: original.carimbo,
          litragem: original.litragem,
          turno: original.turno
        }, 
        updates: { ...data, isAvulsa: original.isAvulsa } 
      })
    }).then(async (resp) => {
      if (!resp.ok) {
        await updateDoc(opDocRef, { syncStatus: 'error', syncError: await resp.text() });
      } else {
        await updateDoc(opDocRef, { syncStatus: 'success', syncError: '' });
      }
    }).catch(async (e) => {
      console.error('Update API error', e);
      await updateDoc(opDocRef, { syncStatus: 'error', syncError: e.message });
    });
    
    // Update Firebase immediately
    await updateDoc(opDocRef, { ...data, syncStatus: 'pending' });
  }
};

export const updateOperation = async (id: string, data: Partial<Operation>) => {
  await updateDoc(doc(db, 'operations', id), data);
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

export const clearTurnoRecords = async (turno: string) => {
  const q = query(
    collection(db, 'operations'), 
    where('turno', '==', turno)
  );
  const snap = await getDocs(q);
  for (const item of snap.docs) {
    const data = item.data();
    if (data.status === 'finished' && data.syncStatus !== 'success') {
      console.log(`Preserving unsynced record ${item.id} during clearTurnoRecords`);
      continue;
    }
    await deleteDoc(doc(db, 'operations', item.id));
  }
};


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
    if (docSnap.exists()) {
      return docSnap.data();
    }
  } catch (err) {
    console.error("Firestore get profile error", err);
  }
  return null;
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

export const updateAuthProfile = async (profileName: string, dataOrPassword: string | Record<string, any>) => {
  const now = new Date().toISOString();
  
  let existing: any = null;
  const safeProfileName = String(profileName).replace(/\//g, '_');
  try {
    const docRef = doc(db, 'profiles', safeProfileName);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      existing = docSnap.data();
    }
  } catch (err) {
    console.warn("Could not fetch profile from firestore", err);
  }

  let newProfile: any = { name: profileName, lastChangedAt: now };
  
  if (typeof dataOrPassword === 'string') {
    newProfile.password = dataOrPassword;
  } else {
    newProfile = { ...existing, ...dataOrPassword, name: profileName, lastChangedAt: now };
  }

  // FIx deeply nested corrupted password
  let currentPassword = newProfile.password;
  while (currentPassword && typeof currentPassword === 'object') {
     currentPassword = currentPassword.password;
  }
  if (typeof currentPassword === 'string') {
     newProfile.password = currentPassword;
  }
  
  try {
    await setDoc(doc(db, 'profiles', safeProfileName), newProfile, { merge: true });
    cacheProfiles = null; // invalidar cache
  } catch (err: any) {
    console.error("Error saving profile to firestore", err);
    throw new Error(`Erro ao salvar na nuvem: ${err?.message || err}`);
  }
};
