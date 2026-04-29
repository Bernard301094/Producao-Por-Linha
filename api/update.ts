import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';
import { getAuthClient, SPREADSHEET_ID, SHEET_RANGE, getFullRange } from './_sheets';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const auth = getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });
    const { oldCarimbo, oldOp, newData } = req.body;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: SHEET_RANGE,
    });

    const rows = response.data.values || [];
    let rowIndex = -1;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][0] === oldCarimbo && String(rows[i][1]) === String(oldOp)) {
        rowIndex = i;
        break;
      }
    }

    if (rowIndex === -1) return res.status(404).json({ success: false, message: 'Row not found' });

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: getFullRange(`A${rowIndex + 1}:I${rowIndex + 1}`),
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[newData.carimbo, newData.op, newData.litragem, newData.produto, newData.linha, newData.turno, newData.quantidade, newData.horaInicial, newData.horaFinal]] },
    });

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('update error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
