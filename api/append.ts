import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';
import { getAuthClient, SPREADSHEET_ID, getFullRange } from './_sheets';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });

    const {
      carimbo,
      op,
      litragem,
      produto,
      linha,
      turno,
      cantidad,
      horaInicial,
      horaFinal,
    } = req.body;

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: getFullRange('A:I'),
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[carimbo, op, litragem, produto, linha, turno, cantidad, horaInicial, horaFinal]],
      },
    });

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('append error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
