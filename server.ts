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

// GET /api/list-fields?list=Registro_Paradas_Geral
app.get('/api/list-fields', async (req, res) => {
  if (!hasLocalCredentials) return res.status(503).json({ error: 'No MS credentials configured' });
  const listName = (req.query.list as string) || PRODUCAO_LIST;
  try {
    const client = getGraphClient();
    const sitePrefix = getSiteUrlPrefix();
    const listInfo = await client
      .api(`${sitePrefix}/lists/${encodeURIComponent(listName)}`)
      .select('id,displayName')
      .get();
    const result = await client
      .api(`${sitePrefix}/lists/${listInfo.id}/columns`)
      .select('displayName,name')
      .get();
    return res.json(
      result.value.map((f: any) => ({ display: f.displayName, internal: f.name }))
    );
  } catch (err: any) {
    return res.status(500).json({ error: err.message, details: err.body || null });
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

// DB_Producao_Envase — verified via /api/list-fields
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
  Observacoes: 'Observa_x00e7__x00f5_es', // display="Observações"
};

// Registro_Paradas_Geral — verified via /api/list-fields
// IMPORTANT: "Linha" display name maps to internal "Recurso"
const F_PAR = {
  Title:        'Title',
  Data:         'Data',
  OP:           'OP',
  Linha:        'Recurso',                   // display="Linha" but internal="Recurso"
  Turno:        'Turno',
  Operador:     'Operador',
  Produto:      'Produto',
  TipoParada:   'Tipo_Parada',
  CodParada:    'Cod_Parada',
  DetalheParada:'Detalhe_Parada',
  HoraInicio:   'Hora_Inicio',
  HoraFim:      'Hora_Fim',
  Observacao:   'Observa_x00e7__x00e3_o',    // display="Observação"
  NumeroOS:     'N_x00fa_meroO_x002e_S',     // display="Número O.S"
};

// Normaliza qualquer valor para string segura (nunca undefined/null)
const s = (v: any): string => (v == null ? '' : String(v));

// Compara dois valores de OP ignorando tipo (number vs string)
const opMatch = (a: any, b: any): boolean => s(a).trim() === s(b).trim();

const buildParadaFields = (p: any, baseDate: string, linha: string, turno: string, produto: string, operador: string, op: string) => ({
  [F_PAR.Title]:         s(p.seq),
  [F_PAR.Data]:          baseDate,
  [F_PAR.OP]:            s(op),
  [F_PAR.Linha]:         s(linha),
  [F_PAR.Turno]:         s(turno),
  [F_PAR.Operador]:      s(operador),
  [F_PAR.Produto]:       s(produto),
  [F_PAR.TipoParada]:    s(p.tipologia),
  [F_PAR.CodParada]:     s(p.tipologia),
  [F_PAR.DetalheParada]: s(p.detalhamento || p.observacao),
  [F_PAR.HoraInicio]:    s(p.horaInicio),
  [F_PAR.HoraFim]:       s(p.horaFim),
  [F_PAR.Observacao]:    s(p.observacao),
  [F_PAR.NumeroOS]:      s(p.numeroOS),
});

app.post('/api/append', async (req, res) => {
  console.log('POST /api/append received', JSON.stringify(req.body));
  if (!hasLocalCredentials) {
    return res.status(200).json({ success: true, message: 'MOCKED Row added' });
  }
  try {
    const { carimbo, op, produto, linha, turno, operador, quantidade, horaInicial, horaFinal, paradas, isAvulsa } = req.body;
    const baseDate = parseDateToISO(carimbo);
    // OP: tenta número, senão guarda como string no Title
    const numOp  = parseFloat(s(op).replace(/[^\d.,]/g, '')) || 0;
    const numQtd = parseFloat(s(quantidade).replace(/[^\d.,]/g, '')) || 0;

    const producaoFields: Record<string, any> = {
      [F_PROD.Title]:      s(op),
      [F_PROD.Data]:       baseDate,
      [F_PROD.OP]:         numOp,
      [F_PROD.Linha]:      s(linha),
      [F_PROD.Turno]:      s(turno),
      [F_PROD.Operador]:   s(operador),
      [F_PROD.HoraInicio]: s(horaInicial),
      [F_PROD.HoraFim]:    s(horaFinal),
      [F_PROD.Produto]:    s(produto),
      [F_PROD.Quantidade]: numQtd,
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
          const pf = buildParadaFields(p, baseDate, s(linha), s(turno), s(produto), s(operador), s(op));
          console.log('Fields being sent to SP (Parada):', JSON.stringify(pf));
          await client.api(`${getSiteUrlPrefix()}/lists/${PARADAS_LIST}/items`).post({ fields: pf });
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
      const pf = buildParadaFields(p, baseDate, s(linha), s(turno), s(produto), s(operador), s(op));
      await client.api(`${getSiteUrlPrefix()}/lists/${PARADAS_LIST}/items`).post({ fields: pf });
      await new Promise(r => setTimeout(r, 200));
    }
    return res.status(200).json({ success: true, message: 'Paradas added' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || String(error), details: error?.body || null });
  }
});

app.post('/api/update', async (req, res) => {
  console.log('POST /api/update received', JSON.stringify(req.body));
  if (!hasLocalCredentials) return res.status(200).json({ success: true, message: 'MOCKED Row updated' });
  try {
    const { originalData, updates } = req.body;
    const isAvulsa = updates.isAvulsa || originalData.isAvulsa;
    const client   = getGraphClient();
    let itemIdToUpdate: string | null = null;

    if (!isAvulsa) {
      try {
        // Paginar para buscar todos os itens (SharePoint limita 100 por default)
        let nextLink: string | null =
          `${getSiteUrlPrefix()}/lists/${PRODUCAO_LIST}/items?$expand=fields&$top=500`;
        while (nextLink && !itemIdToUpdate) {
          const page: any = await client.api(nextLink).get();
          // FIX: comparar como string para evitar number !== string
          const matching = (page.value as any[]).filter(i =>
            opMatch(i.fields.OP, originalData.op) &&
            s(i.fields.Linha).trim() === s(originalData.linha).trim()
          );
          if (matching.length > 0) {
            itemIdToUpdate = matching[matching.length - 1].id;
          }
          nextLink = page['@odata.nextLink'] || null;
        }
        console.log(`[update] itemIdToUpdate=${itemIdToUpdate} for OP="${originalData.op}" Linha="${originalData.linha}"`);
      } catch (err) {
        console.warn('Could not find item to update', err);
      }
    }

    if (isAvulsa || itemIdToUpdate) {
      if (!isAvulsa && itemIdToUpdate) {
        const uf: Record<string, any> = {};
        if (updates.opNumber    !== undefined) uf[F_PROD.OP]         = parseFloat(s(updates.opNumber).replace(/[^\d.,]/g, '')) || 0;
        if (updates.horaInicial !== undefined) uf[F_PROD.HoraInicio] = s(updates.horaInicial);
        if (updates.horaFinal   !== undefined) uf[F_PROD.HoraFim]    = s(updates.horaFinal);
        if (updates.produto     !== undefined) uf[F_PROD.Produto]    = s(updates.produto);
        if (updates.linha       !== undefined) uf[F_PROD.Linha]      = s(updates.linha);
        if (updates.turno       !== undefined) uf[F_PROD.Turno]      = s(updates.turno);
        if (updates.operador    !== undefined) uf[F_PROD.Operador]   = s(updates.operador);
        if (updates.quantidade  !== undefined) uf[F_PROD.Quantidade] = parseFloat(s(updates.quantidade).replace(/[^\d.,]/g, '')) || 0;
        console.log('Fields being patched to SP (Producao):', JSON.stringify(uf));
        await client.api(`${getSiteUrlPrefix()}/lists/${PRODUCAO_LIST}/items/${itemIdToUpdate}`).patch({ fields: uf });
      }

      if (updates.paradas !== undefined) {
        try {
          let nextLink: string | null =
            `${getSiteUrlPrefix()}/lists/${PARADAS_LIST}/items?$expand=fields&$top=500`;
          const allParadaItems: any[] = [];
          while (nextLink) {
            const page: any = await client.api(nextLink).get();
            allParadaItems.push(...page.value);
            nextLink = page['@odata.nextLink'] || null;
          }

          let baseOp = s(originalData.op);
          if (!isAvulsa && updates.opNumber !== undefined) baseOp = s(updates.opNumber);
          const baseDate = parseDateToISO(originalData.carimbo);

          // FIX: comparar como string
          const oldParadas = allParadaItems.filter(i =>
            opMatch(i.fields.OP, originalData.op)
          );
          for (const m of oldParadas) {
            await client.api(`${getSiteUrlPrefix()}/lists/${PARADAS_LIST}/items/${m.id}`).delete();
            await new Promise(r => setTimeout(r, 200));
          }

          if (Array.isArray(updates.paradas) && updates.paradas.length > 0) {
            const bL = s(updates.linha    || originalData.linha);
            const bT = s(updates.turno    || originalData.turno);
            const bO = s(updates.operador || originalData.operador);
            const bP = s(updates.produto  || originalData.produto);
            for (const p of updates.paradas) {
              const pf = buildParadaFields(p, baseDate, bL, bT, bP, bO, baseOp);
              await client.api(`${getSiteUrlPrefix()}/lists/${PARADAS_LIST}/items`).post({ fields: pf });
              await new Promise(r => setTimeout(r, 200));
            }
          }
        } catch (err: any) {
          console.warn('Could not update PARADAS.', err.message);
        }
      }

      return res.status(200).json({ success: true, message: 'Row updated' });
    } else {
      console.log(`[update] Item not found — returning 404 for OP="${originalData.op}"`);
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
        let nextLink: string | null =
          `${getSiteUrlPrefix()}/lists/${PRODUCAO_LIST}/items?$expand=fields&$top=500`;
        const allItems: any[] = [];
        while (nextLink) {
          const page: any = await client.api(nextLink).get();
          allItems.push(...page.value);
          nextLink = page['@odata.nextLink'] || null;
        }
        // FIX: comparar como string
        const matching = allItems.filter(i =>
          opMatch(i.fields.OP, op) &&
          s(i.fields.Linha).trim() === s(linha).trim()
        );
        if (matching.length > 0) {
          await client.api(`${getSiteUrlPrefix()}/lists/${PRODUCAO_LIST}/items/${matching[matching.length - 1].id}`).delete();
          deletedAny = true;
        }
      } catch (err) {
        console.warn('Could not delete from PRODUCAO', err);
      }
    }

    try {
      let nextLink: string | null =
        `${getSiteUrlPrefix()}/lists/${PARADAS_LIST}/items?$expand=fields&$top=500`;
      const allParadas: any[] = [];
      while (nextLink) {
        const page: any = await client.api(nextLink).get();
        allParadas.push(...page.value);
        nextLink = page['@odata.nextLink'] || null;
      }
      // FIX: comparar como string
      const matching = allParadas.filter(i => opMatch(i.fields.OP, op));
      for (const m of matching) {
        await client.api(`${getSiteUrlPrefix()}/lists/${PARADAS_LIST}/items/${m.id}`).delete();
        await new Promise(r => setTimeout(r, 200));
        deletedAny = true;
      }
    } catch (err: any) {
      console.warn('Could not delete from PARADAS.', err.message);
    }

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
