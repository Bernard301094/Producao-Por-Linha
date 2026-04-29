import express from 'express';
// Removed top-level vite import
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
    throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY in environment variables");
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
const DEFAULT_SHEET_NAME = 'Respostas ao formulário 4';

const getFullRange = (range: string) => {
  if (range.includes('!')) return range;
  const sheetName = process.env.GOOGLE_SHEET_NAME || DEFAULT_SHEET_NAME;
  // If sheet name has spaces and isn't quoted, quote it
  const quotedName = (sheetName.includes(' ') && !sheetName.startsWith("'")) 
    ? `'${sheetName}'` 
    : sheetName;
  return `${quotedName}!${range}`;
};

const SHEET_RANGE = getFullRange('A:I');

// Endpoint to check if configuration is set correctly (WITHOUT leaking the private key)
app.get('/api/config-check', (req, res) => {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const keyExists = !!process.env.GOOGLE_PRIVATE_KEY;
  const sheetId = process.env.GOOGLE_SPREADSHEET_ID;
  const sheetName = process.env.GOOGLE_SHEET_NAME;

  res.json({
    env: {
      GOOGLE_SERVICE_ACCOUNT_EMAIL: email ? 'Set (Check permissions on Sheet)' : 'NOT SET',
      GOOGLE_PRIVATE_KEY: keyExists ? 'Set' : 'NOT SET',
      GOOGLE_SPREADSHEET_ID: sheetId || 'Using default',
      GOOGLE_SHEET_NAME: sheetName || 'Using default (A:I)'
    },
    status: (email && keyExists) ? 'Configured' : 'Incomplete'
  });
});

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

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: SHEET_RANGE,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });

    res.status(200).json({ success: true, message: 'Row added', data: response.data });
  } catch (error: any) {
    console.error("Failed to append to spreadsheet:", error);
    res.status(500).json({ success: false, error: error.message, details: error.response?.data });
  }
});

app.post('/api/update', async (req, res) => {
  try {
    const auth = getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });
    const { oldHoraInicial, oldOp, oldProduto, newData } = req.body;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: SHEET_RANGE,
    });
    
    const rows = response.data.values;
    let rowIndex = -1;
    if (rows) {
      for (let i = rows.length - 1; i >= 0; i--) {
        const rowOp = String(rows[i][1] || '').trim();
        const reqOp = String(oldOp).trim();
        
        let rowHora = String(rows[i][7] || '').trim();
        let reqHora = String(oldHoraInicial).trim();
        
        // Normalize time formats (e.g. 08:00:00 or 8:00 AM -> 08:00)
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
    }

    if (rowIndex === -1) {
      console.log('Update: Row not found in spreadsheet. Appending instead. Requested OP:', oldOp, 'Hora:', oldHoraInicial);
      const opVal = newData.opNumber !== undefined ? newData.opNumber : newData.op;
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: SHEET_RANGE,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[newData.carimbo || new Date().toLocaleString(), opVal, newData.litragem, newData.produto, newData.linha, newData.turno, newData.quantidade, newData.horaInicial, newData.horaFinal]] },
      });
      return res.status(200).json({ success: true, message: 'Row not found in spreadsheet, appended instead' });
    }

    const existingCarimbo = rows[rowIndex][0];

    // Map `newData.opNumber` to `op` if it's sent like that from the frontend
    const opVal = newData.opNumber !== undefined ? newData.opNumber : newData.op;

    const values = [[
      newData.carimbo || existingCarimbo, opVal, newData.litragem, newData.produto, newData.linha, 
      newData.turno, newData.quantidade, newData.horaInicial, newData.horaFinal
    ]];

    const range = getFullRange(`A${rowIndex + 1}:I${rowIndex + 1}`);
    
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
    const { horaInicial, op, produto } = req.body;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: SHEET_RANGE,
    });
    
    const rows = response.data.values;
    let rowIndex = -1;
    if (rows) {
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
    }

    if (rowIndex === -1) {
      console.log('Delete: Row not found in spreadsheet. Assuming already deleted. OP:', op, 'Hora:', horaInicial);
      return res.status(200).json({ success: true, message: 'Row not found in spreadsheet, assuming already deleted' });
    }

    const rangeToClear = getFullRange(`A${rowIndex + 1}:I${rowIndex + 1}`);

    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: rangeToClear,
    });

    res.status(200).json({ success: true, message: 'Row deleted' });
  } catch (error: any) {
    console.error("Failed to delete from spreadsheet:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
  const distPath = path.join(__dirname, 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) return; // Don't serve HTML for API errors
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  // Local development with Vite using dynamic import
  const initVite = async () => {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  };
  initVite();
}

// Start listener only if not serverless
if (!process.env.VERCEL && process.env.NODE_ENV !== 'production') {
  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
