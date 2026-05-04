import 'isomorphic-fetch';
import express from 'express';
// Removed top-level vite import
import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';
import path from 'path';

import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// Logging middleware for API hits
app.use('/api', (req, res, next) => {
  console.log(`[API Request] ${req.method} ${req.url}`);
  next();
});

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

const formatLitragemText = (val: string): string => {
  if (!val) return '';
  const trimmed = val.trim();
  if (/^(\d+(?:[.,]\d+)?)$/.test(trimmed)) {
    const num = parseFloat(trimmed.replace(',', '.'));
    return num === 1 ? `${trimmed} Litro` : `${trimmed} Litros`;
  }
  const match = trimmed.match(/^(\d+(?:[.,]\d+)?)\s*L$/i);
  if (match) {
    const num = parseFloat(match[1].replace(',', '.'));
    return num === 1 ? `${match[1]} Litro` : `${match[1]} Litros`;
  }
  return trimmed;
};

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
      formatLitragemText(litragem || ''), 
      produto || '', 
      linha || '', 
      turno || '', 
      quantidade || '', 
      qntReprocesso || ''
    ];

    const client = getGraphClient();
    const { driveId, itemId } = await resolveExcelFile(client);
    
    try {
      const msSheetName = MS_SHEET_NAME;
      const tablesRes = await client.api(`/drives/${driveId}/items/${itemId}/workbook/worksheets('${msSheetName}')/tables`).get();
      
      let updateRes;
      if (tablesRes.value && tablesRes.value.length > 0) {
        const tableName = tablesRes.value[0].name;
        updateRes = await client.api(`/drives/${driveId}/items/${itemId}/workbook/tables('${tableName}')/rows`)
          .post({ values: [rowValues] });
      } else {
        const usedRange = await client.api(`/drives/${driveId}/items/${itemId}/workbook/worksheets('${msSheetName}')/usedRange`).get();
        const rowCount = usedRange.rowCount;
        let nextRow = usedRange.rowIndex + rowCount;
        if (rowCount === 1 && usedRange.values[0][0] === '') nextRow = 0;
        const appendRangeStr = `A${nextRow + 1}:J${nextRow + 1}`;
        updateRes = await client.api(`/drives/${driveId}/items/${itemId}/workbook/worksheets('${msSheetName}')/range(address='${appendRangeStr}')`)
          .patch({ values: [rowValues] });
      }
      
      console.log("OneDrive Append success");
      return res.status(200).json({ success: true, message: 'Row added via OneDrive', data: updateRes });
    } catch (e) {
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

app.post('/api/append-paradas', async (req, res) => {
  console.log("POST /api/append-paradas received", req.body);
  try {
    const {
      carimbo, op, litragem, produto, linha, turno, paradas
    } = req.body;

    if (!paradas || !Array.isArray(paradas) || paradas.length === 0) {
      return res.status(200).json({ success: true, message: 'No paradas to append' });
    }

    const client = getGraphClient();
    const { driveId, itemId } = await resolveExcelFile(client);
    
    // According to screenshot, the worksheet name is "PARADAS"
    const msSheetName = 'PARADAS';
    
    try {
      const usedRange = await client.api(`/drives/${driveId}/items/${itemId}/workbook/worksheets('${msSheetName}')/usedRange`).get();
      const rowCount = usedRange.rowCount;
      let nextRow = usedRange.rowIndex + rowCount;
      if (rowCount === 1 && usedRange.values[0][0] === '') nextRow = 0;
      
      const newValues = paradas.map(p => [
        carimbo || new Date().toLocaleDateString('pt-BR'),
        op || '',
        formatLitragemText(litragem || ''),
        produto || '',
        linha || '',
        turno || '',
        p.seq || '',
        p.tipologia || '',
        p.horaInicio || '',
        p.horaFim || ''
      ]);

      const startRow = nextRow + 1;
      const endRow = nextRow + newValues.length;
      const appendRangeStr = `A${startRow}:J${endRow}`;
      
      const updateRes = await client.api(`/drives/${driveId}/items/${itemId}/workbook/worksheets('${msSheetName}')/range(address='${appendRangeStr}')`)
        .patch({ values: newValues });
      
      console.log("OneDrive Append Paradas success");
      return res.status(200).json({ success: true, message: 'Paradas added via OneDrive', data: updateRes });
    } catch (e) {
       throw e;
    }
  } catch (error: any) {
    console.error("Failed to append paradas to OneDrive:", error?.message || error);
    res.status(500).json({ 
      success: false, 
      error: error?.message || String(error),
      details: error?.body || null
    });
  }
});

app.post('/api/update', async (req, res) => {
  try {
    const { originalData, updates } = req.body;
    const client = getGraphClient();
    const { driveId, itemId } = await resolveExcelFile(client);
    const msSheetName = MS_SHEET_NAME;

    const usedRange = await client.api(`/drives/${driveId}/items/${itemId}/workbook/worksheets('${msSheetName}')/usedRange`).get();
    
    let rowIndexFound = -1;
    let excelRowFound = -1;

    // Search from bottom up to find the most recent matching operation
    for (let i = usedRange.values.length - 1; i >= 0; i--) {
      const row = usedRange.values[i];
      const rowLinha = String(row[6] || '').trim().replace('Linha ', '');
      const searchLinha = String(originalData.linha || '').trim().replace('Linha ', '');
      if (
        String(row[1] || '').trim() === String(originalData.op || '').trim() && 
        rowLinha === searchLinha
      ) {
        rowIndexFound = i;
        excelRowFound = usedRange.rowIndex + i + 1;
        break;
      }
    }

    if (excelRowFound !== -1 && rowIndexFound !== -1) {
      const existingRow = usedRange.values[rowIndexFound];
      const updatedRow = [
        existingRow[0], // DATA
        updates.opNumber !== undefined ? updates.opNumber : existingRow[1],
        updates.horaInicial !== undefined ? updates.horaInicial : existingRow[2],
        updates.horaFinal !== undefined ? updates.horaFinal : existingRow[3],
        updates.litragem !== undefined ? formatLitragemText(updates.litragem) : existingRow[4],
        updates.produto !== undefined ? updates.produto : existingRow[5],
        updates.linha !== undefined ? updates.linha : existingRow[6],
        updates.turno !== undefined ? updates.turno : existingRow[7],
        updates.quantidade !== undefined ? updates.quantidade : existingRow[8],
        updates.qntReprocesso !== undefined ? updates.qntReprocesso : existingRow[9]
      ];

      const appendRangeStr = `A${excelRowFound}:J${excelRowFound}`;
      const updateRes = await client.api(`/drives/${driveId}/items/${itemId}/workbook/worksheets('${msSheetName}')/range(address='${appendRangeStr}')`)
        .patch({ values: [updatedRow] });
      
      // Update Paradas if provided
      if (updates.paradas !== undefined) {
        try {
          const paradasSheetName = 'PARADAS';
          
          // Add a small delay so the Excel workbook lock from the previous PATCH is released
          await new Promise(resolve => setTimeout(resolve, 800));

          const paradasRange = await client.api(`/drives/${driveId}/items/${itemId}/workbook/worksheets('${paradasSheetName}')/usedRange`).get();
          
          // Delete old paradas
          const rowsToDelete = [];
          for (let i = paradasRange.values.length - 1; i >= 0; i--) {
            const row = paradasRange.values[i];
            const rowLinha = String(row[4] || '').trim().replace('Linha ', '');
            const searchLinha = String(originalData.linha || '').trim().replace('Linha ', '');
            if (
              String(row[1] || '').trim() === String(originalData.op || '').trim() &&
              rowLinha === searchLinha
            ) {
              rowsToDelete.push(paradasRange.rowIndex + i + 1);
            }
          }
          for (const rowIdx of rowsToDelete) {
            const rowToDelete = `${rowIdx}:${rowIdx}`;
            await client.api(`/drives/${driveId}/items/${itemId}/workbook/worksheets('${paradasSheetName}')/range(address='${rowToDelete}')/delete`)
              .post({ shift: 'Up' });
            
            // Add a small delay between row deletions to prevent throttling/locks
            await new Promise(resolve => setTimeout(resolve, 300));
          }

          // Append new paradas
          if (Array.isArray(updates.paradas) && updates.paradas.length > 0) {
            // Need to get the usedRange again since we just deleted rows
            const pRange = await client.api(`/drives/${driveId}/items/${itemId}/workbook/worksheets('${paradasSheetName}')/usedRange`).get();
            const pRowCount = pRange.rowCount;
            let pNextRow = pRange.rowIndex + pRowCount;
            if (pRowCount === 1 && pRange.values[0][0] === '') pNextRow = 0;

            const baseDate = updatedRow[0] || new Date().toLocaleDateString('pt-BR');
            const baseOp = updatedRow[1] || '';
            const baseLitragem = updatedRow[4] || '';
            const baseProduto = updatedRow[5] || '';
            const baseLinha = updatedRow[6] || '';
            const baseTurno = updatedRow[7] || '';

            const newValues = updates.paradas.map(p => [
              baseDate,
              baseOp,
              baseLitragem,
              baseProduto,
              baseLinha,
              baseTurno,
              p.seq || '',
              p.tipologia || '',
              p.horaInicio || '',
              p.horaFim || ''
            ]);

            const startRow = pNextRow + 1;
            const endRow = pNextRow + newValues.length;
            const pAppendRangeStr = `A${startRow}:J${endRow}`;
            
            await client.api(`/drives/${driveId}/items/${itemId}/workbook/worksheets('${paradasSheetName}')/range(address='${pAppendRangeStr}')`)
              .patch({ values: newValues });
          }
        } catch (err: any) {
          console.warn("Could not update PARADAS sheet.", err.message);
        }
      }

      return res.status(200).json({ success: true, message: 'Row updated', data: updateRes });
    } else {
      console.log('Row not found for update:', originalData);
      return res.status(404).json({ success: false, error: 'Row not found in spreadsheet' });
    }
  } catch (error: any) {
    console.error("Update error:", error?.message || error);
    return res.status(500).json({ success: false, error: error?.message || String(error) });
  }
});

app.post('/api/delete', async (req, res) => {
  try {
    const { op, linha } = req.body;
    const client = getGraphClient();
    const { driveId, itemId } = await resolveExcelFile(client);
    const msSheetName = MS_SHEET_NAME;

    // 1. Delete from Main Sheet
    const usedRange = await client.api(`/drives/${driveId}/items/${itemId}/workbook/worksheets('${msSheetName}')/usedRange`).get();
    
    let rowIndexFound = -1;
    let excelRowFound = -1;

    for (let i = usedRange.values.length - 1; i >= 0; i--) {
      const row = usedRange.values[i];
      const rowLinha = String(row[6] || '').trim().replace('Linha ', '');
      const searchLinha = String(linha || '').trim().replace('Linha ', '');
      if (
        String(row[1] || '').trim() === String(op || '').trim() && 
        rowLinha === searchLinha
      ) {
        rowIndexFound = i;
        excelRowFound = usedRange.rowIndex + i + 1;
        break; // Only delete the most recent matching one to avoid deleting duplicates by mistake
      }
    }

    if (excelRowFound !== -1) {
      const rowToDelete = `${excelRowFound}:${excelRowFound}`;
      await client.api(`/drives/${driveId}/items/${itemId}/workbook/worksheets('${msSheetName}')/range(address='${rowToDelete}')/delete`)
        .post({ shift: 'Up' });
    }

    // 2. Delete from PARADAS Sheet
    try {
      const paradasSheetName = 'PARADAS';
      const paradasRange = await client.api(`/drives/${driveId}/items/${itemId}/workbook/worksheets('${paradasSheetName}')/usedRange`).get();
      
      const rowsToDelete = [];
      for (let i = paradasRange.values.length - 1; i >= 0; i--) {
        const row = paradasRange.values[i];
        const rowLinha = String(row[4] || '').trim().replace('Linha ', '');
        const searchLinha = String(linha || '').trim().replace('Linha ', '');
        
        if (
          String(row[1] || '').trim() === String(op || '').trim() &&
          rowLinha === searchLinha
        ) {
          rowsToDelete.push(paradasRange.rowIndex + i + 1);
        }
      }

      // Delete from bottom to top to avoid shifting issues
      for (const rowIdx of rowsToDelete) {
        const rowToDelete = `${rowIdx}:${rowIdx}`;
        await client.api(`/drives/${driveId}/items/${itemId}/workbook/worksheets('${paradasSheetName}')/range(address='${rowToDelete}')/delete`)
          .post({ shift: 'Up' });
      }
    } catch (err: any) {
      console.warn("Could not delete from PARADAS sheet. Is it created?", err.message);
    }

    if (excelRowFound !== -1) {
      return res.status(200).json({ success: true, message: 'Row and related paradas deleted' });
    } else {
      console.log('Row not found for delete:', req.body);
      return res.status(404).json({ success: false, error: 'Row not found in spreadsheet' });
    }
  } catch (error: any) {
    console.error("Delete error:", error?.message || error);
    return res.status(500).json({ success: false, error: error?.message || String(error) });
  }
});

const getDistPath = () => path.join(process.cwd(), 'dist');

// Serve frontend in production (only outside of Vercel)
if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
  const distPath = getDistPath();
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else if (!process.env.VERCEL) {
  const initVite = async () => {
    const viteModule = 'vite';
    const { createServer: createViteServer } = await import(/* @vite-ignore */ viteModule);
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  };
  initVite();
}

if (!process.env.VERCEL) {
  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
