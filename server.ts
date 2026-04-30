import express from 'express';
// Removed top-level vite import
import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';
import fetch from 'isomorphic-fetch';
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

// Microsoft Graph API Setup
const getGraphClient = () => {
  const tenantId = process.env.MICROSOFT_TENANT_ID;
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error("Missing Microsoft Graph App credentials in environment variables");
  }

  const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
  return Client.init({
    authProvider: (done) => {
      credential.getToken("https://graph.microsoft.com/.default")
        .then(token => done(null, token.token))
        .catch(error => done(error, null));
    },
    fetchOptions: {
      customFetch: fetch // isomorphic-fetch
    }
  });
};

const MS_EXCEL_URL = process.env.MICROSOFT_EXCEL_URL;
const MS_SHEET_NAME = process.env.MICROSOFT_SHEET_NAME || 'Sheet1';

const getShareId = (url: string) => {
  return 'u!' + Buffer.from(url).toString('base64').replace(/\//g, '_').replace(/\+/g, '-').replace(/=/g, '');
};

const resolveExcelFile = async (client: any) => {
  if (process.env.MICROSOFT_DRIVE_ID && process.env.MICROSOFT_EXCEL_ITEM_ID) {
    return { driveId: process.env.MICROSOFT_DRIVE_ID, itemId: process.env.MICROSOFT_EXCEL_ITEM_ID };
  }
  if (!MS_EXCEL_URL) {
    throw new Error('Falta el enlace configurado en MICROSOFT_EXCEL_URL');
  }
  const shareId = getShareId(MS_EXCEL_URL);
  const driveItem = await client.api(`/shares/${shareId}/driveItem`).get();
  return { driveId: driveItem.parentReference.driveId, itemId: driveItem.id };
};

// Endpoint to check if configuration is set correctly and actually test connection
app.get('/api/config-check', async (req, res) => {
  const tenantId = process.env.MICROSOFT_TENANT_ID;
  const clientId = process.env.MICROSOFT_CLIENT_ID;

  let connectionStatus = 'Not Configured';
  let details = '';

  if (tenantId && clientId && MS_EXCEL_URL) {
    try {
      const client = getGraphClient();
      const { driveId, itemId } = await resolveExcelFile(client);
      await client.api(`/drives/${driveId}/items/${itemId}`).get();
      connectionStatus = 'Connected to OneDrive';
    } catch (err: any) {
      connectionStatus = `Error: ${err.message}`;
      details = JSON.stringify(err.body || err);
    }
  }

  res.json({
    env: {
      MICROSOFT_TENANT_ID: tenantId ? 'Set' : 'NOT SET',
      MICROSOFT_CLIENT_ID: clientId ? 'Set' : 'NOT SET',
      MICROSOFT_EXCEL_URL: MS_EXCEL_URL ? 'Set' : 'NOT SET',
    },
    status: connectionStatus,
    details
  });
});

app.post('/api/append', async (req, res) => {
  console.log("POST /api/append received (OneDrive)", req.body);
  try {
    const {
      carimbo, op, litragem, produto, linha, turno, quantidade, horaInicial, horaFinal, qntReprocesso
    } = req.body;

    // Col A: DATA (carimbo)
    // Col B: OP
    // Col C: INICIO DA OP (horaInicial)
    // Col D: FIM DA OP (horaFinal)
    // Col E: LITRAGEM
    // Col F: PRODUTO
    // Col G: LINHA
    // Col H: TURNO
    // Col I: QUANTIDADE APONTADA (Unidades)
    // Col J: QNT REPROCESSO
    const rowValues = [
      carimbo || new Date().toLocaleDateString('pt-BR'), 
      op || '', 
      horaInicial || '', 
      horaFinal || '', 
      litragem || '', 
      produto || '', 
      linha || '', 
      turno || '', 
      quantidade || '', 
      qntReprocesso || ''
    ];

    const client = getGraphClient();
    const { driveId, itemId } = await resolveExcelFile(client);
    
    const sessionResponse = await client.api(`/drives/${driveId}/items/${itemId}/workbook/createSession`).post({ persistChanges: true });
    const workbookSessionId = sessionResponse.id;
    
    try {
      const usedRange = await client.api(`/drives/${driveId}/items/${itemId}/workbook/worksheets('${MS_SHEET_NAME}')/usedRange`)
          .header('workbook-session-id', workbookSessionId)
          .get();
      
      const rowCount = usedRange.rowCount;
      let nextRow = usedRange.rowIndex + rowCount;
      if (rowCount === 1 && usedRange.values[0][0] === '') {
          // If the sheet is completely empty, it might return rowCount 1 with empty values
          nextRow = 0;
      }
      const appendRangeStr = `A${nextRow + 1}:J${nextRow + 1}`;
      
      const updateRes = await client.api(`/drives/${driveId}/items/${itemId}/workbook/worksheets('${MS_SHEET_NAME}')/range(address='${appendRangeStr}')`)
        .header('workbook-session-id', workbookSessionId)
        .patch({
          values: [rowValues]
        });
        
      await client.api(`/drives/${driveId}/items/${itemId}/workbook/closeSession`)
          .header('workbook-session-id', workbookSessionId).post({});
      
      console.log("OneDrive Append success");
      return res.status(200).json({ success: true, message: 'Row added via OneDrive', data: updateRes });
    } catch (e) {
       if (workbookSessionId) {
           await client.api(`/drives/${driveId}/items/${itemId}/workbook/closeSession`)
               .header('workbook-session-id', workbookSessionId).post({});
       }
       throw e;
    }
  } catch (error: any) {
    console.error("Failed to append to OneDrive:", error?.message || error);
    res.status(500).json({ 
      success: false, 
      error: error?.message || String(error),
      details: error?.body || null
    });
  }
});

app.post('/api/update', async (req, res) => {
  // Microsoft Graph update logic is more complex (search row, then update)
  // For now, if users want OneDrive, we append. Implementing actual row update on large sheets can be slow.
  // We'll return 501 for update if not implemented or try a simplified version
  res.status(501).json({ error: "Update logic for Excel via Graph not fully implemented yet." });
});

app.post('/api/delete', async (req, res) => {
  res.status(501).json({ error: "Delete logic for Excel via Graph not fully implemented yet." });
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
  const distPath = path.join(__dirname, 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) return;
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
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

if (!process.env.VERCEL && process.env.NODE_ENV !== 'production') {
  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
