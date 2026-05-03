import * as esbuild from 'esbuild';

esbuild.build({
  entryPoints: ['server.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: 'dist/server.cjs',
  external: ['express', 'googleapis', 'google-auth-library'],
}).catch(() => process.exit(1));
