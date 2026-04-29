import { google } from 'googleapis';

export const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID || '1z8BWaxGUuUOtHRSM4FnPBr4km9ecHaCksQZw2bymVAw';
export const DEFAULT_SHEET_NAME = 'Respostas ao formulário 4';

export function getFullRange(range: string) {
  const sheetName = process.env.GOOGLE_SHEET_NAME || DEFAULT_SHEET_NAME;
  return `'${sheetName}'!${range}`;
}

export function getAuthClient() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (privateKey) {
    // Corrige escapes de saltos de línea y elimina comillas accidentales
    privateKey = privateKey.replace(/\\n/g, '\n').replace(/^"(.*)"$/, '$1');
  }

  if (!clientEmail || !privateKey) {
    throw new Error('Faltan variables de entorno: GOOGLE_SERVICE_ACCOUNT_EMAIL o GOOGLE_PRIVATE_KEY');
  }

  return new google.auth.GoogleAuth({
    credentials: { client_email: clientEmail, private_key: privateKey },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}
