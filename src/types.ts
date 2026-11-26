export type TabId = 'blister' | 'calendar' | 'alarm' | 'insights' | 'settings';

export type PillType = 'combined' | 'minipill';

export type BlisterPresetId =
  | '21_7_pause'
  | '24_4_placebo'
  | '21_7_placebo'
  | '28_mini'
  | '84_7_long'
  | 'custom';

export type BlisterShape = 'classic' | 'compact' | 'oval';

export type BlisterThemeId = 'classic_foil' | 'cat_peek' | 'cat_bowl' | 'rosegold_bloom';

export type ArrowFlow = 'rows' | 'snake';

export type PillColorKey = 'white' | 'rose' | 'peach' | 'butter' | 'sky' | 'mint' | 'lavender';

export interface BlisterConfig {
  presetId: BlisterPresetId;
  theme: BlisterThemeId;
  brandName: string;
  pillType: PillType;
  activePills: number; // e.g., 21, 24, 28, 84
  placeboPills: number; // physical placebo pills inside blister (0, 4, 7)
  pauseDays: number; // pill-free break days after blister (0 or 7)
  columns: number; // pills per row (3..7)
  shape: BlisterShape;
  arrowFlow: ArrowFlow;
  activeColor: PillColorKey;
  placeboColor: PillColorKey;
  packStartDate: string; // YYYY-MM-DD (Day 1 of current cycle/blister)
  showWeekdays: boolean;
  showArrows: boolean;
  showNumbers: boolean;
}

export type PillStatus = 'pending' | 'taken' | 'late' | 'missed' | 'skipped';

export interface PillEntry {
  dayIndex: number; // 0-based index within the blister (0 .. totalPhysicalPills - 1)
  date: string; // YYYY-MM-DD
  status: PillStatus;
  takenAt?: string; // ISO timestamp
  delayMinutes?: number;
  note?: string;
}

export type BleedingLevel = 'none' | 'spotting' | 'light' | 'medium' | 'heavy';

export interface DayLog {
  date: string; // YYYY-MM-DD
  bleeding: BleedingLevel;
  symptoms: string[];
  moods: string[];
  vomitingOrDiarrhea?: boolean;
  antibiotics?: boolean;
  unprotectedSex?: boolean;
  note: string;
}

export type AlarmSoundId = 'harp' | 'chime' | 'ping';

export type DiscreetMode = 'standard' | 'routine' | 'water' | 'custom';

export interface AlarmConfig {
  enabled: boolean;
  time: string; // HH:mm
  extraTimes: string[]; // optional secondary alarm times
  snoozeMinutes: number; // 5, 10, 15, 30, 60
  repeatUntilTaken: boolean;
  toleranceHours: number; // 12 for combined, 3 for classic minipill
  discreetMode: DiscreetMode;
  customMessage: string;
  soundId: AlarmSoundId;
  notifyOnPauseDays: boolean;
  pauseEndReminder: boolean;
  refillReminderEnabled: boolean;
  refillThresholdDays: number;
}

export interface AppSettings {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  pinEnabled: boolean;
  pinCode: string;
  packsInStock: number;
  pressToPopMode: 'tap' | 'hold';
}

export interface ArchivedPack {
  id: string;
  brandName: string;
  startDate: string;
  endDate: string;
  totalPills: number;
  takenCount: number;
  lateCount: number;
  missedCount: number;
}

export type AvatarId = 'cat0' | 'cat1' | 'cat2' | 'cat3' | 'moon' | 'flower';

export interface UserProfile {
  name: string; // required
  age?: number;
  avatar: AvatarId;
  pillSince?: string; // YYYY-MM-DD
  cycleLength?: number; // natural cycle length before pill (optional info)
  doctor?: string; // gynecologist name / practice
  notes?: string;
  createdAt: string;
}

export interface AppState {
  profile: UserProfile | null;
  blister: BlisterConfig;
  entries: Record<string, PillEntry>; // keyed by YYYY-MM-DD
  dayLogs: Record<string, DayLog>; // keyed by YYYY-MM-DD
  alarm: AlarmConfig;
  settings: AppSettings;
  history: ArchivedPack[];
}
