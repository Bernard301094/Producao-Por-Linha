import { Client } from '@microsoft/microsoft-graph-client';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';
import { ClientSecretCredential } from '@azure/identity';
import * as dotenv from 'dotenv';

dotenv.config();

const credential = new ClientSecretCredential(
  process.env.TENANT_ID as string,
  process.env.CLIENT_ID as string,
  process.env.CLIENT_SECRET as string
);

const authProvider = new TokenCredentialAuthenticationProvider(credential, {
  scopes: ['https://graph.microsoft.com/.default']
});

const client = Client.initWithMiddleware({ authProvider });

async function run() {
  const siteUrl = `/sites/${process.env.SHAREPOINT_HOSTNAME}:/sites/${process.env.SHAREPOINT_SITE_PATH}`;
  const PRODUCAO_LIST = 'DB_Producao_Envase';
  const PARADAS_LIST = 'Registro_Paradas_Geral';

  try {
    const prodCols = await client.api(`${siteUrl}/lists/${PRODUCAO_LIST}/columns`).get();
    console.log("DB_Producao_Envase columns:");
    prodCols.value.forEach((c: any) => console.log(`${c.displayName} -> ${c.name}`));

    const paradasCols = await client.api(`${siteUrl}/lists/${PARADAS_LIST}/columns`).get();
    console.log("\nRegistro_Paradas_Geral columns:");
    paradasCols.value.forEach((c: any) => console.log(`${c.displayName} -> ${c.name}`));
  } catch (e) {
    console.error(e);
  }
}
run();
