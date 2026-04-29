import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';
import { getAuthClient, SPREADSHEET_ID, SHEET_RANGE, DEFAULT_SHEET_NAME } from './_sheets';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const auth = getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });
    const { carimbo, op } = req.body;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: SHEET_RANGE,
    });

    const rows = response.data.values || [];
    let rowIndex = -1;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][0] === carimbo && String(rows[i][1]) === String(op)) {
        rowIndex = i;
        break;
      }
    }

    if (rowIndex === -1) return res.status(404).json({ success: false, message: 'Row not found' });

    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const sheetNameToCheck = (process.env.GOOGLE_SHEET_NAME || DEFAULT_SHEET_NAME).replace(/^'(.+)'$/, '$1');
    const sheet = spreadsheet.data.sheets?.find(s => s.properties?.title === sheetNameToCheck);
    const targetSheetId = sheet?.properties?.sheetId ?? spreadsheet.data.sheets?.[0]?.properties?.sheetId ?? 0;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{ deleteDimension: { range: { sheetId: targetSheetId, dimension: 'ROWS', startIndex: rowIndex, endIndex: rowIndex + 1 } } }]
      },
    });

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('delete error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
