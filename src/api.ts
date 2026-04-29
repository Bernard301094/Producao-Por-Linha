import { format } from 'date-fns';
import { initialProducts } from './produtos';
import { 
  collection, doc, setDoc, getDocs, getDoc, deleteDoc, 
  query, where, onSnapshot, arrayUnion, arrayRemove, addDoc 
} from 'firebase/firestore';
import { db } from './firebase';

// ── Interfaces ───────────────────────────────────────────────────────────────

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

export interface AuthProfile {
  password?: string;
  lastPasswordChange?: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

// ── Error Handling ───────────────────────────────────────────────────────────

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const getCompactString = (op: FinishedOperation | any) =>
  `${op.opNumber}|${op.linha}|${op.produto}|${op.litragem}|${op.quantidade}|${op.horaInicial}|${op.horaFinal}`;

const isReportString = (id: string) => id.includes('|');

const parseCompactId = (s: string, turno: string): FinishedOperation => {
  const [opNumber, linha, producto, litragem, cantidad, horaInicial, horaFinal] = s.split('|');
  return {
    id: s, opNumber, linha, producto, litragem, cantidad,
    horaInicial, horaFinal, turno, carimboInicial: '', reportString: s,
  } as any;
};

const todayReportDocId = (turno: string) => {
  const t = new Date();
  const d = [t.getFullYear(), String(t.getMonth()+1).padStart(2,'0'), String(t.getDate()).padStart(2,'0')].join('-');
  return `${d}_${turno}`;
};

const resolveFinishedOpDoc = async (id: string): Promise<{ docId: string; op: FinishedOperation } | null> => {
  const directRef = doc(db, 'finishedOperations', id);
  const directSnap = await getDoc(directRef);
  if (directSnap.exists()) {
    return { docId: id, op: { id, ...directSnap.data() } as FinishedOperation };
  }
  return null;
};

// ── Mark Finished (CORREGIDO) ──────────────────────────────────────────────────

export const markOperationFinished = async (id: string, cantidad: string, horaFinal: string) => {
  const ops = await getOperations();
  const op = ops.find(o => o.id === id);
  if (!op) return null;

  const today = new Date();
  const dateStr = [today.getFullYear(), String(today.getMonth()+1).padStart(2,'0'), String(today.getDate()).padStart(2,'0')].join('-');
  const docId = `${dateStr}_${op.turno}`;
  const formatedCarimbo = format(new Date(), 'dd/MM/yyyy HH:mm:ss');

  try {
    const formattedLinha = op.linha ? (isNaN(Number(op.linha)) ? op.linha : `Linha ${op.linha}`) : '';

    const finishedOp: FinishedOperation = {
      ...op, 
      linha: formattedLinha, 
      quantidade: cantidad, 
      horaFinal,
      reportDocId: docId, 
      carimbo: formatedCarimbo
    };
    const compactString = getCompactString(finishedOp);
    finishedOp.reportString = compactString;

    // 1. PRIMERO: Intentar guardar en Google Sheets y esperar respuesta (AWAIT)
    const sheetRes = await fetch('/api/append', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        carimbo: formatedCarimbo, 
        op: op.opNumber, 
        litragem: op.litragem,
        produto: op.produto, 
        linha: formattedLinha, 
        turno: op.turno,
        quantidade: cantidad, 
        horaInicial: op.horaInicial, 
        horaFinal
      })
    });

    if (!sheetRes.ok) {
      const errorData = await sheetRes.json().catch(() => ({ error: 'Error desconocido en servidor' }));
      throw new Error(errorData.error || 'Error al conectar con la planilla');
    }

    // 2. SEGUNDO: Solo si Sheets funcionó, actualizamos Firebase
    const reportRef = doc(db, 'reports', docId);
    await setDoc(reportRef, { ops: arrayUnion(compactString) }, { merge: true });
    await removeOperation(id);
    await addFinishedOperation(finishedOp);
    
    return true;
  } catch (error: any) {
    // Este error se mostrará en la interfaz
    console.error('Error en markOperationFinished:', error);
    throw error;
  }
};

// ── Resto de Operaciones (Sincronizadas con Sheets) ──────────────────────────

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

export const removeOperation = async (id: string) => {
  try {
    await deleteDoc(doc(db, 'pendingOperations', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `pendingOperations/${id}`);
  }
};

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

export const updateOperation = async (id: string, updates: Partial<Operation>) => {
  try {
    await setDoc(doc(db, 'pendingOperations', id), updates, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'pendingOperations');
  }
};

export const getProducts = async () => {
  let dbProducts: {produto: string, litragem: string}[] = [];
  try {
    const snapshot = await getDocs(collection(db, 'products'));
    snapshot.forEach(doc => {
      const data = doc.data();
      dbProducts.push({ producto: data.produto, litragem: data.litragem });
    });
  } catch (err) {
    console.error('Error fetching products from db', err);
  }
  const allProducts = [...initialProducts, ...dbProducts];
  return Array.from(new Map(allProducts.map(item => [item.produto, item])).values());
};

export const addProduct = async (produto: string, litragem: string) => {
  if (initialProducts.find(p => p.produto === produto)) return;
  try {
    const q = query(collection(db, 'products'), where('produto', '==', producto));
    const snapshot = await getDocs(q);
    if (snapshot.empty) await setDoc(doc(collection(db, 'products')), { producto, litragem });
  } catch(error) {
    handleFirestoreError(error, OperationType.CREATE, 'products');
  }
};

export const getAuthProfile = async (profileId: string): Promise<AuthProfile | null> => {
  try {
    const docRef = doc(db, 'authProfiles', profileId);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) return snapshot.data() as AuthProfile;
  } catch(error) {
    handleFirestoreError(error, OperationType.GET, `authProfiles/${profileId}`);
  }
  return null;
};

export const getReportForDateAndShift = async (dateStr: string, shift: string): Promise<any[]> => {
  const docId = `${dateStr}_${shift}`;
  try {
    const snapshot = await getDoc(doc(db, 'reports', docId));
    if (snapshot.exists()) return snapshot.data().ops || [];
  } catch(error) {
    handleFirestoreError(error, OperationType.GET, `reports/${docId}`);
  }
  return [];
};
