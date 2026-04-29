import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const keyExists = !!process.env.GOOGLE_PRIVATE_KEY;
  const sheetId = process.env.GOOGLE_SPREADSHEET_ID;
  const sheetName = process.env.GOOGLE_SHEET_NAME;

  return res.json({
    env: {
      GOOGLE_SERVICE_ACCOUNT_EMAIL: email ? 'Set' : 'NOT SET',
      GOOGLE_PRIVATE_KEY: keyExists ? 'Set' : 'NOT SET',
      GOOGLE_SPREADSHEET_ID: sheetId || 'Using default',
      GOOGLE_SHEET_NAME: sheetName || 'Using default',
    },
    status: (email && keyExists) ? 'Configured' : 'Incomplete',
  });
}
