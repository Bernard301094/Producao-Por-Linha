import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';
import { getAuthClient, SPREADSHEET_ID, DEFAULT_SHEET_NAME, getFullRange } from './_sheets';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const auth = getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });
    const { op, horaInicial, produto } = req.body;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: getFullRange('A:I'),
    });

    const rows = response.data.values || [];
    let rowIndex = -1;
    for (let i = rows.length - 1; i >= 0; i--) {
        const rowOp = String(rows[i][1] || '').trim();
        const reqOp = String(op).trim();
        
        let rowHora = String(rows[i][7] || '').trim();
        let reqHora = String(horaInicial).trim();
        
        const normalize = (t: string) => {
          const match = t.match(/(\d{1,2}):(\d{2})/);
          if (match) return `${match[1].padStart(2, '0')}:${match[2]}`;
          return t;
        };

        if (rowOp === reqOp && normalize(rowHora) === normalize(reqHora)) {
          rowIndex = i;
          break;
        }
    }
    
    if (rowIndex === -1 && produto) {
      for (let i = rows.length - 1; i >= 0; i--) {
        const rowOp = String(rows[i][1] || '').trim();
        const reqOp = String(op).trim();
        const rowProduto = String(rows[i][3] || '').trim().toLowerCase();
        const reqProduto = String(produto).trim().toLowerCase();

        if (rowOp === reqOp && rowProduto === reqProduto) {
          rowIndex = i;
          break;
        }
      }
    }

    if (rowIndex === -1) {
      for (let i = rows.length - 1; i >= 0; i--) {
        const rowOp = String(rows[i][1] || '').trim();
        const reqOp = String(op).trim();

        if (rowOp === reqOp) {
          rowIndex = i;
          break;
        }
      }
    }

    if (rowIndex === -1) {
      console.log('Delete: Row not found in spreadsheet. Assuming already deleted. OP:', op, 'Hora:', horaInicial);
      return res.status(200).json({ success: true, message: 'Row not found in spreadsheet, assuming already deleted' });
    }

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
