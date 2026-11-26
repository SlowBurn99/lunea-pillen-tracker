export const WEEKDAYS_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
export const WEEKDAYS_FULL = [
  'Montag',
  'Dienstag',
  'Mittwoch',
  'Donnerstag',
  'Freitag',
  'Samstag',
  'Sonntag',
];
export const MONTHS_DE = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
];

export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function fromIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}

export function addDays(iso: string, days: number): string {
  const d = fromIsoDate(iso);
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

export function diffDays(fromIso: string, toIso: string): number {
  const a = fromIsoDate(fromIso);
  const b = fromIsoDate(toIso);
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export function getTodayIso(): string {
  return toIsoDate(new Date());
}

/** Monday = 0, Sunday = 6 */
export function getWeekdayIndex(iso: string): number {
  const day = fromIsoDate(iso).getDay();
  return (day + 6) % 7;
}

export function getWeekdayShort(iso: string): string {
  return WEEKDAYS_SHORT[getWeekdayIndex(iso)];
}

export function formatDateGerman(iso: string): string {
  const d = fromIsoDate(iso);
  return `${d.getDate()}. ${MONTHS_DE[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateShort(iso: string): string {
  const d = fromIsoDate(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.`;
}

export function formatTimeFromIso(isoTimestamp?: string): string {
  if (!isoTimestamp) return '–';
  const d = new Date(isoTimestamp);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} Uhr`;
}

/** Returns minutes until next alarm occurrence (HH:mm) from now */
export function getTimeUntilAlarm(timeStr: string): {
  hours: number;
  minutes: number;
  seconds: number;
  isPastToday: boolean;
  minutesDeltaToday: number; // positive = past scheduled time today, negative = before
} {
  const [h, m] = timeStr.split(':').map(Number);
  const now = new Date();
  const targetToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    h || 0,
    m || 0,
    0,
    0
  );
  const diffMsToday = now.getTime() - targetToday.getTime();
  const isPastToday = diffMsToday > 0;

  let nextTarget = targetToday;
  if (isPastToday) {
    nextTarget = new Date(targetToday.getTime() + 24 * 60 * 60 * 1000);
  }
  const remainingSec = Math.max(0, Math.floor((nextTarget.getTime() - now.getTime()) / 1000));
  const hours = Math.floor(remainingSec / 3600);
  const minutes = Math.floor((remainingSec % 3600) / 60);
  const seconds = remainingSec % 60;

  return {
    hours,
    minutes,
    seconds,
    isPastToday,
    minutesDeltaToday: Math.round(diffMsToday / 60000),
  };
}
