import { format } from 'date-fns';

export interface Operation {
  id: string;
  opNumber: string;
  litragem: string;
  produto: string;
  linha: string;
  turno: string;
  horaInicial: string;
  carimboInicial: string;
  localId?: string;
}

export interface FinishedOperation extends Operation {
  quantidade: string;
  horaFinal: string;
  reportDocId?: string;
  reportString?: string;
  carimbo?: string;
}

import { initialProducts } from './produtos';
import { collection, doc, setDoc, getDocs, getDoc, deleteDoc, query, where, onSnapshot, updateDoc, arrayUnion, arrayRemove, addDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface AuthProfile {
  password?: string;
  lastPasswordChange?: string;
}

export const getAuthProfile = async (profileId: string): Promise<AuthProfile | null> => {
  try {
    const docRef = doc(db, 'authProfiles', profileId);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return snapshot.data() as AuthProfile;
    }
  } catch(error) {
    handleFirestoreError(error, OperationType.GET, `authProfiles/${profileId}`);
  }
  return null;
};

export const updateAuthProfile = async (profileId: string, profile: AuthProfile) => {
  try {
    const docRef = doc(db, 'authProfiles', profileId);
    await setDoc(docRef, profile, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `authProfiles/${profileId}`);
  }
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// ── Finished Operations (Firestore) ──────────────────────────────────────────

export const getFinishedOperations = async (): Promise<FinishedOperation[]> => {
  try {
    const snapshot = await getDocs(collection(db, 'finishedOperations'));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FinishedOperation));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'finishedOperations');
    return [];
  }
};

export const subscribeFinishedOperations = (callback: (ops: FinishedOperation[]) => void): (() => void) => {
  const q = query(collection(db, 'finishedOperations'));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FinishedOperation)));
  });
};

export const addFinishedOperation = async (op: FinishedOperation): Promise<string> => {
  const { id, ...data } = op;
  try {
    const docRef = await addDoc(collection(db, 'finishedOperations'), { ...data, localId: id });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'finishedOperations');
    return '';
  }
};

// ── Products ──────────────────────────────────────────────────────────────────

export const getProducts = async () => {
  let dbProducts: {produto: string, litragem: string}[] = [];
  try {
    const snapshot = await getDocs(collection(db, 'products'));
    snapshot.forEach(doc => {
      const data = doc.data();
      dbProducts.push({ produto: data.produto, litragem: data.litragem });
    });
  } catch (err) {
    console.error('Error fetching products from db', err);
  }
  const allProducts = [...initialProducts, ...dbProducts];
  const uniqueProducts = Array.from(new Map(allProducts.map(item => [item.produto, item])).values());
  return uniqueProducts;
};

export const addProduct = async (produto: string, litragem: string) => {
  if (initialProducts.find(p => p.produto === produto)) return;
  try {
    const q = query(collection(db, 'products'), where('produto', '==', produto));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      await setDoc(doc(collection(db, 'products')), { produto, litragem });
    }
  } catch(error) {
    handleFirestoreError(error, OperationType.CREATE, 'products');
  }
};

// ── Pending Operations ────────────────────────────────────────────────────────

export const getOperations = async (): Promise<Operation[]> => {
  try {
    const snapshot = await getDocs(query(collection(db, 'pendingOperations')));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Operation));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'pendingOperations');
    return [];
  }
};

export const addOperation = async (op: Operation) => {
  const { id, ...operationData } = op;
  const payload = { ...operationData, localId: id };
  try {
    const docRef = doc(collection(db, 'pendingOperations'));
    await setDoc(docRef, payload);
    op.id = docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'pendingOperations');
  }
};

