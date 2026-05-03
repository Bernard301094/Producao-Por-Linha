import { google } from 'googleapis';
import { readFileSync, existsSync } from 'fs';

let credentials;
if (existsSync('vercel.json')) {
  try {
    const file = readFileSync('vercel.json', 'utf8');
    credentials = JSON.parse(file).env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS;
  } catch(e) {}
}

if(!credentials && existsSync('.env')) {
  const file = readFileSync('.env', 'utf8');
  const match = file.match(/GOOGLE_SERVICE_ACCOUNT_CREDENTIALS=(.*)/);
  if(match) credentials = match[1];
}

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(credentials),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const SPREADSHEET_ID = '1X589x1Sg2l-e1YXXJp5IqI_1B4lZp31wBtvB278lS5o';
// The ID in api/_sheets.ts was: 1z8BWaxGUuUOtHRSM4FnPBr4km9ecHaCksQZw2bymVAw
const SHEET_ID = '1z8BWaxGUuUOtHRSM4FnPBr4km9ecHaCksQZw2bymVAw';
const SHEET_RANGE = "'Respostas ao formulário 4'!A2:I";

async function query() {
  const sheets = google.sheets({ version: 'v4', auth });
  const response = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: SHEET_RANGE });
  const rows = response.data.values;
  if(!rows) { console.log('no rows'); return;}
  console.log('Total rows:', rows.length);
  const found = rows.filter(r => r[1] && r[1].toString().includes('48313'));
  console.log('Rows containing 48313 in col 1 (OP):', found);
}
query();
