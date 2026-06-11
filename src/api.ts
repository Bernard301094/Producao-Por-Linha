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

export const subscribeToOperations = (linha: string | null, callback: (ops: Operation[]) => void) => {
  const conditions: any[] = [where('status', '==', 'pending')];
  if (linha && linha !== 'Todas') {
    conditions.push(where('linha', '==', linha));
  }
  
  const q = query(
    collection(db, 'operations'),
    ...conditions,
    limit(50) // A factory rarely has >20 pending OPs at once; 50 is a safe ceiling
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
    limit(75) // Ordered most-recent-first; a full 8-h shift rarely exceeds 30 OPs (was 1000)
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

/**
 * Call on logout so the next session always fetches fresh master data.
 * Operational data (operations/finishedOps) is managed by onSnapshot listeners,
 * not by these caches, so they don't need to be invalidated.
 */
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

/**
 * DETERMINISTIC API BASE URL
 * In Capacitor native environments, nested fetch('/api/...') calls default to capacitor://localhost/api/...
 * which doesn't exist. We must point to the absolute URL of the deployed backend.
 */
// @ts-ignore
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
      isAvulsa: op.isAvulsa ?? false
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
    isAvulsa: op.isAvulsa ?? false
  };

  authedFetch(`${API_BASE}/api/append`, JSON.stringify(payload)).then(async res => {
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
    authedFetch(`${API_BASE}/api/delete`, JSON.stringify({ op: data.opNumber, linha: data.linha, produto: data.produto, isAvulsa: data.isAvulsa })).catch(e => console.error('Delete API error', e));
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
    authedFetch(`${API_BASE}/api/delete`, JSON.stringify({ op: data.opNumber, linha: data.linha, produto: data.produto, isAvulsa: data.isAvulsa })).catch(e => console.error('API delete error in revert', e));
    
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
    const resp = await authedFetch(`${API_BASE}/api/update`, JSON.stringify(payload));
    
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
      
      const appendResp = await authedFetch(`${API_BASE}/api/append`, JSON.stringify(appendPayload));
      
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
  if (!docSnap.exists()) return;

  const original = docSnap.data() as FinishedOperation;
  // Merge original + updates so the fallback append has all fields
  const mergedOp = { ...original, ...data } as FinishedOperation;

  // Background fetch to update spreadsheet
  authedFetch(`${API_BASE}/api/update`, JSON.stringify({
    originalData: {
      op:       original.opNumber,
      linha:    original.linha,
      produto:  original.produto,
      isAvulsa: original.isAvulsa ?? false,
      carimbo:  original.carimbo,
      litragem: original.litragem,
      turno:    original.turno
    },
    updates: { ...data, isAvulsa: original.isAvulsa ?? false }
  })).then(async (resp) => {
    // 404 means the Apontamento row was never created — create it now (non-avulsa only)
    if (resp.status === 404 && !original.isAvulsa) {
      const appendResp = await authedFetch(`${API_BASE}/api/append`, JSON.stringify({
          carimbo:       `'${mergedOp.carimbo}`,
          op:            mergedOp.opNumber,
          litragem:      mergedOp.litragem || '',
          produto:       mergedOp.produto,
          linha:         mergedOp.linha,
          turno:         mergedOp.turno,
          quantidade:    mergedOp.quantidade || '0',
          qntReprocesso: mergedOp.qntReprocesso || '0',
          horaInicial:   mergedOp.horaInicial,
          horaFinal:     mergedOp.horaFinal,
          paradas:       mergedOp.paradas || [],
          isAvulsa:      false
        }));
      if (!appendResp.ok) {
        await updateDoc(opDocRef, { syncStatus: 'error', syncError: await appendResp.text() });
      } else {
        await updateDoc(opDocRef, { syncStatus: 'success', syncError: '' });
      }
    } else if (!resp.ok) {
      await updateDoc(opDocRef, { syncStatus: 'error', syncError: await resp.text() });
    } else {
      await updateDoc(opDocRef, { syncStatus: 'success', syncError: '' });
    }
  }).catch(async (e) => {
    console.error('Update API error', e);
    await updateDoc(opDocRef, { syncStatus: 'error', syncError: e.message });
  });

  // Update Firebase immediately (optimistic)
  await updateDoc(opDocRef, { ...data, syncStatus: 'pending' });
};

export const updateOperation = async (id: string, data: Partial<Operation>) => {
  await updateDoc(doc(db, 'operations', id), data);
};

/**
 * Converts a finished "isAvulsa" record into a regular production OP.
 * 1. Updates Firestore in-place (sets isAvulsa=false + production fields).
 * 2. Removes the old avulsa row from the spreadsheet (fire-and-forget).
 * 3. Appends a new full production row to the spreadsheet (fire-and-forget).
 * No existing documents are deleted; only the spreadsheet row is replaced.
 */
export const convertAvulsaToOp = async (
  opId: string,
  horaInicial: string,
  horaFinal: string,
  onSync?: (success: boolean, error?: string) => void
) => {
  const opDocRef = doc(db, 'operations', opId);
  const docSnap  = await getDoc(opDocRef);
  if (!docSnap.exists()) throw new Error('Operação não encontrada.');

  const original = docSnap.data() as FinishedOperation;

  // 1. Update Firestore: set production times and clear avulsa flag
  await updateDoc(opDocRef, {
    horaInicial,
    horaFinal,
    isAvulsa:   false,
    syncStatus: 'pending',
    syncError:  ''
  });

  // 2. Append the production summary to Apontamento ONLY (fire and forget).
  //    Existing PARADAS rows are intentionally preserved — they were written at avulsa creation.
  const payload = {
    carimbo:       `'${original.carimbo}`,
    op:            original.opNumber,
    litragem:      formatSheetLitragem(original.litragem || ''),
    produto:       original.produto,
    linha:         original.linha,
    turno:         original.turno,
    quantidade:    original.quantidade || '0',
    qntReprocesso: original.qntReprocesso || '0',
    horaInicial,
    horaFinal,
    paradas:       [],
    isAvulsa:      false
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


// ─── Firebase Auth helpers ──────────────────────────────────────────────────

/** Maps a profile display name to its Firebase Auth email.
 *  Uses an explicit map to match accounts already created in the Firebase console.
 *  Unknown profiles fall back to a slug formula (lowercase, dots for spaces). */
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

/** Sign in a profile via Firebase Auth (email/password). */
export const signInToFirebase = async (profileName: string, password: string) => {
  const email = profileToEmail(profileName);
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err: any) {
    if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
      // NOTE: invalid-credential in new Firebase versions also happens if user doesn't exist.
      // We will try to create the user. If it already exists, this new call will fail with email-already-in-use.
      try {
        await createUserWithEmailAndPassword(auth, email, password);
        return; // Success creating and signing in
      } catch (createErr: any) {
        if (createErr.code === 'auth/email-already-in-use') {
          throw err; // The user exists, so it was indeed a wrong password
        }
        throw createErr;
      }
    }
    throw err;
  }
};

/** Sign out the current Firebase Auth user. */
export const signOutFromFirebase = async () => {
  await signOut(auth);
};

/** Re-authenticate the currently signed-in user (required before password change). */
export const reauthenticateCurrentUser = async (profileName: string, password: string) => {
  const user = auth.currentUser;
  if (!user) throw new Error('Nenhum usuário autenticado.');
  const credential = EmailAuthProvider.credential(profileToEmail(profileName), password);
  await reauthenticateWithCredential(user, credential);
};

/**
 * Verifies supervisor credentials via the Firebase Auth REST API WITHOUT
 * changing the current app session — safe to call while another user is logged in.
 */
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

/** Returns Content-Type + Authorization JWT headers for all backend /api/* calls. */
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

/** Authenticated POST wrapper for all /api/* backend calls. */
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
  const safeProfileName = String(profileName).replace(/\//g, '_');

  if (typeof dataOrPassword === 'string') {
    // 1. Update Firebase Auth password (primary credential store)
    if (auth.currentUser) {
      await updatePassword(auth.currentUser, dataOrPassword);
    }
    // Update lastChangedAt only
    try {
      await setDoc(doc(db, 'profiles', safeProfileName), {
        name: profileName, lastChangedAt: now
      }, { merge: true });
      cacheProfiles = null;
    } catch (err) {
      console.warn('Could not update Firestore profile metadata:', err);
    }
    return;
  }

  // Object update — strip any credential fields, persist metadata only
  const { password: _pw, senha: _senha, ...safeMeta } = dataOrPassword as Record<string, any>;
  try {
    await setDoc(doc(db, 'profiles', safeProfileName), {
      ...safeMeta, name: profileName, lastChangedAt: now
    }, { merge: true });
    cacheProfiles = null;
  } catch (err: any) {
    console.error('Error saving profile to Firestore:', err);
    throw new Error(`Erro ao salvar na nuvem: ${err?.message || err}`);
  }
};
