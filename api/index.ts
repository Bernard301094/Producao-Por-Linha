// Vercel serverless entry point — re-exports the Express app from server.ts
import app from '../server.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  return (app as any)(req, res);
}
