import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vonixx.producao',
  appName: 'Produção Por Linha',
  webDir: 'dist',
  plugins: {
    CapacitorHttp: {
      enabled: false,
    },
  },
};

export default config;
