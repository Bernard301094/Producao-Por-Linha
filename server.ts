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

app.use('/api', (req, res, next) => {
  console.log(`[API Request] ${req.method} ${req.url}`);
  next();
});

const getGraphClient = () => {
  const tenantId = process.env.MICROSOFT_TENANT_ID;
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error('Missing Microsoft Graph App credentials in environment variables');
  }

  const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
  return Client.init({
    authProvider: (done) => {
      credential.getToken('https://graph.microsoft.com/.default')
        .then(token => done(null, token.token))
        .catch(error => done(error, null));
    }
  });
};

const SITE_HOSTNAME = 'vonixxevc-my.sharepoint.com';
const SITE_PATH = '/personal/maurilio_nascimento_tractgroup_com_br';
const PRODUCAO_LIST = 'DB_Producao_Envase';
const PARADAS_LIST = 'Registro_Paradas_Geral';

const getSiteUrlPrefix = () => `/sites/${SITE_HOSTNAME}:${SITE_PATH}:`;

const hasLocalCredentials = !!(
  process.env.MICROSOFT_TENANT_ID &&
  process.env.MICROSOFT_CLIENT_ID &&
  process.env.MICROSOFT_CLIENT_SECRET
);

// GET /api/list-fields?list=DB_Producao_Envase  — returns real internal names
app.get('/api/list-fields', async (req, res) => {
  if (!hasLocalCredentials) return res.status(503).json({ error: 'No MS credentials configured' });
  const listName = (req.query.list as string) || PRODUCAO_LIST;
  try {
    const client = getGraphClient();
    const result = await client
      .api(`${getSiteUrlPrefix()}/lists/${listName}/fields`)
      .select('displayName,internalName,typeAsString')
      .get();
    return res.json(result.value.map((f: any) => ({ display: f.displayName, internal: f.internalName, type: f.typeAsString })));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

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
    env: { MICROSOFT_TENANT_ID: tenantId ? 'Set' : 'NOT SET', MICROSOFT_CLIENT_ID: clientId ? 'Set' : 'NOT SET' },
    status: connectionStatus,
    details
  });
});

