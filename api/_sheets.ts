import { google } from 'googleapis';

// Se priorizan variables de entorno para mayor flexibilidad
export const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID || '1z8BWaxGUuUOtHRSM4FnPBr4km9ecHaCksQZw2bymVAw';
export const DEFAULT_SHEET_NAME = 'Respostas ao formulário 4';

export function getFullRange(range: string) {
  if (range.includes('!')) return range;
  const sheetName = process.env.GOOGLE_SHEET_NAME || DEFAULT_SHEET_NAME;
  const quotedName = (sheetName.includes(' ') && !sheetName.startsWith("'"))
    ? `'${sheetName}'`
    : sheetName;
  return `${quotedName}!${range}`;
}

export const SHEET_RANGE = getFullRange('A:I');

export function getAuthClient() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (privateKey) {
    // 1. Limpiar escapes de saltos de línea (común en Vercel/Windows)
    privateKey = privateKey.replace(/\\n/g, '\n');
    
    // 2. Quitar comillas accidentales al inicio y final
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      privateKey = privateKey.substring(1, privateKey.length - 1);
    }
  }

  if (!clientEmail || !privateKey) {
    throw new Error('Faltan credenciales: GOOGLE_SERVICE_ACCOUNT_EMAIL o GOOGLE_PRIVATE_KEY');
  }

  return new google.auth.GoogleAuth({
    credentials: { 
      client_email: clientEmail, 
      private_key: privateKey 
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}
