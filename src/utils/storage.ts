import type { AppState, DayLog, PillEntry } from '../types';
import { addDays, getTodayIso } from './date';

const STORAGE_KEY = 'lunea_pill_tracker_v1';

export function createInitialState(): AppState {
  const today = getTodayIso();
  // Start user comfortably on Day 10 of a 21+7 blister so 9 realistic torn cavities are already visible
  // and TODAY's pill (#10) is intact, gleaming, and ready to pop immediately!
  const packStartDate = addDays(today, -9);

  const entries: Record<string, PillEntry> = {};
  for (let i = 0; i < 9; i++) {
    const date = addDays(packStartDate, i);
    const isSlightlyLate = i === 4;
    const hour = isSlightlyLate ? '21' : '20';
    const min = isSlightlyLate ? '18' : String((i * 3) % 12).padStart(2, '0');
    entries[date] = {
      dayIndex: i,
      date,
      status: isSlightlyLate ? 'late' : 'taken',
      takenAt: `${date}T${hour}:${min}:00`,
      delayMinutes: isSlightlyLate ? 78 : (i * 3) % 12,
    };
  }

  // Add realistic withdrawal bleeding logs from the end of the previous cycle's pause
  const dayLogs: Record<string, DayLog> = {};
  const bleedDays: Array<{ offset: number; level: DayLog['bleeding']; symptoms: string[]; moods: string[] }> = [
    { offset: -13, level: 'light', symptoms: ['cramps'], moods: ['sensitive'] },
    { offset: -12, level: 'medium', symptoms: ['cramps', 'fatigue'], moods: ['calm'] },
    { offset: -11, level: 'medium', symptoms: ['headache'], moods: ['calm'] },
    { offset: -10, level: 'light', symptoms: [], moods: ['happy'] },
    { offset: -9, level: 'spotting', symptoms: [], moods: ['happy'] },
    { offset: -2, level: 'none', symptoms: ['fatigue'], moods: ['calm'] },
  ];

  for (const item of bleedDays) {
    const d = addDays(today, item.offset);
    dayLogs[d] = {
      date: d,
      bleeding: item.level,
      symptoms: item.symptoms,
      moods: item.moods,
      note: '',
    };
  }

  return {
    profile: null,
    blister: {
      presetId: '21_7_pause',
      theme: 'classic_foil',
      brandName: 'Maxim 21',
      pillType: 'combined',
      activePills: 21,
      placeboPills: 0,
      pauseDays: 7,
      columns: 7,
      shape: 'classic',
      arrowFlow: 'snake',
      activeColor: 'white',
      placeboColor: 'mint',
      packStartDate,
      showWeekdays: true,
      showArrows: true,
      showNumbers: true,
    },
    entries,
    dayLogs,
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
      packsInStock: 2,
      pressToPopMode: 'tap',
    },
    history: [
      {
        id: 'pack-prev-1',
        brandName: 'Maxim 21',
        startDate: addDays(packStartDate, -28),
        endDate: addDays(packStartDate, -1),
        totalPills: 21,
        takenCount: 20,
        lateCount: 1,
        missedCount: 0,
      },
      {
        id: 'pack-prev-2',
        brandName: 'Maxim 21',
        startDate: addDays(packStartDate, -56),
        endDate: addDays(packStartDate, -29),
        totalPills: 21,
        takenCount: 21,
        lateCount: 0,
        missedCount: 0,
      },
    ],
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
      entries: parsed.entries || fallback.entries,
      dayLogs: parsed.dayLogs || fallback.dayLogs,
      alarm: { ...fallback.alarm, ...(parsed.alarm || {}) },
      settings: { ...fallback.settings, ...(parsed.settings || {}) },
      history: parsed.history || fallback.history,
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
