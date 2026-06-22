import 'isomorphic-fetch';
import express from 'express';
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

const SITE_HOSTNAME = 'vonixxevc-my.sharepoint.com';
const SITE_PATH = '/personal/maurilio_nascimento_tractgroup_com_br';
const PRODUCAO_LIST = 'DB_Producao_Envase';
const PARADAS_LIST = 'Registro_Paradas_Geral';

const getSiteUrlPrefix = () => {
  return `/sites/${SITE_HOSTNAME}:${SITE_PATH}:`;
};

const hasLocalCredentials = !!(
  process.env.MICROSOFT_TENANT_ID &&
  process.env.MICROSOFT_CLIENT_ID &&
  process.env.MICROSOFT_CLIENT_SECRET
);

// Endpoint to check if configuration is set correctly and actually test connection
app.get('/api/config-check', async (req, res) => {
  const tenantId = process.env.MICROSOFT_TENANT_ID;
  const clientId = process.env.MICROSOFT_CLIENT_ID;

  let connectionStatus = 'Not Configured';
  let details = '';

  if (tenantId && clientId) {
    try {
      const client = getGraphClient();
      await client.api(`${getSiteUrlPrefix()}/lists/${PRODUCAO_LIST}`).get();
      connectionStatus = 'Connected to SharePoint Lists';
    } catch (err: any) {
      connectionStatus = `Error: ${err.message}`;
      details = JSON.stringify(err.body || err);
    }
  }

  res.json({
    env: {
      MICROSOFT_TENANT_ID: tenantId ? 'Set' : 'NOT SET',
      MICROSOFT_CLIENT_ID: clientId ? 'Set' : 'NOT SET'
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

const parseDateToISO = (dateStr: string) => {
  if (!dateStr) return new Date().toISOString();
  let cleanStr = dateStr.replace(/^'/, '').trim();
  if (cleanStr.includes('/')) {
    const parts = cleanStr.split('/');
    if (parts.length === 3) {
      const dt = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      if (!isNaN(dt.getTime())) return dt.toISOString();
    }
  }
  return new Date().toISOString();
};

app.post('/api/append', async (req, res) => {
  console.log("POST /api/append received (SharePoint Lists)", req.body);
  if (!hasLocalCredentials) {
    console.log("[Mock] MOCKING SUCCESS for /api/append because local MS credentials are missing.");
    return res.status(200).json({ success: true, message: 'MOCKED Row added via SharePoint Lists' });
  }
  
  try {
    const {
      carimbo, op, litragem, produto, linha, turno, operador, quantidade, horaInicial, horaFinal, observacoes, paradas, isAvulsa
    } = req.body;

    const baseDate = parseDateToISO(carimbo);
    const numOp = parseFloat(String(op).replace(/[^\d.,]/g, '')) || 0;
    const numQuantidade = parseFloat(String(quantidade).replace(/[^\d.,]/g, '')) || 0;

    const producaoFields = {
      Title: String(op || ''), 
      Data: baseDate,
      OP: numOp,
      Linha: linha || '',
      Turno: turno || '',
      Operador: operador || '',
      Hora_Inicio: horaInicial || '',
      Hora_Fim: horaFinal || '',
      Produto: produto || '',
      QuantidadeProduzida: numQuantidade,
      Observa_x00e7__x00f5_es: observacoes || ''
    };

    const client = getGraphClient();
    
    try {
      let updateRes = null;

      if (!isAvulsa) {
        updateRes = await client.api(`${getSiteUrlPrefix()}/lists/${PRODUCAO_LIST}/items`).post({
          fields: producaoFields
        });
      }
      
      // Sync paradas if provided
      if (paradas && Array.isArray(paradas) && paradas.length > 0) {
        try {
          for (const p of paradas) {
            const paradaFields = {
              Title: String(p.seq || ''),
              Data: baseDate,
              _x00c1_rea: 'Envase',
              Recurso: producaoFields.Linha,
              Turno: producaoFields.Turno,
              Produto: producaoFields.Produto,
              Operador: producaoFields.Operador,
              OP: String(op || ''),
              Cod_Parada: p.seq && p.tipologia ? `${p.seq} ${p.tipologia}` : (p.tipologia || String(p.seq || '')),
              Tipo_Parada: p.tipologia || '',
              Detalhe_Parada: p.observacao || '',
              Hora_Inicio: p.horaInicio || '',
              Hora_Fim: p.horaFim || '',
              N_x00fa_meroO_x002e_S: p.numeroOS || '',
              Observa_x00e7__x00e3_o: ''
            };
            
            await client.api(`${getSiteUrlPrefix()}/lists/${PARADAS_LIST}/items`).post({
              fields: paradaFields
            });
            // Delay to prevent throttling
            await new Promise(resolve => setTimeout(resolve, 200));
          }
          console.log("SharePoint Lists Append Paradas success");
        } catch (err: any) {
          console.warn("Could not handle PARADAS append.", err.message);
          throw new Error(`OP salva, mas falha ao sincronizar paradas: ${err.message}`);
        }
      }

      console.log("SharePoint Append success");
      return res.status(200).json({ success: true, message: 'Row added via SharePoint Lists', data: updateRes });
    } catch (e) {
       throw e;
    }
  } catch (error: any) {
    console.error("Failed to append to SharePoint:", error?.message || error);
    res.status(500).json({ 
      success: false, 
      error: error?.message || String(error),
      details: error?.body || null
    });
  }
});

app.post('/api/append-paradas', async (req, res) => {
  console.log("POST /api/append-paradas received", req.body);
  if (!hasLocalCredentials) {
    console.log("[Mock] MOCKING SUCCESS for /api/append-paradas because local MS credentials are missing.");
    return res.status(200).json({ success: true, message: 'MOCKED Paradas added via SharePoint' });
  }
  
  try {
    const {
      carimbo, op, litragem, produto, linha, turno, operador, paradas
    } = req.body;

    if (!paradas || !Array.isArray(paradas) || paradas.length === 0) {
      return res.status(200).json({ success: true, message: 'No paradas to append' });
    }

    const baseDate = parseDateToISO(carimbo);
    const client = getGraphClient();
    
    try {
      for (const p of paradas) {
        const paradaFields = {
          Title: String(p.seq || ''),
          Data: baseDate,
          _x00c1_rea: 'Envase',
          Recurso: linha || '',
          Turno: turno || '',
          Produto: produto || '',
          Operador: operador || '',
          OP: String(op || ''),
          Cod_Parada: p.seq && p.tipologia ? `${p.seq} ${p.tipologia}` : (p.tipologia || String(p.seq || '')),
          Tipo_Parada: p.tipologia || '',
          Detalhe_Parada: p.observacao || '',
          Hora_Inicio: p.horaInicio || '',
          Hora_Fim: p.horaFim || '',
          N_x00fa_meroO_x002e_S: p.numeroOS || '',
          Observa_x00e7__x00e3_o: ''
        };
        
        await client.api(`${getSiteUrlPrefix()}/lists/${PARADAS_LIST}/items`).post({
          fields: paradaFields
        });
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      console.log("SharePoint Append Paradas success");
      return res.status(200).json({ success: true, message: 'Paradas added via SharePoint Lists' });
    } catch (e) {
       throw e;
    }
  } catch (error: any) {
    console.error("Failed to append paradas to SharePoint:", error?.message || error);
    res.status(500).json({ 
      success: false, 
      error: error?.message || String(error),
      details: error?.body || null
    });
  }
});

app.post('/api/update', async (req, res) => {
  if (!hasLocalCredentials) {
    console.log("[Mock] MOCKING SUCCESS for /api/update because local MS credentials are missing.");
    return res.status(200).json({ success: true, message: 'MOCKED Row updated' });
  }

  try {
    const { originalData, updates } = req.body;
    const isAvulsa = updates.isAvulsa || originalData.isAvulsa;
    const client = getGraphClient();

    let itemIdToUpdate = null;

    if (!isAvulsa) {
      // Find the item in Producao list
      const query = `fields/OP eq '${originalData.op}' and fields/Linha eq '${originalData.linha}'`;
      // Note: Filtering by fields in SharePoint might require specific indexes or $filter syntax. We may need to get items and filter in code if $filter fails.
      try {
        const listItems = await client.api(`${getSiteUrlPrefix()}/lists/${PRODUCAO_LIST}/items?$expand=fields`).get();
        const items = listItems.value;
        const matchingItems = items.filter((i: any) => 
          i.fields.OP === originalData.op && i.fields.Linha === originalData.linha
        );
        // Take the latest matching item
        if (matchingItems.length > 0) {
          itemIdToUpdate = matchingItems[matchingItems.length - 1].id;
        }
      } catch (err) {
        console.warn("Could not find item to update", err);
      }
    }

    if (isAvulsa || itemIdToUpdate) {
      if (!isAvulsa && itemIdToUpdate) {
        const updateFields: any = {};
        if (updates.opNumber !== undefined) updateFields.OP = parseFloat(String(updates.opNumber).replace(/[^\d.,]/g, '')) || 0;
        if (updates.horaInicial !== undefined) updateFields.Hora_Inicio = updates.horaInicial;
        if (updates.horaFinal !== undefined) updateFields.Hora_Fim = updates.horaFinal;
        if (updates.produto !== undefined) updateFields.Produto = updates.produto;
        if (updates.linha !== undefined) updateFields.Linha = updates.linha;
        if (updates.turno !== undefined) updateFields.Turno = updates.turno;
        if (updates.operador !== undefined) updateFields.Operador = updates.operador;
        if (updates.quantidade !== undefined) updateFields.QuantidadeProduzida = parseFloat(String(updates.quantidade).replace(/[^\d.,]/g, '')) || 0;
        if (updates.observacoes !== undefined) updateFields.Observa_x00e7__x00f5_es = updates.observacoes;

        await client.api(`${getSiteUrlPrefix()}/lists/${PRODUCAO_LIST}/items/${itemIdToUpdate}`).patch({
          fields: updateFields
        });
      }
      
      // Update Paradas if provided
      if (updates.paradas !== undefined) {
        try {
          const pListItems = await client.api(`${getSiteUrlPrefix()}/lists/${PARADAS_LIST}/items?$expand=fields`).get();
          const items = pListItems.value;
          
          let baseOp = String(originalData.op || '');
          if (!isAvulsa && updates.opNumber !== undefined) baseOp = String(updates.opNumber);
          
          let baseLinha = originalData.linha || '';
          if (!isAvulsa && updates.linha !== undefined) baseLinha = updates.linha;
          
          let baseData = parseDateToISO(originalData.carimbo);
          
          const matchingItems = items.filter((i: any) => 
            String(i.fields.OP || '') === String(originalData.op || '') && String(i.fields.Recurso || '') === String(originalData.linha || '')
          );
          
          for (const m of matchingItems) {
            await client.api(`${getSiteUrlPrefix()}/lists/${PARADAS_LIST}/items/${m.id}`).delete();
            await new Promise(resolve => setTimeout(resolve, 200));
          }

          if (Array.isArray(updates.paradas) && updates.paradas.length > 0) {
            const baseLinha = updates.linha || originalData.linha || '';
            const baseTurno = updates.turno || originalData.turno || '';
            const baseOperador = updates.operador || originalData.operador || '';
            const baseProduto = updates.produto || originalData.produto || '';

            for (const p of updates.paradas) {
              const paradaFields = {
                Title: String(p.seq || ''),
                Data: baseData,
                _x00c1_rea: 'Envase',
                Recurso: baseLinha,
                Turno: baseTurno,
                Produto: baseProduto,
                Operador: baseOperador,
                OP: baseOp,
                Cod_Parada: p.seq && p.tipologia ? `${p.seq} ${p.tipologia}` : (p.tipologia || String(p.seq || '')),
                Tipo_Parada: p.tipologia || '',
                Detalhe_Parada: p.observacao || '',
                Hora_Inicio: p.horaInicio || '',
                Hora_Fim: p.horaFim || '',
                N_x00fa_meroO_x002e_S: p.numeroOS || '',
                Observa_x00e7__x00e3_o: ''
              };
              await client.api(`${getSiteUrlPrefix()}/lists/${PARADAS_LIST}/items`).post({
                fields: paradaFields
              });
              await new Promise(resolve => setTimeout(resolve, 200));
            }
          }
        } catch (err: any) {
          console.warn("Could not update PARADAS sheet.", err.message);
        }
      }

      return res.status(200).json({ success: true, message: 'Row updated' });
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
  if (!hasLocalCredentials) {
    console.log("[Mock] MOCKING SUCCESS for /api/delete because local MS credentials are missing.");
    return res.status(200).json({ success: true, message: 'MOCKED Row deleted' });
  }

  try {
    const { op, linha, isAvulsa } = req.body;
    const client = getGraphClient();

    let deletedAny = false;

    // 1. Delete from Producao List
    if (!isAvulsa) {
      try {
        const listItems = await client.api(`${getSiteUrlPrefix()}/lists/${PRODUCAO_LIST}/items?$expand=fields`).get();
        const items = listItems.value;
        const matchingItems = items.filter((i: any) => 
          i.fields.OP === op && i.fields.Linha === linha
        );
        if (matchingItems.length > 0) {
          const itemIdToUpdate = matchingItems[matchingItems.length - 1].id;
          await client.api(`${getSiteUrlPrefix()}/lists/${PRODUCAO_LIST}/items/${itemIdToUpdate}`).delete();
          deletedAny = true;
        }
      } catch (err) {
        console.warn("Could not delete from PRODUCAO", err);
      }
    }

    // 2. Delete from Paradas List
    try {
      const pListItems = await client.api(`${getSiteUrlPrefix()}/lists/${PARADAS_LIST}/items?$expand=fields`).get();
      const items = pListItems.value;
      const matchingItems = items.filter((i: any) => 
        String(i.fields.OP || '') === String(op || '') && String(i.fields.Recurso || '') === String(linha || '')
      );
      
      for (const m of matchingItems) {
        await client.api(`${getSiteUrlPrefix()}/lists/${PARADAS_LIST}/items/${m.id}`).delete();
        await new Promise(resolve => setTimeout(resolve, 200));
        deletedAny = true;
      }
    } catch (err: any) {
      console.warn("Could not delete from PARADAS sheet.", err.message);
    }

    if (deletedAny) {
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
