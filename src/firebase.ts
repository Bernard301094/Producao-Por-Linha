import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore, setLogLevel } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: typeof (window as any)?.Capacitor !== 'undefined'
}, firebaseConfig.firestoreDatabaseId);

// Suprimir las advertencias benignas (como BloomFilter) en la consola
setLogLevel('error');

export const auth = getAuth();
