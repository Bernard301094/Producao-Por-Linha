import { format } from 'date-fns';
import { collection, doc, setDoc, getDocs, getDoc, deleteDoc, query, where, onSnapshot, arrayUnion, addDoc } from 'firebase/firestore';
import { db } from './firebase';
import { initialProducts } from './produtos';

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

export const getOperations = async (): Promise<Operation[]> => {
  const snapshot = await getDocs(query(collection(db, 'pendingOperations')));
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Operation));
};

export const addOperation = async (op: Operation) => {
  const { id, ...operationData } = op;
  const docRef = doc(collection(db, 'pendingOperations'));
  await setDoc(docRef, { ...operationData, localId: id });
  op.id = docRef.id;
};

export const removeOperation = async (id: string) => {
  await deleteDoc(doc(db, 'pendingOperations', id));
};

const getCompactString = (op: FinishedOperation) =>
  `${op.opNumber}|${op.linha}|${op.produto}|${op.litragem}|${op.quantidade}|${op.horaInicial}|${op.horaFinal}`;

// IMPLEMENTACIÓN CORREGIDA: Espera a la planilla antes de borrar en Firebase
export const markOperationFinished = async (id: string, cantidad: string, horaFinal: string) => {
  const ops = await getOperations();
  const op = ops.find(o => o.id === id);
  if (!op) return null;

  const today = new Date();
  const dateStr = format(today, 'yyyy-MM-dd');
  const docId = `${dateStr}_${op.turno}`;
  const formatedCarimbo = format(today, 'dd/MM/yyyy HH:mm:ss');

  try {
    const formattedLinha = op.linha ? (isNaN(Number(op.linha)) ? op.linha : `Linha ${op.linha}`) : '';
    const finishedOp: FinishedOperation = {
      ...op, linea: formattedLinha, cantidad, horaFinal,
      reportDocId: docId, carimbo: formatedCarimbo
    } as any;

    const compactString = getCompactString(finishedOp);
    finishedOp.reportString = compactString;

    // 1. Sincronizar con Google Sheets (AWAIT crítico)
    const sheetRes = await fetch('/api/append', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        carimbo: formatedCarimbo, op: op.opNumber, litragem: op.litragem,
        produto: op.produto, linea: formattedLinha, turno: op.turno,
        cantidad, horaInicial: op.horaInicial, horaFinal
      })
    });

    if (!sheetRes.ok) {
      const err = await sheetRes.json().catch(() => ({ error: 'Error en servidor de planilla' }));
      throw new Error(err.error || 'Falla al guardar en Google Sheets');
    }

    // 2. Si la planilla tuvo éxito, actualizar Firebase
    const reportRef = doc(db, 'reports', docId);
    await setDoc(reportRef, { ops: arrayUnion(compactString) }, { merge: true });
    await removeOperation(id);
    await addDoc(collection(db, 'finishedOperations'), { ...finishedOp, localId: id });
    
    return true;
  } catch (error: any) {
    console.error('Error sincronizando operación:', error);
    throw error;
  }
};
