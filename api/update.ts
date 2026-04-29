import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';
import { getAuthClient, SPREADSHEET_ID, getFullRange } from './_sheets';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const auth = getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });
    const { oldHoraInicial, oldOp, oldProduto, newData } = req.body;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: getFullRange('A:I'),
    });

    const rows = response.data.values || [];
    let rowIndex = -1;
    for (let i = rows.length - 1; i >= 0; i--) {
      const rowOp = String(rows[i][1] || '').trim();
      const reqOp = String(oldOp).trim();
      
      let rowHora = String(rows[i][7] || '').trim();
      let reqHora = String(oldHoraInicial).trim();
      
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
    
    if (rowIndex === -1 && oldProduto) {
      for (let i = rows.length - 1; i >= 0; i--) {
        const rowOp = String(rows[i][1] || '').trim();
        const reqOp = String(oldOp).trim();
        const rowProduto = String(rows[i][3] || '').trim().toLowerCase();
        const reqProduto = String(oldProduto).trim().toLowerCase();

        if (rowOp === reqOp && rowProduto === reqProduto) {
          rowIndex = i;
          break;
        }
      }
    }

    if (rowIndex === -1) {
      for (let i = rows.length - 1; i >= 0; i--) {
        const rowOp = String(rows[i][1] || '').trim();
        const reqOp = String(oldOp).trim();

        if (rowOp === reqOp) {
          rowIndex = i;
          break;
        }
      }
    }

    if (rowIndex === -1) {
      console.log('Update: Row not found in spreadsheet. Appending instead. Requested OP:', oldOp, 'Hora:', oldHoraInicial);
      const opVal = newData.opNumber !== undefined ? newData.opNumber : newData.op;
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: getFullRange('A:I'), // Note: getFullRange doesn't typically need A:I for append, but it works
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[newData.carimbo || new Date().toLocaleString(), opVal, newData.litragem, newData.produto, newData.linha, newData.turno, newData.quantidade, newData.horaInicial, newData.horaFinal]] },
      });
      return res.status(200).json({ success: true, message: 'Row not found in spreadsheet, appended instead' });
    }

    const existingCarimbo = rows[rowIndex][0];
    const opVal = newData.opNumber !== undefined ? newData.opNumber : newData.op;

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: getFullRange(`A${rowIndex + 1}:I${rowIndex + 1}`),
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[newData.carimbo || existingCarimbo, opVal, newData.litragem, newData.produto, newData.linha, newData.turno, newData.quantidade, newData.horaInicial, newData.horaFinal]] },
    });

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('update error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
