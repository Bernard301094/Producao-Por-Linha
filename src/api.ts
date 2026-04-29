import { db } from './firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  runTransaction,
} from 'firebase/firestore';
import { format } from 'date-fns';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Operation {
  id: string;
  opNumber: string;
  produto: string;
  linha: string;
  litragem: string;
  turno: string;
  horaInicial: string;
  carimboInicial: string;
  localId?: string;
}

export interface FinishedOperation {
  id: string;
  opNumber: string;
  linha: string;
  produto: string;
  litragem: string;
  quantidade: string;
  horaInicial: string;
  horaFinal: string;
  turno: string;
  carimboInicial: string;
  reportString: string;
}

// ─── Sheets API helpers ────────────────────────────────────────────────────

// Base URL: on Vercel the API routes are served from the same origin.
// In development the Express server runs on port 3000.
const API_BASE =
  typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : '';

async function sheetsAppend(op: Operation, quantidade: string, horaFinal: string): Promise<void> {
  const carimbo = new Date().toLocaleString('pt-BR');
  await fetch(`${API_BASE}/api/append`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      carimbo,
      op: op.opNumber,
      litragem: op.litragem,
      produto: op.produto,
      linha: op.linha,
      turno: op.turno,
      quantidade,
      horaInicial: op.horaInicial,
      horaFinal,
    }),
  });
}

async function sheetsUpdate(
  oldCarimbo: string,
  oldOp: string,
  newData: {
    carimbo: string;
    op: string;
    litragem: string;
    produto: string;
    linha: string;
    turno: string;
    quantidade: string;
    horaInicial: string;
    horaFinal: string;
  }
): Promise<void> {
  await fetch(`${API_BASE}/api/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oldCarimbo, oldOp, newData }),
  });
}

async function sheetsDelete(carimbo: string, op: string): Promise<void> {
  await fetch(`${API_BASE}/api/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ carimbo, op }),
  });
}

// ─── Internal helpers ────────────────────────────────────────────────────

function opToReportString(op: FinishedOperation): string {
  return [
    op.opNumber,
    op.linha,
    op.produto,
    op.litragem,
    op.quantidade,
    op.horaInicial,
    op.horaFinal,
  ].join('|');
}

function getReportDocId(turno: string): string {
  const dateStr = format(new Date(), 'yyyy-MM-dd');
  return `${dateStr}_${turno}`;
}

// ─── Pending Operations ───────────────────────────────────────────────────────

export const getOperations = async (): Promise<Operation[]> => {
  const snapshot = await getDocs(collection(db, 'pendingOperations'));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Operation));
};

export const addOperation = async (op: Operation): Promise<void> => {
  await setDoc(doc(db, 'pendingOperations', op.id), { ...op, localId: op.id });
};

export const removeOperation = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'pendingOperations', id));
};

export const updateOperation = async (
  id: string,
  data: Partial<Omit<Operation, 'id'>>
): Promise<void> => {
  await updateDoc(doc(db, 'pendingOperations', id), data as Record<string, unknown>);
};

// ─── Finished Operations (Firestore + Google Sheets) ────────────────────────

export const markOperationFinished = async (
  id: string,
  quantidade: string,
  horaFinal: string
): Promise<void> => {
  const pendingRef = doc(db, 'pendingOperations', id);
  const pendingSnap = await getDoc(pendingRef);
  if (!pendingSnap.exists()) throw new Error('Operação não encontrada.');

  const op = { id, ...pendingSnap.data() } as Operation;
  const turno = op.turno;
  const reportDocId = getReportDocId(turno);
  const reportRef = doc(db, 'reports', reportDocId);

  const finished: FinishedOperation = {
    ...op,
    quantidade,
    horaFinal,
    reportString: '',
  };
  const reportStr = opToReportString(finished);

  // 1. Firestore: move from pendingOperations to reports
  await runTransaction(db, async (tx) => {
    const reportSnap = await tx.get(reportRef);
    if (reportSnap.exists()) {
      tx.update(reportRef, { ops: arrayUnion(reportStr) });
    } else {
      tx.set(reportRef, { ops: [reportStr], turno, date: format(new Date(), 'yyyy-MM-dd') });
    }
    tx.delete(pendingRef);
  });

  // 2. Google Sheets: append row (non-blocking — don't throw if sheets fails)
  try {
    await sheetsAppend(op, quantidade, horaFinal);
  } catch (err) {
    console.warn('Sheets append failed (non-critical):', err);
  }
};

