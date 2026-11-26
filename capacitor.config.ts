import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'de.lunea.pillentracker',
  appName: 'Lunea',
  webDir: 'dist',
  ios: {
    contentInset: 'never',
  },
  plugins: {
    LocalNotifications: {
      iconColor: '#D94E6A',
    },
  },
};

export default config;
