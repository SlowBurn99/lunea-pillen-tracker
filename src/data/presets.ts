import type {
  AppColorThemeId,
  BlisterConfig,
  BlisterPresetId,
  BlisterThemeId,
  PillColorKey,
} from '../types';

export interface AppColorThemeMeta {
  id: AppColorThemeId;
  name: string;
  swatch: string;
  bg: string;
  accent: string;
  isDark?: boolean;
}

export const APP_COLOR_THEMES: AppColorThemeMeta[] = [
  { id: 'rose', name: 'Rosé', swatch: '#D94E6A', bg: '#FAF6F5', accent: '#D94E6A' },
  { id: 'lavender', name: 'Lavendel', swatch: '#7C5CE6', bg: '#F7F5FC', accent: '#7C5CE6' },
  { id: 'sage', name: 'Salbei', swatch: '#2E8B6E', bg: '#F4F9F6', accent: '#2E8B6E' },
  { id: 'peach', name: 'Pfirsich', swatch: '#DF6C46', bg: '#FCF6F2', accent: '#DF6C46' },
  { id: 'sky', name: 'Himmel', swatch: '#3581C4', bg: '#F3F8FC', accent: '#3581C4' },
  { id: 'midnight', name: 'Nacht', swatch: '#2B2230', bg: '#16131A', accent: '#F06A8A', isDark: true },
];

export interface BlisterThemeMeta {
  id: BlisterThemeId;
  name: string;
  shortLabel: string;
  description: string;
  accent: string;
}

export const BLISTER_THEMES: BlisterThemeMeta[] = [
  {
    id: 'classic_foil',
    name: 'Alu Klassik',
    shortLabel: 'Klassik',
    description: 'Realistische Alufolie mit 3D-Kuppeln.',
    accent: '#64748b',
  },
  {
    id: 'cat_peek',
    name: 'Katzen-Versteck',
    shortLabel: 'Katzen',
    description: 'Nach dem Ausdrücken schaut ein Kätzchen heraus.',
    accent: '#ea580c',
  },
  {
    id: 'cat_bowl',
    name: 'Katzen-Napf',
    shortLabel: 'Napf',
    description: 'Deine Katze läuft zum Napf und frisst ihn leer.',
    accent: '#d94e6a',
  },
  {
    id: 'rosegold_bloom',
    name: 'Roségold',
    shortLabel: 'Roségold',
    description: 'Roségold-Folie mit kleinen Blüten.',
    accent: '#be185d',
  },
];

export interface BlisterPresetMeta {
  id: BlisterPresetId;
  name: string;
  shortLabel: string;
  examples: string;
  description: string;
  defaults: Partial<BlisterConfig>;
}

export const BLISTER_PRESETS: BlisterPresetMeta[] = [
  {
    id: '21_7_pause',
    name: '21 + 7 Pause',
    shortLabel: '21+7',
    examples: '21 Pillen, 7 Tage Pause',
    description: '21 Wirkstoffpillen + 7 Tage Pause.',
    defaults: {
      pillType: 'combined',
      activePills: 21,
      placeboPills: 0,
      pauseDays: 7,
      columns: 7,
      shape: 'classic',
      arrowFlow: 'snake',
      activeColor: 'white',
      placeboColor: 'mint',
    },
  },
  {
    id: '24_4_placebo',
    name: '24 + 4 Placebo',
    shortLabel: '24+4',
    examples: '24 Wirkstoff, 4 Placebos',
    description: '24 Wirkstoffpillen + 4 Placebos.',
    defaults: {
      pillType: 'combined',
      activePills: 24,
      placeboPills: 4,
      pauseDays: 0,
      columns: 7,
      shape: 'classic',
      arrowFlow: 'rows',
      activeColor: 'rose',
      placeboColor: 'white',
    },
  },
  {
    id: '21_7_placebo',
    name: '21 + 7 Placebo',
    shortLabel: '21+7P',
    examples: '21 Wirkstoff, 7 Placebos',
    description: '21 Wirkstoffpillen + 7 Placebos.',
    defaults: {
      pillType: 'combined',
      activePills: 21,
      placeboPills: 7,
      pauseDays: 0,
      columns: 7,
      shape: 'classic',
      arrowFlow: 'rows',
      activeColor: 'butter',
      placeboColor: 'white',
    },
  },
  {
    id: '28_mini',
    name: '28 Durchgehend',
    shortLabel: '28er',
    examples: '28 Pillen ohne Pause',
    description: '28 Wirkstoffpillen durchgehend.',
    defaults: {
      pillType: 'minipill',
      activePills: 28,
      placeboPills: 0,
      pauseDays: 0,
      columns: 7,
      shape: 'classic',
      arrowFlow: 'rows',
      activeColor: 'white',
      placeboColor: 'mint',
    },
  },
  {
    id: '84_7_long',
    name: '84 + 7 Langzyklus',
    shortLabel: '84+7',
    examples: '3 Monate + 7 Tage Pause',
    description: '84 Pillen + 7 Tage Pause.',
    defaults: {
      pillType: 'combined',
      activePills: 84,
      placeboPills: 0,
      pauseDays: 7,
      columns: 7,
      shape: 'compact',
      arrowFlow: 'rows',
      activeColor: 'peach',
      placeboColor: 'white',
    },
  },
  {
    id: 'custom',
    name: 'Eigene Größe',
    shortLabel: 'Eigene',
    examples: 'Frei einstellbar',
    description: 'Eigene Pillenzahl & Raster.',
    defaults: {},
  },
];

