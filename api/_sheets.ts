import { google } from 'googleapis';

export const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID || '1z8BWaxGUuUOtHRSM4FnPBr4km9ecHaCksQZw2bymVAw';
export const DEFAULT_SHEET_NAME = 'Respostas ao formul\u00e1rio 4';

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
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) {
    throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY');
  }

  return new google.auth.GoogleAuth({
    credentials: { client_email: clientEmail, private_key: privateKey },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}