const parseDateToISO = (dateStr: string) => {
  if (!dateStr) return new Date().toISOString();
  const cleanStr = dateStr.replace(/^'/, '').trim();
  if (cleanStr.includes('/')) {
    const parts = cleanStr.split('/');
    if (parts.length === 3) {
      const dt = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      if (!isNaN(dt.getTime())) return dt.toISOString();
    }
  }
  return new Date().toISOString();
};

// DB_Producao_Envase field names
// To verify real internal names: GET /api/list-fields?list=DB_Producao_Envase
const F_PROD = {
  Title:       'Title',
  Data:        'Data',
  OP:          'OP',
  Linha:       'Linha',
  Turno:       'Turno',
  Operador:    'Operador',
  HoraInicio:  'Hora_Inicio',
  HoraFim:     'Hora_Fim',
  Produto:     'Produto',
  Quantidade:  'QuantidadeProduzida',
  Observacoes: 'Observacoes',
};

// Registro_Paradas_Geral field names
const F_PAR = {
  Title:         'Title',
  Data:          'Data',
  Area:          'Area',
  Linha:         'Linha',
  Reator:        'Reator',
  Turno:         'Turno',
  Produto:       'Produto',
  Operador:      'Operador',
  OP:            'OP',
  TipoParada:    'Tipo_Parada',
  CodParada:     'Cod_Parada',
  DetalheParada: 'Detalhe_Parada',
  HoraInicio:    'Hora_Inicio',
  HoraFim:       'Hora_Fim',
  NumeroOS:      'NumeroOS',
  Observacao:    'Observacao',
};

app.post('/api/append', async (req, res) => {
  console.log('POST /api/append received', req.body);
  if (!hasLocalCredentials) {
    return res.status(200).json({ success: true, message: 'MOCKED Row added' });
  }
  try {
    const { carimbo, op, produto, linha, turno, operador, quantidade, horaInicial, horaFinal, observacoes, paradas, isAvulsa } = req.body;
    const baseDate = parseDateToISO(carimbo);
    const numOp    = parseFloat(String(op).replace(/[^\d.,]/g, '')) || 0;
    const numQtd   = parseFloat(String(quantidade).replace(/[^\d.,]/g, '')) || 0;

    const producaoFields = {
      [F_PROD.Title]:       String(op || ''),
      [F_PROD.Data]:        baseDate,
      [F_PROD.OP]:          numOp,
      [F_PROD.Linha]:       linha       || '',
      [F_PROD.Turno]:       turno       || '',
      [F_PROD.Operador]:    operador    || '',
      [F_PROD.HoraInicio]:  horaInicial || '',
      [F_PROD.HoraFim]:     horaFinal   || '',
      [F_PROD.Produto]:     produto     || '',
      [F_PROD.Quantidade]:  numQtd,
      [F_PROD.Observacoes]: observacoes || '',
    };

    console.log('Fields being sent to SP (Producao):', JSON.stringify(producaoFields));

    const client = getGraphClient();
    let updateRes = null;

    if (!isAvulsa) {
      updateRes = await client
        .api(`${getSiteUrlPrefix()}/lists/${PRODUCAO_LIST}/items`)
        .post({ fields: producaoFields });
    }

    if (paradas && Array.isArray(paradas) && paradas.length > 0) {
      try {
        for (const p of paradas) {
          const paradaFields = {
            [F_PAR.Title]:         String(p.seq || ''),
            [F_PAR.Data]:          baseDate,
            [F_PAR.Area]:          'Envase',
            [F_PAR.Linha]:         linha    || '',
            [F_PAR.Reator]:        '',
            [F_PAR.Turno]:         turno    || '',
            [F_PAR.Produto]:       produto  || '',
            [F_PAR.Operador]:      operador || '',
            [F_PAR.OP]:            String(op || ''),
            [F_PAR.TipoParada]:    p.tipologia || '',
            [F_PAR.CodParada]:     p.seq && p.tipologia ? `${p.seq} ${p.tipologia}` : (p.tipologia || String(p.seq || '')),
            [F_PAR.DetalheParada]: p.observacao || '',
            [F_PAR.HoraInicio]:    p.horaInicio || '',
            [F_PAR.HoraFim]:       p.horaFim    || '',
            [F_PAR.NumeroOS]:      p.numeroOS   || '',
            [F_PAR.Observacao]:    '',
          };
          await client.api(`${getSiteUrlPrefix()}/lists/${PARADAS_LIST}/items`).post({ fields: paradaFields });
          await new Promise(r => setTimeout(r, 200));
        }
      } catch (err: any) {
        throw new Error(`OP salva, mas falha ao sincronizar paradas: ${err.message}`);
      }
    }

    return res.status(200).json({ success: true, message: 'Row added via SharePoint Lists', data: updateRes });
  } catch (error: any) {
    console.error('Failed to append to SharePoint:', error?.message || error);
    return res.status(500).json({ success: false, error: error?.message || String(error), details: error?.body || null });
  }
});

app.post('/api/append-paradas', async (req, res) => {
  if (!hasLocalCredentials) return res.status(200).json({ success: true, message: 'MOCKED Paradas added' });
  try {
    const { carimbo, op, produto, linha, turno, operador, paradas } = req.body;
    if (!paradas || !Array.isArray(paradas) || paradas.length === 0)
      return res.status(200).json({ success: true, message: 'No paradas to append' });
    const baseDate = parseDateToISO(carimbo);
    const client   = getGraphClient();
    for (const p of paradas) {
      const paradaFields = {
        [F_PAR.Title]: String(p.seq || ''), [F_PAR.Data]: baseDate, [F_PAR.Area]: 'Envase',
        [F_PAR.Linha]: linha || '', [F_PAR.Reator]: '', [F_PAR.Turno]: turno || '',
        [F_PAR.Produto]: produto || '', [F_PAR.Operador]: operador || '', [F_PAR.OP]: String(op || ''),
        [F_PAR.TipoParada]: p.tipologia || '',
        [F_PAR.CodParada]: p.seq && p.tipologia ? `${p.seq} ${p.tipologia}` : (p.tipologia || String(p.seq || '')),
        [F_PAR.DetalheParada]: p.observacao || '', [F_PAR.HoraInicio]: p.horaInicio || '',
        [F_PAR.HoraFim]: p.horaFim || '', [F_PAR.NumeroOS]: p.numeroOS || '', [F_PAR.Observacao]: '',
      };
      await client.api(`${getSiteUrlPrefix()}/lists/${PARADAS_LIST}/items`).post({ fields: paradaFields });
      await new Promise(r => setTimeout(r, 200));
    }
    return res.status(200).json({ success: true, message: 'Paradas added' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || String(error), details: error?.body || null });
  }
});

app.post('/api/update', async (req, res) => {
  if (!hasLocalCredentials) return res.status(200).json({ success: true, message: 'MOCKED Row updated' });
  try {
    const { originalData, updates } = req.body;
    const isAvulsa = updates.isAvulsa || originalData.isAvulsa;
    const client   = getGraphClient();
    let itemIdToUpdate: string | null = null;
    if (!isAvulsa) {
      try {
        const listItems = await client.api(`${getSiteUrlPrefix()}/lists/${PRODUCAO_LIST}/items?$expand=fields`).get();
        const matching = (listItems.value as any[]).filter(i => i.fields.OP === originalData.op && i.fields.Linha === originalData.linha);
        if (matching.length > 0) itemIdToUpdate = matching[matching.length - 1].id;
      } catch (err) { console.warn('Could not find item to update', err); }
    }
    if (isAvulsa || itemIdToUpdate) {
      if (!isAvulsa && itemIdToUpdate) {
        const uf: Record<string, any> = {};
        if (updates.opNumber    !== undefined) uf[F_PROD.OP]          = parseFloat(String(updates.opNumber).replace(/[^\d.,]/g, '')) || 0;
        if (updates.horaInicial !== undefined) uf[F_PROD.HoraInicio]  = updates.horaInicial;
        if (updates.horaFinal   !== undefined) uf[F_PROD.HoraFim]     = updates.horaFinal;
        if (updates.produto     !== undefined) uf[F_PROD.Produto]     = updates.produto;
        if (updates.linha       !== undefined) uf[F_PROD.Linha]       = updates.linha;
        if (updates.turno       !== undefined) uf[F_PROD.Turno]       = updates.turno;
        if (updates.operador    !== undefined) uf[F_PROD.Operador]    = updates.operador;
        if (updates.quantidade  !== undefined) uf[F_PROD.Quantidade]  = parseFloat(String(updates.quantidade).replace(/[^\d.,]/g, '')) || 0;
        if (updates.observacoes !== undefined) uf[F_PROD.Observacoes] = updates.observacoes;
        await client.api(`${getSiteUrlPrefix()}/lists/${PRODUCAO_LIST}/items/${itemIdToUpdate}`).patch({ fields: uf });
      }
      if (updates.paradas !== undefined) {
        try {
          const pListItems = await client.api(`${getSiteUrlPrefix()}/lists/${PARADAS_LIST}/items?$expand=fields`).get();
          let baseOp = String(originalData.op || '');
          if (!isAvulsa && updates.opNumber !== undefined) baseOp = String(updates.opNumber);
          const baseDate = parseDateToISO(originalData.carimbo);
          const oldParadas = (pListItems.value as any[]).filter(i =>
            String(i.fields.OP || '') === String(originalData.op || '') &&
            String(i.fields.Linha || '') === String(originalData.linha || ''));
          for (const m of oldParadas) { await client.api(`${getSiteUrlPrefix()}/lists/${PARADAS_LIST}/items/${m.id}`).delete(); await new Promise(r => setTimeout(r, 200)); }
          if (Array.isArray(updates.paradas) && updates.paradas.length > 0) {
            const bL = updates.linha || originalData.linha || '';
            const bT = updates.turno || originalData.turno || '';
            const bO = updates.operador || originalData.operador || '';
            const bP = updates.produto  || originalData.produto  || '';
            for (const p of updates.paradas) {
              const pf = {
                [F_PAR.Title]: String(p.seq || ''), [F_PAR.Data]: baseDate, [F_PAR.Area]: 'Envase',
                [F_PAR.Linha]: bL, [F_PAR.Reator]: '', [F_PAR.Turno]: bT, [F_PAR.Produto]: bP,
                [F_PAR.Operador]: bO, [F_PAR.OP]: baseOp, [F_PAR.TipoParada]: p.tipologia || '',
                [F_PAR.CodParada]: p.seq && p.tipologia ? `${p.seq} ${p.tipologia}` : (p.tipologia || String(p.seq || '')),
                [F_PAR.DetalheParada]: p.observacao || '', [F_PAR.HoraInicio]: p.horaInicio || '',
                [F_PAR.HoraFim]: p.horaFim || '', [F_PAR.NumeroOS]: p.numeroOS || '', [F_PAR.Observacao]: '',
              };
              await client.api(`${getSiteUrlPrefix()}/lists/${PARADAS_LIST}/items`).post({ fields: pf });
              await new Promise(r => setTimeout(r, 200));
            }
          }
        } catch (err: any) { console.warn('Could not update PARADAS.', err.message); }
      }
      return res.status(200).json({ success: true, message: 'Row updated' });
    } else {
      return res.status(404).json({ success: false, error: 'Row not found in spreadsheet' });
    }
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || String(error) });
  }
});

