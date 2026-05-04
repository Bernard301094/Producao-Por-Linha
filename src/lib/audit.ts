import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getServerTimeISO } from './time';

export type AuditAction = 'LOGIN' | 'START_OP' | 'FINISH_OP' | 'EDIT_OP' | 'DELETE_OP' | 'REVERT_OP' | 'LOGOUT';

export interface AuditLog {
  userProfile: string;
  action: AuditAction;
  expectedShift: string;
  activeShift: string;
  serverTimestamp: string;
  result: 'ALLOWED' | 'BLOCKED' | 'OVERRIDE' | 'TOLERANCE';
  reason?: string;
  opReference?: string;
  details?: string;
}

export const logAudit = async (log: AuditLog) => {
  try {
    await addDoc(collection(db, 'audit_logs'), {
      ...log,
      timestamp: serverTimestamp(),
      computedServerTime: getServerTimeISO(),
    });
  } catch (e) {
    console.error('Failed to log audit', e);
  }
};
