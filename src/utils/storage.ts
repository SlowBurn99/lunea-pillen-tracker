import type { AppState, CatNames } from '../types';
import { getTodayIso } from './date';

const STORAGE_KEY = 'lunea_pill_tracker_v1';

export const DEFAULT_CAT_NAMES: CatNames = {
  walker: 'Mimi',
  peek0: 'Lio',
  peek1: 'Nala',
  peek2: 'Cleo',
  peek3: 'Luna',
};

/**
 * Clean, empty initial state — no pre-filled pills, logs, or fake pack history.
 */
export function createInitialState(): AppState {
  const today = getTodayIso();

  return {
    profile: null,
    blister: {
      presetId: '21_7_pause',
      theme: 'classic_foil',
      brandName: '',
      pillType: 'combined',
      activePills: 21,
      placeboPills: 0,
      pauseDays: 7,
      columns: 7,
      shape: 'classic',
      arrowFlow: 'snake',
      activeColor: 'white',
      placeboColor: 'mint',
      packStartDate: today,
      showWeekdays: true,
      showArrows: true,
      showNumbers: true,
    },
    entries: {},
    dayLogs: {},
    alarm: {
      enabled: true,
      time: '20:00',
      extraTimes: [],
      snoozeMinutes: 15,
      repeatUntilTaken: true,
      toleranceHours: 12,
      discreetMode: 'standard',
      customMessage: '',
      soundId: 'harp',
      notifyOnPauseDays: false,
      pauseEndReminder: true,
      refillReminderEnabled: true,
      refillThresholdDays: 7,
    },
    settings: {
      soundEnabled: true,
      hapticsEnabled: true,
      pinEnabled: false,
      pinCode: '1234',
      packsInStock: 1,
      pressToPopMode: 'tap',
      catNames: { ...DEFAULT_CAT_NAMES },
      appColor: 'rose',
    },
    history: [],
  };
}

export function loadAppState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw) as Partial<AppState>;
    const fallback = createInitialState();
    return {
      profile: parsed.profile ?? null,
      blister: { ...fallback.blister, ...(parsed.blister || {}) },
      entries: parsed.entries || {},
      dayLogs: parsed.dayLogs || {},
      alarm: { ...fallback.alarm, ...(parsed.alarm || {}) },
      settings: {
        ...fallback.settings,
        ...(parsed.settings || {}),
        catNames: {
          ...DEFAULT_CAT_NAMES,
          ...(parsed.settings?.catNames || {}),
        },
      },
      history: parsed.history || [],
    };
  } catch {
    return createInitialState();
  }
}

export function saveAppState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage quota fallback
  }
}

export function clearAppStateStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}
