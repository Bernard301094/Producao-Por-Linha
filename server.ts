import express from 'express';
import { createServer as createViteServer } from 'vite';
import { google } from 'googleapis';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(cors());

// Google Sheets API Setup
const getAuthClient = () => {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) {
    throw new Error("Missing Google credentials in environment variables");
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return auth;
};

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID || '1z8BWaxGUuUOtHRSM4FnPBr4km9ecHaCksQZw2bymVAw';
const SHEET_RANGE = process.env.GOOGLE_SHEET_NAME || 'A:I';

app.post('/api/append', async (req, res) => {
  try {
    const auth = getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });
    
    const {
      carimbo, op, litragem, produto, linha, turno, quantidade, horaInicial, horaFinal
    } = req.body;

    const values = [[
      carimbo, op, litragem, produto, linha, turno, quantidade, horaInicial, horaFinal
    ]];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: SHEET_RANGE,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });

    res.status(200).json({ success: true, message: 'Row added to Google Sheets' });
  } catch (error: any) {
    console.error("Failed to append to spreadsheet:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/update', async (req, res) => {
  try {
    const auth = getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });
    const { oldCarimbo, oldOp, newData } = req.body;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: SHEET_RANGE,
    });
    
    const rows = response.data.values;
    let rowIndex = -1;
    if (rows) {
      for (let i = 0; i < rows.length; i++) {
        if (rows[i][0] === oldCarimbo && String(rows[i][1]) === String(oldOp)) {
          rowIndex = i;
          break;
        }
      }
    }

    if (rowIndex === -1) {
      return res.status(404).json({ success: false, message: 'Row not found in Sheet' });
    }

    const values = [[
      newData.carimbo, newData.op, newData.litragem, newData.produto, newData.linha, 
      newData.turno, newData.quantidade, newData.horaInicial, newData.horaFinal
    ]];

    const baseSheetName = SHEET_RANGE.split('!')[0] || '';
    const range = `${baseSheetName}!A${rowIndex + 1}:I${rowIndex + 1}`;
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });

    res.status(200).json({ success: true, message: 'Row updated' });
  } catch (error: any) {
    console.error("Failed to update spreadsheet:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/delete', async (req, res) => {
  try {
    const auth = getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });
    const { carimbo, op } = req.body;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: SHEET_RANGE,
    });
    
    const rows = response.data.values;
    let rowIndex = -1;
    if (rows) {
      for (let i = 0; i < rows.length; i++) {
        if (rows[i][0] === carimbo && String(rows[i][1]) === String(op)) {
          rowIndex = i;
          break;
        }
      }
    }

    if (rowIndex === -1) {
      return res.status(404).json({ success: false, message: 'Row not found in Sheet' });
    }

    const sheetInfo = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });
    const sheetId = sheetInfo.data.sheets?.[0]?.properties?.sheetId || 0;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: sheetId,
              dimension: "ROWS",
              startIndex: rowIndex,
              endIndex: rowIndex + 1
            }
          }
        }]
      }
    });

    res.status(200).json({ success: true, message: 'Row deleted' });
  } catch (error: any) {
    console.error("Failed to delete from spreadsheet:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Middleware for Vite / Static files
async function initMiddlewares() {
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

// Start if not Vercel
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  initMiddlewares().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  });
} else {
  // On Vercel, we need to init middlewares too for static serving if it's a monolithic function
  // But usually Vercel routes are handled by vercel.json
  initMiddlewares();
}

export default app;
