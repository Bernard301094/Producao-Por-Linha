import { format } from 'date-fns';

export interface Operation {
  id: string; // Document ID in Firestore / Local ID
  opNumber: string;
  litragem: string;
  produto: string;
  linha: string;
  turno: string;
  horaInicial: string; // HH:mm format
  carimboInicial: string; // Date string for the timestamp
  localId?: string; // Optional local id tracking
}

export interface FinishedOperation extends Operation {
  quantidade: string;
  horaFinal: string;
  reportDocId?: string;
  reportString?: string;
  carimbo?: string;
}

import localforage from 'localforage';
import { initialProducts } from './produtos';
import { collection, doc, setDoc, getDocs, getDoc, deleteDoc, query, where, onSnapshot, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
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

localforage.config({
  name: 'SheetOpsStore',
  storeName: 'operations'
});

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
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const getFinishedOperations = async (): Promise<FinishedOperation[]> => {
  const ops = await localforage.getItem<FinishedOperation[]>('finished_ops');
  return ops || [];
};

export const addFinishedOperation = async (op: FinishedOperation) => {
  const ops = await getFinishedOperations();
  ops.push(op);
  await localforage.setItem('finished_ops', ops);
};

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

  // Combine initialProducts and dbProducts, avoiding duplicates
  const allProducts = [...initialProducts, ...dbProducts];
  const uniqueProducts = Array.from(new Map(allProducts.map(item => [item.produto, item])).values());
  return uniqueProducts;
};

export const addProduct = async (produto: string, litragem: string) => {
  // Check if it already exists in initialProducts
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

export const getOperations = async (): Promise<Operation[]> => {
  const q = query(collection(db, 'pendingOperations'));
  
  try {
     const snapshot = await getDocs(q);
     const ops: Operation[] = [];
     snapshot.forEach(doc => {
       ops.push({ id: doc.id, ...doc.data() } as Operation);
     });
     return ops;
  } catch (error) {
     handleFirestoreError(error, OperationType.GET, 'pendingOperations');
     return [];
  }
};

export const addOperation = async (op: Operation) => {
  const { id, ...operationData } = op;
  const payload = {
    ...operationData,
    localId: id // Just for some uniqueness or original ID tracking
  };
  // remove the old generic id property before saving as we'll use doc(db) id
  
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
    const docRef = doc(db, 'pendingOperations', id);
    await setDoc(docRef, updates, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'pendingOperations');
  }
};

const getCompactString = (op: FinishedOperation | any) => {
  return `${op.opNumber}|${op.linha}|${op.produto}|${op.litragem}|${op.quantidade}|${op.horaInicial}|${op.horaFinal}`;
};

export const updateFinishedOperation = async (id: string, updates: Partial<FinishedOperation>) => {
  const ops = await getFinishedOperations();
  const index = ops.findIndex(o => o.id === id || o.localId === id);
  if (index !== -1) {
     const oldOp = ops[index];
     const newOp = { ...oldOp, ...updates };
     
     // Update reportString if fields changed
     const newCompactString = getCompactString(newOp);
     const oldCompactString = oldOp.reportString || getCompactString(oldOp);
     
     newOp.reportString = newCompactString;
     ops[index] = newOp;
     await localforage.setItem('finished_ops', ops);

     // 1. Update Firestore Report
     if (oldOp.reportDocId && oldCompactString !== newCompactString) {
        try {
           const reportRef = doc(db, 'reports', oldOp.reportDocId);
           await setDoc(reportRef, {
              ops: arrayRemove(oldCompactString)
           }, { merge: true });
           await setDoc(reportRef, {
              ops: arrayUnion(newCompactString)
           }, { merge: true });
        } catch(error) {
           console.error("Failed to sync edit to Firestore reports", error);
        }
     }

     // 2. Sync to Google Sheets
     if (oldOp.carimbo) {
        try {
           await fetch('/api/update', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({
                oldCarimbo: oldOp.carimbo,
                oldOp: oldOp.opNumber,
                newData: {
                   carimbo: oldOp.carimbo,
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
           console.error("Failed to sync update to sheets", e);
        }
     }
  }
};

export const removeFinishedOperation = async (id: string) => {
  const ops = await getFinishedOperations();
  const index = ops.findIndex(o => o.id === id || o.localId === id);
  if (index !== -1) {
     const op = ops[index];
     ops.splice(index, 1);
     await localforage.setItem('finished_ops', ops);

     // 1. Delete from Sheets
     if (op.carimbo) {
        try {
           const res = await fetch('/api/delete', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({
                carimbo: op.carimbo,
                op: op.opNumber
             })
           });
           if (!res.ok) {
             const data = await res.json();
             throw new Error(data.error || 'Erro no servidor ao excluir do Sheets');
           }
        } catch (e: any) {
           console.error("Failed to sync delete to sheets:", e);
           throw e; // Rethrow to show toast in UI
        }
     }

     // 2. Remove from Firestore Report
     const stringToRemove = op.reportString || getCompactString(op);
     if (op.reportDocId) {
        try {
           const reportRef = doc(db, 'reports', op.reportDocId);
           await setDoc(reportRef, {
              ops: arrayRemove(stringToRemove)
           }, { merge: true });
        } catch(error) {
           console.error("Failed to remove from Firestore reports", error);
        }
     }
  }
};

export const markOperationFinished = async (id: string, quantidade: string, horaFinal: string) => {
  const ops = await getOperations();
  const index = ops.findIndex(o => o.id === id);
  if (index === -1) return null;
  
  const op = ops[index];
  
  // Date and IDs
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

    // 1. Call Backend to save to Google Sheets
    const payload = {
      carimbo: formatedCarimbo,
      op: op.opNumber,
      litragem: op.litragem,
      produto: op.produto,
      linha: formattedLinha,
      turno: op.turno,
      quantidade: quantidade,
      horaInicial: op.horaInicial,
      horaFinal: horaFinal
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
    await setDoc(reportRef, {
      ops: arrayUnion(compactString)
    }, { merge: true });

    // Remove from in-progress only if it succeeds
    await removeOperation(id);
    
    // Save to localforage
    await addFinishedOperation({
      ...op,
      quantidade,
      horaFinal,
      reportDocId: docId,
      reportString: compactString,
      carimbo: formatedCarimbo
    });
    
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `reports/${docId}`);
  }
};

export const getReportForDateAndShift = async (dateStr: string, shift: string): Promise<any[]> => {
  const docId = `${dateStr}_${shift}`;
  try {
    const reportRef = doc(db, 'reports', docId);
    const snapshot = await getDoc(reportRef);
    if (snapshot.exists()) {
       const data = snapshot.data();
       return data.ops || [];
    }
  } catch(error) {
    handleFirestoreError(error, OperationType.GET, `reports/${docId}`);
  }
  return [];
};