export const removeOperation = async (id: string) => {
  try {
    await deleteDoc(doc(db, 'pendingOperations', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `pendingOperations/${id}`);
  }
};

export const updateOperation = async (id: string, updates: Partial<Operation>) => {
  try {
    await setDoc(doc(db, 'pendingOperations', id), updates, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'pendingOperations');
  }
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const getCompactString = (op: FinishedOperation | any) =>
  `${op.opNumber}|${op.linha}|${op.produto}|${op.litragem}|${op.quantidade}|${op.horaInicial}|${op.horaFinal}`;

/**
 * Busca el documento en finishedOperations correspondiente a una op concluida.
 * Si el id pasado no existe como doc de Firestore (es un string compacto del report),
 * busca por campo reportString.
 */
const resolveFinishedOpDoc = async (id: string): Promise<{ docId: string; op: FinishedOperation } | null> => {
  // Intento 1: el id es un doc real de Firestore
  const directRef = doc(db, 'finishedOperations', id);
  const directSnap = await getDoc(directRef);
  if (directSnap.exists()) {
    return { docId: id, op: { id, ...directSnap.data() } as FinishedOperation };
  }

  // Intento 2: el id es el reportString compacto → buscar por campo
  try {
    const q = query(collection(db, 'finishedOperations'), where('reportString', '==', id));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const d = snap.docs[0];
      return { docId: d.id, op: { id: d.id, ...d.data() } as FinishedOperation };
    }
  } catch (e) {
    console.error('resolveFinishedOpDoc query failed', e);
  }

  return null;
};

// ── Update / Remove Finished ──────────────────────────────────────────────────

export const updateFinishedOperation = async (id: string, updates: Partial<FinishedOperation>) => {
  try {
    const resolved = await resolveFinishedOpDoc(id);
    if (!resolved) {
      console.warn('updateFinishedOperation: doc not found for id', id);
      return;
    }
    const { docId, op: oldOp } = resolved;

    const newOp = { ...oldOp, ...updates };
    const newCompactString = getCompactString(newOp);
    const oldCompactString = oldOp.reportString || getCompactString(oldOp);
    newOp.reportString = newCompactString;

    const docRef = doc(db, 'finishedOperations', docId);
    await setDoc(docRef, { ...updates, reportString: newCompactString }, { merge: true });

    // Sincronizar doc reports en Firestore
    const reportDocId = newOp.reportDocId || oldOp.reportDocId;
    if (reportDocId && oldCompactString !== newCompactString) {
      try {
        const reportRef = doc(db, 'reports', reportDocId);
        await setDoc(reportRef, { ops: arrayRemove(oldCompactString) }, { merge: true });
        await setDoc(reportRef, { ops: arrayUnion(newCompactString) }, { merge: true });
      } catch(error) {
        console.error('Failed to sync edit to Firestore reports', error);
      }
    }

    // Sincronizar Google Sheets
    const carimbo = newOp.carimbo || oldOp.carimbo;
    if (carimbo) {
      try {
        await fetch('/api/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            oldCarimbo: carimbo,
            oldOp: oldOp.opNumber,
            newData: {
              carimbo,
              op: newOp.opNumber,
              litragem: newOp.litragem,
              produto: newOp.produto,
              linha: newOp.linha,
              turno: newOp.turno,
              quantidade: newOp.quantidade,
              horaInicial: newOp.horaInicial,
              horaFinal: newOp.horaFinal
            }
          })
        });
      } catch (e) {
        console.error('Failed to sync update to sheets', e);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `finishedOperations/${id}`);
  }
};