export interface PillColorStyle {
  key: PillColorKey;
  label: string;
  gradient: string;
  rim: string;
  swatch: string;
}

export const PILL_COLORS: Record<PillColorKey, PillColorStyle> = {
  white: {
    key: 'white',
    label: 'Perlweiß',
    gradient: 'radial-gradient(circle at 34% 28%, #ffffff 0%, #f5f6f8 48%, #d9dde5 88%, #b9c0cc 100%)',
    rim: '#cbd5e1',
    swatch: '#f8fafc',
  },
  rose: {
    key: 'rose',
    label: 'Zartrosa',
    gradient: 'radial-gradient(circle at 34% 28%, #fff1f4 0%, #fbcfe8 46%, #f497b6 86%, #d96b90 100%)',
    rim: '#f472b6',
    swatch: '#f9a8d4',
  },
  peach: {
    key: 'peach',
    label: 'Pfirsich',
    gradient: 'radial-gradient(circle at 34% 28%, #fff7ed 0%, #fed7aa 46%, #f8a96e 86%, #d97c41 100%)',
    rim: '#fb923c',
    swatch: '#fdba74',
  },
  butter: {
    key: 'butter',
    label: 'Pastellgelb',
    gradient: 'radial-gradient(circle at 34% 28%, #fefce8 0%, #fef08a 46%, #ebd252 86%, #c8ad2d 100%)',
    rim: '#eab308',
    swatch: '#fde047',
  },
  sky: {
    key: 'sky',
    label: 'Eisblau',
    gradient: 'radial-gradient(circle at 34% 28%, #f0f9ff 0%, #bae6fd 46%, #7cc4ea 86%, #4d9bc7 100%)',
    rim: '#38bdf8',
    swatch: '#7dd3fc',
  },
  mint: {
    key: 'mint',
    label: 'Mintgrün',
    gradient: 'radial-gradient(circle at 34% 28%, #ecfdf5 0%, #a7f3d0 46%, #68cfa4 86%, #3ea67d 100%)',
    rim: '#34d399',
    swatch: '#6ee7b7',
  },
  lavender: {
    key: 'lavender',
    label: 'Lavendel',
    gradient: 'radial-gradient(circle at 34% 28%, #f5f3ff 0%, #ddd6fe 46%, #b39ef0 86%, #8970cf 100%)',
    rim: '#a78bfa',
    swatch: '#c4b5fd',
  },
};

export const SYMPTOM_OPTIONS = [
  { id: 'cramps', label: 'Krämpfe', emoji: '😣' },
  { id: 'headache', label: 'Kopfschmerzen', emoji: '🤕' },
  { id: 'fatigue', label: 'Müdigkeit', emoji: '😴' },
  { id: 'breast', label: 'Brustspannen', emoji: '💗' },
  { id: 'nausea', label: 'Übelkeit', emoji: '🤢' },
  { id: 'acne', label: 'Hautunreinheiten', emoji: '✨' },
  { id: 'backpain', label: 'Rückenschmerzen', emoji: '⚡' },
  { id: 'bloating', label: 'Blähungen', emoji: '🎈' },
  { id: 'cravings', label: 'Heißhunger', emoji: '🍫' },
];

export const MOOD_OPTIONS = [
  { id: 'happy', label: 'Glücklich', emoji: '😊' },
  { id: 'calm', label: 'Ausgeglichen', emoji: '😌' },
  { id: 'energetic', label: 'Energiegeladen', emoji: '🌟' },
  { id: 'sensitive', label: 'Sensibel', emoji: '🥺' },
  { id: 'stressed', label: 'Gestresst', emoji: '😰' },
  { id: 'irritable', label: 'Reizbar', emoji: '😤' },
  { id: 'sad', label: 'Traurig', emoji: '😢' },
];

export const BLEEDING_OPTIONS = [
  { id: 'none', label: 'Keine', drops: 0, color: '#e2e8f0' },
  { id: 'spotting', label: 'Schmierblutung', drops: 1, color: '#fda4af' },
  { id: 'light', label: 'Leicht', drops: 2, color: '#fb7185' },
  { id: 'medium', label: 'Mittel', drops: 3, color: '#e11d48' },
  { id: 'heavy', label: 'Stark', drops: 4, color: '#9f1239' },
] as const;

export const DISCREET_MESSAGES: Record<string, { title: string; body: string }> = {
  standard: {
    title: 'Zeit für deine Pille 💊',
    body: 'Drücke jetzt deine heutige Pille aus dem Blister.',
  },
  routine: {
    title: 'Tägliche Routine ✨',
    body: 'Kurze Erinnerung an deinen täglichen Check-in.',
  },
  water: {
    title: 'Wasser trinken 💧',
    body: 'Vergiss dein tägliches Glas Wasser nicht.',
  },
};

export const TIMEZONES = [
  { label: 'Deutschland / Österreich / Schweiz (CET/CEST)', offset: 1 },
  { label: 'London / Portugal (GMT)', offset: 0 },
  { label: 'Griechenland / Türkei / Ägypten (EET)', offset: 2 },
  { label: 'Dubai / VAE (GST)', offset: 4 },
  { label: 'Thailand / Vietnam (ICT)', offset: 7 },
  { label: 'Japan / Südkorea (JST)', offset: 9 },
  { label: 'Australien Sydney (AEDT)', offset: 11 },
  { label: 'New York / Miami (EST)', offset: -5 },
  { label: 'Los Angeles / Kalifornien (PST)', offset: -8 },
  { label: 'Mexiko-Stadt / Cancun (CST)', offset: -6 },
];