app.post('/api/delete', async (req, res) => {
  if (!hasLocalCredentials) return res.status(200).json({ success: true, message: 'MOCKED Row deleted' });
  try {
    const { op, linha, isAvulsa } = req.body;
    const client = getGraphClient();
    let deletedAny = false;
    if (!isAvulsa) {
      try {
        const listItems = await client.api(`${getSiteUrlPrefix()}/lists/${PRODUCAO_LIST}/items?$expand=fields`).get();
        const matching = (listItems.value as any[]).filter(i => i.fields.OP === op && i.fields.Linha === linha);
        if (matching.length > 0) { await client.api(`${getSiteUrlPrefix()}/lists/${PRODUCAO_LIST}/items/${matching[matching.length - 1].id}`).delete(); deletedAny = true; }
      } catch (err) { console.warn('Could not delete from PRODUCAO', err); }
    }
    try {
      const pListItems = await client.api(`${getSiteUrlPrefix()}/lists/${PARADAS_LIST}/items?$expand=fields`).get();
      const matching = (pListItems.value as any[]).filter(i => String(i.fields.OP || '') === String(op || '') && String(i.fields.Linha || '') === String(linha || ''));
      for (const m of matching) { await client.api(`${getSiteUrlPrefix()}/lists/${PARADAS_LIST}/items/${m.id}`).delete(); await new Promise(r => setTimeout(r, 200)); deletedAny = true; }
    } catch (err: any) { console.warn('Could not delete from PARADAS.', err.message); }
    if (deletedAny) return res.status(200).json({ success: true, message: 'Row and related paradas deleted' });
    else return res.status(404).json({ success: false, error: 'Row not found in spreadsheet' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || String(error) });
  }
});

const getDistPath = () => path.join(process.cwd(), 'dist');

if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
  const distPath = getDistPath();
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => { if (req.path.startsWith('/api')) return next(); res.sendFile(path.join(distPath, 'index.html')); });
} else if (!process.env.VERCEL) {
  const initVite = async () => {
    const viteModule = 'vite';
    const { createServer: createViteServer } = await import(/* @vite-ignore */ viteModule);
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  };
  initVite();
}

if (!process.env.VERCEL) {
  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => console.log(`Server running on http://localhost:${PORT}`));
}

export default app;
