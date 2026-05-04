import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vonixx.producao',
  appName: 'Diário de Bordo',
  webDir: 'dist',
  plugins: {
    CapacitorHttp: {
      enabled: false,
    },
  },
};

export default config;
