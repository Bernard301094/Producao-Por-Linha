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
    const dataToSave: any = {
      ...log,
      timestamp: serverTimestamp(),
      computedServerTime: getServerTimeISO(),
    };
    
    Object.keys(dataToSave).forEach(key => {
      if (dataToSave[key] === undefined) {
        delete dataToSave[key];
      }
    });

    await addDoc(collection(db, 'audit_logs'), dataToSave);
  } catch (e) {
    console.error('Failed to log audit', e);
  }
};
