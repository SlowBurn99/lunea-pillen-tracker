import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { AlarmConfig, AlarmSoundId } from '../types';
import { DISCREET_MESSAGES } from '../data/presets';

export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

const SOUND_FILES: Record<AlarmSoundId, string> = {
  harp: 'alarm_harp.wav',
  chime: 'alarm_chime.wav',
  ping: 'alarm_ping.wav',
};

const CHANNEL_IDS: Record<AlarmSoundId, string> = {
  harp: 'pille-alarm-harp-v2',
  chime: 'pille-alarm-chime-v2',
  ping: 'pille-alarm-ping-v2',
};

export function getAlarmSoundFile(soundId: AlarmSoundId): string {
  return SOUND_FILES[soundId] || SOUND_FILES.harp;
}

export function getAlarmChannelId(soundId: AlarmSoundId): string {
  return CHANNEL_IDS[soundId] || CHANNEL_IDS.harp;
}

export function getAlarmNotificationText(alarm: AlarmConfig): { title: string; body: string } {
  if (alarm.discreetMode === 'custom' && alarm.customMessage.trim()) {
    return {
      title: 'Pille',
      body: alarm.customMessage.trim(),
    };
  }
  return DISCREET_MESSAGES[alarm.discreetMode] || DISCREET_MESSAGES.standard;
}

export function getWebNotificationPermission(): NotificationPermissionState {
  if (Capacitor.isNativePlatform()) return 'default';
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission as NotificationPermissionState;
}

/**
 * Real async permission check on BOTH iOS/Android (Capacitor) and Web.
 */
export async function checkNotificationPermission(): Promise<NotificationPermissionState> {
  if (Capacitor.isNativePlatform()) {
    try {
      const status = await LocalNotifications.checkPermissions();
      if (status.display === 'granted') return 'granted';
      if (status.display === 'denied') return 'denied';
      return 'default';
    } catch {
      return 'default';
    }
  }
  return getWebNotificationPermission();
}

/**
 * Creates high-importance Android notification channels with bundled WAV alarm sounds,
 * vibration, and public lockscreen visibility.
 */
export async function ensureAndroidAlarmChannels(): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') return;
  const defs: Array<{ id: string; name: string; sound: string }> = [
    { id: CHANNEL_IDS.harp, name: 'Pillenwecker (Harfe)', sound: SOUND_FILES.harp },
    { id: CHANNEL_IDS.chime, name: 'Pillenwecker (Glocke)', sound: SOUND_FILES.chime },
    { id: CHANNEL_IDS.ping, name: 'Pillenwecker (Ping)', sound: SOUND_FILES.ping },
  ];

  for (const ch of defs) {
    try {
      await LocalNotifications.createChannel({
        id: ch.id,
        name: ch.name,
        description: 'Wecker-Erinnerungen mit Ton auch im Sperrbildschirm',
        importance: 5, // IMPORTANCE_HIGH -> heads-up + lockscreen + sound
        visibility: 1, // VISIBILITY_PUBLIC -> visible on locked screen
        vibration: true,
        lights: true,
        lightColor: '#D94E6A',
        sound: ch.sound,
      });
    } catch {
      // Ignore if channel already exists
    }
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await LocalNotifications.requestPermissions();
      if (res.display === 'granted') {
        await ensureAndroidAlarmChannels();
        return 'granted';
      }
      return 'denied';
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
 * Schedules daily native iOS & Android alarms with real bundled WAV sounds,
 * lockscreen visibility, Doze-mode wake (`allowWhileIdle`), and automatic snooze backups.
 */
export async function syncNativeAlarms(alarm: AlarmConfig, isTodayTaken = false): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const perm = await checkNotificationPermission();
    if (perm !== 'granted') return;

    await ensureAndroidAlarmChannels();

    // Cancel previously scheduled regular & snooze alarms (keep test ID 9999 untouched)
    const pending = await LocalNotifications.getPending();
    const toCancel = pending.notifications.filter((n) => n.id !== 9999);
    if (toCancel.length > 0) {
      await LocalNotifications.cancel({ notifications: toCancel });
    }

    if (!alarm.enabled) return;

    const { title, body } = getAlarmNotificationText(alarm);
    const soundFile = getAlarmSoundFile(alarm.soundId);
    const channelId = getAlarmChannelId(alarm.soundId);
    const allTimes = [alarm.time, ...alarm.extraTimes].filter(Boolean);

    const notifications: Array<{
      id: number;
      title: string;
      body: string;
      sound: string;
      channelId: string;
      schedule:
        | { on: { hour: number; minute: number }; repeats: boolean; allowWhileIdle: boolean }
        | { at: Date; allowWhileIdle: boolean };
    }> = [];

    // 1. Daily repeating main + extra alarms (works when app is closed & phone locked!)
    allTimes.forEach((timeStr, idx) => {
      const [hour, minute] = timeStr.split(':').map(Number);
      notifications.push({
        id: 1001 + idx,
        title,
        body,
        sound: soundFile,
        channelId,
        schedule: {
          on: { hour: hour || 20, minute: minute || 0 },
          repeats: true,
          allowWhileIdle: true,
        },
      });
    });

    // 2. Native follow-up snooze reminders for today (if repeatUntilTaken & not taken yet)
    if (alarm.repeatUntilTaken && !isTodayTaken && alarm.snoozeMinutes > 0) {
      const [h, m] = alarm.time.split(':').map(Number);
      const baseDate = new Date();
      baseDate.setHours(h || 20, m || 0, 0, 0);
      const now = Date.now();

      for (let step = 1; step <= 3; step++) {
        const followUpMs = baseDate.getTime() + step * alarm.snoozeMinutes * 60 * 1000;
        if (followUpMs > now + 5000) {
          notifications.push({
            id: 2000 + step,
            title,
            body: `Erinnerung (${step}. Nachruf): ${body}`,
            sound: soundFile,
            channelId,
            schedule: {
              at: new Date(followUpMs),
              allowWhileIdle: true,
            },
          });
        }
      }
    }

    if (notifications.length > 0) {
      await LocalNotifications.schedule({ notifications });
    }
  } catch (err) {
    console.warn('Native alarm sync error:', err);
  }
}

