import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.regasco.ordering',
  appName: 'Regasco Mindanao Ave.',
  webDir: 'out',
  server: {
    // When building as a live-sync hybrid APK connected to your Vercel deployment:
    // url: 'https://regasco.vercel.app',
    androidScheme: 'https',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#FF5A00',
  },
};

export default config;
