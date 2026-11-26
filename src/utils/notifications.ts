import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { AlarmConfig } from '../types';
import { DISCREET_MESSAGES } from '../data/presets';

export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

export function getAlarmNotificationText(alarm: AlarmConfig): { title: string; body: string } {
  if (alarm.discreetMode === 'custom' && alarm.customMessage.trim()) {
    return {
      title: 'Pille Erinnerung',
      body: alarm.customMessage.trim(),
    };
  }
  return DISCREET_MESSAGES[alarm.discreetMode] || DISCREET_MESSAGES.standard;
}

export function getWebNotificationPermission(): NotificationPermissionState {
  if (Capacitor.isNativePlatform()) return 'granted';
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission as NotificationPermissionState;
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await LocalNotifications.requestPermissions();
      return res.display === 'granted' ? 'granted' : 'denied';
    } catch {
      return 'denied';
    }
  }

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  const result = await Notification.requestPermission();
  return result as NotificationPermissionState;
}

/**
 * Schedules daily native iOS/Android alarms via Capacitor LocalNotifications.
 * On the Web, browser notifications are triggered by the active React timer hook.
 */
export async function syncNativeAlarms(alarm: AlarmConfig): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications });
    }
    if (!alarm.enabled) return;

    const { title, body } = getAlarmNotificationText(alarm);
    const allTimes = [alarm.time, ...alarm.extraTimes].filter(Boolean);

    const notifications = allTimes.map((timeStr, idx) => {
      const [hour, minute] = timeStr.split(':').map(Number);
      return {
        id: 1001 + idx,
        title,
        body,
        schedule: {
          on: { hour: hour || 20, minute: minute || 0 },
          repeats: true,
          allowWhileIdle: true,
        },
        sound: 'default',
        actionTypeId: 'PILL_REMINDER',
      };
    });

    await LocalNotifications.schedule({ notifications });
  } catch (err) {
    console.warn('Capacitor LocalNotifications sync skipped:', err);
  }
}

export function fireBrowserNotification(title: string, body: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/icon.svg',
        badge: '/icon.svg',
        tag: 'lunea-pill-alarm',
      });
    } catch {
      // Ignore if browser restricts direct Notification constructor
    }
  }
}