export const removeFinishedOperation = async (
  id: string,
  turno: string
): Promise<void> => {
  const reportDocId = getReportDocId(turno);
  const reportRef = doc(db, 'reports', reportDocId);
  const snap = await getDoc(reportRef);
  if (!snap.exists()) return;

  const ops: string[] = snap.data().ops || [];
  const target = ops.find((s) => s === id || s.startsWith(id + '|'));
  if (!target) return;

  // 1. Firestore
  await updateDoc(reportRef, { ops: arrayRemove(target) });

  // 2. Google Sheets: delete row identified by opNumber (parts[0])
  // carimbo is not stored in the report string, so we identify by opNumber only.
  // The server finds the row by matching op column.
  try {
    const parts = target.split('|');
    // Pass empty carimbo — server falls back to matching by op number alone
    await sheetsDelete('', parts[0] ?? '');
  } catch (err) {
    console.warn('Sheets delete failed (non-critical):', err);
  }
};

export const updateFinishedOperation = async (
  id: string,
  data: Partial<Omit<FinishedOperation, 'id' | 'reportString'>>,
  turno: string
): Promise<void> => {
  const reportDocId = getReportDocId(turno);
  const reportRef = doc(db, 'reports', reportDocId);
  const snap = await getDoc(reportRef);
  if (!snap.exists()) throw new Error('Relatório não encontrado.');

  const ops: string[] = snap.data().ops || [];
  const oldIndex = ops.findIndex((s) => s === id || s.startsWith(id + '|'));
  if (oldIndex === -1) throw new Error('Registro não encontrado no relatório.');

  const oldParts = ops[oldIndex].split('|');
  const merged: FinishedOperation = {
    id,
    opNumber: data.opNumber ?? oldParts[0] ?? '',
    linha: data.linha ?? oldParts[1] ?? '',
    produto: data.produto ?? oldParts[2] ?? '',
    litragem: data.litragem ?? oldParts[3] ?? '',
    quantidade: data.quantidade ?? oldParts[4] ?? '',
    horaInicial: data.horaInicial ?? oldParts[5] ?? '',
    horaFinal: data.horaFinal ?? oldParts[6] ?? '',
    turno: data.turno ?? turno,
    carimboInicial: '',
    reportString: '',
  };
  const newStr = opToReportString(merged);

  // 1. Firestore
  const updatedOps = [...ops];
  updatedOps[oldIndex] = newStr;
  await updateDoc(reportRef, { ops: updatedOps });

  // 2. Google Sheets: update row
  try {
    const oldOpNumber = oldParts[0] ?? '';
    await sheetsUpdate('', oldOpNumber, {
      carimbo: new Date().toLocaleString('pt-BR'),
      op: merged.opNumber,
      litragem: merged.litragem,
      produto: merged.produto,
      linha: merged.linha,
      turno: merged.turno,
      quantidade: merged.quantidade,
      horaInicial: merged.horaInicial,
      horaFinal: merged.horaFinal,
    });
  } catch (err) {
    console.warn('Sheets update failed (non-critical):', err);
  }
};