/**
 * Schedules a one-shot native snooze alarm when user taps "Schlummern".
 */
export async function scheduleNativeSnooze(alarm: AlarmConfig): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const perm = await checkNotificationPermission();
    if (perm !== 'granted') return;
    await ensureAndroidAlarmChannels();
    const { title, body } = getAlarmNotificationText(alarm);
    await LocalNotifications.schedule({
      notifications: [
        {
          id: 3001,
          title,
          body,
          sound: getAlarmSoundFile(alarm.soundId),
          channelId: getAlarmChannelId(alarm.soundId),
          schedule: {
            at: new Date(Date.now() + alarm.snoozeMinutes * 60 * 1000),
            allowWhileIdle: true,
          },
        },
      ],
    });
  } catch {
    // Ignore
  }
}

/**
 * Schedules a real native OS lockscreen test notification in N seconds (default 5s),
 * so the user can lock their phone / close the app and verify sound + banner!
 */
export async function scheduleLockscreenTestNotification(
  alarm: AlarmConfig,
  delaySeconds = 5
): Promise<{ ok: boolean; reason?: string }> {
  const { title, body } = getAlarmNotificationText(alarm);

  if (Capacitor.isNativePlatform()) {
    let perm = await checkNotificationPermission();
    if (perm !== 'granted') {
      perm = await requestNotificationPermission();
    }
    if (perm !== 'granted') {
      return { ok: false, reason: 'Bitte erlaube Benachrichtigungen in den Handy-Einstellungen.' };
    }
    try {
      await ensureAndroidAlarmChannels();
      await LocalNotifications.schedule({
        notifications: [
          {
            id: 9999,
            title,
            body,
            sound: getAlarmSoundFile(alarm.soundId),
            channelId: getAlarmChannelId(alarm.soundId),
            schedule: {
              at: new Date(Date.now() + delaySeconds * 1000),
              allowWhileIdle: true,
            },
          },
        ],
      });
      return { ok: true };
    } catch {
      return { ok: false, reason: 'Test-Alarm konnte nicht geplant werden.' };
    }
  }

  // Browser fallback
  let perm = getWebNotificationPermission();
  if (perm === 'default') {
    perm = await requestNotificationPermission();
  }
  window.setTimeout(() => {
    fireBrowserNotification(title, body);
  }, delaySeconds * 1000);
  return { ok: true };
}

export function fireBrowserNotification(title: string, body: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/icon.png',
        badge: '/icon.png',
        tag: 'pille-alarm',
      });
    } catch {
      // Ignore if browser restricts direct Notification constructor
    }
  }
}