export const removeFinishedOperation = async (id: string) => {
  try {
    const resolved = await resolveFinishedOpDoc(id);
    if (!resolved) return;
    const { docId, op } = resolved;

    await deleteDoc(doc(db, 'finishedOperations', docId));

    if (op.carimbo) {
      try {
        const res = await fetch('/api/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ carimbo: op.carimbo, op: op.opNumber })
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Erro no servidor ao excluir do Sheets');
        }
      } catch (e: any) {
        console.error('Failed to sync delete to sheets:', e);
        throw e;
      }
    }

    const stringToRemove = op.reportString || getCompactString(op);
    const reportDocId = op.reportDocId;
    if (reportDocId) {
      try {
        const reportRef = doc(db, 'reports', reportDocId);
        await setDoc(reportRef, { ops: arrayRemove(stringToRemove) }, { merge: true });
      } catch(error) {
        console.error('Failed to remove from Firestore reports', error);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `finishedOperations/${id}`);
  }
};

// ── Move Finished back to Pending ─────────────────────────────────────────────

export const moveFinishedToPending = async (id: string) => {
  try {
    const resolved = await resolveFinishedOpDoc(id);
    if (!resolved) return;
    const { docId, op } = resolved;

    await deleteDoc(doc(db, 'finishedOperations', docId));

    const stringToRemove = op.reportString || getCompactString(op);
    if (op.reportDocId) {
      try {
        const reportRef = doc(db, 'reports', op.reportDocId);
        await setDoc(reportRef, { ops: arrayRemove(stringToRemove) }, { merge: true });
      } catch(error) {
        console.error('Failed to remove from Firestore reports', error);
      }
    }

    if (op.carimbo) {
      try {
        await fetch('/api/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ carimbo: op.carimbo, op: op.opNumber })
        });
      } catch (e) {
        console.error('Failed to remove from sheets on revert', e);
      }
    }

    const { quantidade, horaFinal, reportDocId, reportString, carimbo, ...pendingData } = op;
    const newPendingOp: Operation = {
      ...pendingData,
      carimboInicial: op.carimboInicial || new Date().toISOString(),
    };
    await addOperation(newPendingOp);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `finishedOperations/${id}`);
  }
};

// ── Mark Finished ─────────────────────────────────────────────────────────────

export const markOperationFinished = async (id: string, quantidade: string, horaFinal: string) => {
  const ops = await getOperations();
  const op = ops.find(o => o.id === id);
  if (!op) return null;

  const today = new Date();
  const dateStr = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-');
  const docId = `${dateStr}_${op.turno}`;
  const formatedCarimbo = format(new Date(), 'dd/MM/yyyy HH:mm:ss');

  try {
    const formattedLinha = op.linha ? (isNaN(Number(op.linha)) ? op.linha : `Linha ${op.linha}`) : '';

    const finishedOp: FinishedOperation = {
      ...op,
      linha: formattedLinha,
      quantidade,
      horaFinal,
      reportDocId: docId,
      carimbo: formatedCarimbo
    };

    const compactString = getCompactString(finishedOp);
    finishedOp.reportString = compactString;

    const payload = {
      carimbo: formatedCarimbo,
      op: op.opNumber,
      litragem: op.litragem,
      produto: op.produto,
      linha: formattedLinha,
      turno: op.turno,
      quantidade,
      horaInicial: op.horaInicial,
      horaFinal
    };

    fetch('/api/append', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(async (sheetRes) => {
      if (!sheetRes.ok) {
        const errJson = await sheetRes.json();
        console.error('Erro ao comunicar com a planilha:', errJson.error);
      }
    }).catch(e => console.error('Erro de rede ao salvar na planilha', e));

    const reportRef = doc(db, 'reports', docId);
    await setDoc(reportRef, { ops: arrayUnion(compactString) }, { merge: true });

    await removeOperation(id);
    await addFinishedOperation(finishedOp);

    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `reports/${docId}`);
  }
};

// ── Reports ───────────────────────────────────────────────────────────────────

export const getReportForDateAndShift = async (dateStr: string, shift: string): Promise<any[]> => {
  const docId = `${dateStr}_${shift}`;
  try {
    const snapshot = await getDoc(doc(db, 'reports', docId));
    if (snapshot.exists()) {
      return snapshot.data().ops || [];
    }
  } catch(error) {
    handleFirestoreError(error, OperationType.GET, `reports/${docId}`);
  }
  return [];
};
