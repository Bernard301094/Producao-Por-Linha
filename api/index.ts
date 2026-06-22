// This file is the Vercel serverless entry point.
// It must re-export the Express app from server.ts.
// @vercel/node handles TypeScript compilation automatically.
import app from '../server.js';

export default app;