export const moveFinishedToPending = async (
  id: string,
  turno: string
): Promise<void> => {
  const reportDocId = getReportDocId(turno);
  const reportRef = doc(db, 'reports', reportDocId);
  const snap = await getDoc(reportRef);
  if (!snap.exists()) throw new Error('Relatório não encontrado.');

  const ops: string[] = snap.data().ops || [];
  const target = ops.find((s) => s === id || s.startsWith(id + '|'));
  if (!target) throw new Error('Registro não encontrado no relatório.');

  const parts = target.split('|');
  const newId = crypto.randomUUID();
  const op: Operation = {
    id: newId,
    localId: newId,
    opNumber: parts[0] ?? '',
    linha: parts[1] ?? '',
    produto: parts[2] ?? '',
    litragem: parts[3] ?? '',
    horaInicial: parts[5] ?? '',
    turno,
    carimboInicial: new Date().toISOString(),
  };

  // 1. Firestore: remove from report, add to pending
  await runTransaction(db, async (tx) => {
    tx.update(reportRef, { ops: arrayRemove(target) });
    tx.set(doc(db, 'pendingOperations', op.id), op);
  });

  // 2. Google Sheets: delete the row for this op
  try {
    await sheetsDelete('', parts[0] ?? '');
  } catch (err) {
    console.warn('Sheets delete on revert failed (non-critical):', err);
  }
};

export const getReportForDateAndShift = async (
  date: string,
  turno: string
): Promise<FinishedOperation[]> => {
  const reportDocId = `${date}_${turno}`;
  const snap = await getDoc(doc(db, 'reports', reportDocId));
  if (!snap.exists()) return [];

  const strings: string[] = snap.data().ops || [];
  return strings.map((s) => {
    const [opNumber, linha, produto, litragem, quantidade, horaInicial, horaFinal] = s.split('|');
    return {
      id: s,
      opNumber: opNumber ?? '',
      linha: linha ?? '',
      produto: produto ?? '',
      litragem: litragem ?? '',
      quantidade: quantidade ?? '',
      horaInicial: horaInicial ?? '',
      horaFinal: horaFinal ?? '',
      turno,
      carimboInicial: '',
      reportString: s,
    };
  });
};

// ─── Products ─────────────────────────────────────────────────────────────────

export const getProducts = async (): Promise<{ produto: string; litragem: string }[]> => {
  const snap = await getDoc(doc(db, 'config', 'products'));
  if (!snap.exists()) return [];
  const list: { produto: string; litragem: string }[] = snap.data().list || [];
  return list;
};

export const addProduct = async (produto: string, litragem: string): Promise<void> => {
  const ref = doc(db, 'config', 'products');
  const snap = await getDoc(ref);
  const list: { produto: string; litragem: string }[] = snap.exists() ? snap.data().list || [] : [];
  const already = list.some(
    (p) => p.produto.trim().toUpperCase() === produto.trim().toUpperCase()
  );
  if (already) return;
  if (snap.exists()) {
    await updateDoc(ref, { list: arrayUnion({ produto, litragem }) });
  } else {
    await setDoc(ref, { list: [{ produto, litragem }] });
  }
};

// ─── Auth Profile ─────────────────────────────────────────────────────────────

export const getAuthProfile = async (
  profile?: string
): Promise<{ email?: string; displayName?: string; uid?: string; password?: string } | null> => {
  if (profile) {
    try {
      const snap = await getDoc(doc(db, 'config', 'profiles'));
      if (snap.exists()) {
        const data = snap.data();
        if (data[profile]) return data[profile];
      }
    } catch {
      // fallback below
    }
  }
  const { getAuth } = await import('firebase/auth');
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return null;
  return {
    email: user.email ?? undefined,
    displayName: user.displayName ?? undefined,
    uid: user.uid,
  };
};

export const updateAuthProfile = async (data: {
  displayName?: string;
  password?: string;
}): Promise<void> => {
  const { getAuth, updateProfile, updatePassword } = await import('firebase/auth');
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado');
  if (data.displayName !== undefined) {
    await updateProfile(user, { displayName: data.displayName });
  }
  if (data.password) {
    await updatePassword(user, data.password);
  }
};
