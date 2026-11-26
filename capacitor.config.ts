import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'de.pille.tracker',
  appName: 'Pille',
  webDir: 'dist',
  ios: {
    contentInset: 'never',
  },
  plugins: {
    LocalNotifications: {
      iconColor: '#D94E6A',
      sound: 'alarm_harp.wav',
    },
  },
};

export default config;
