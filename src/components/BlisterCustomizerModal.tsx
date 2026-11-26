import React, { useState } from 'react';
import { X, Check, Minus, Plus, Calendar } from 'lucide-react';
import type { BlisterConfig, BlisterPresetId, PillColorKey } from '../types';
import { BLISTER_PRESETS, BLISTER_THEMES, PILL_COLORS } from '../data/presets';
import {
  WEEKDAYS_SHORT,
  addDays,
  diffDays,
  formatDateShort,
  getTodayIso,
  getWeekdayIndex,
} from '../utils/date';

interface BlisterCustomizerModalProps {
  config: BlisterConfig;
  onSave: (updated: BlisterConfig, markPreviousTaken: boolean) => void;
  onClose: () => void;
}

interface StepperRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  prefix?: string;
  unit?: string;
  onChange: (next: number) => void;
}

const StepperRow: React.FC<StepperRowProps> = ({
  label,
  value,
  min,
  max,
  prefix = '',
  unit = '',
  onChange,
}) => (
  <div className="flex items-center justify-between gap-3 py-1.5">
    <span className="text-xs font-semibold text-slate-700">{label}</span>
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-35 text-slate-800 flex items-center justify-center active:scale-95 transition"
        aria-label={`${label} verringern`}
      >
        <Minus className="w-4 h-4" />
      </button>
      <span className="w-20 text-center text-sm font-extrabold text-slate-900 tabular-nums">
        {prefix}
        {value}
        {unit}
      </span>
      <button
        type="button"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-35 text-slate-800 flex items-center justify-center active:scale-95 transition"
        aria-label={`${label} erhöhen`}
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  </div>
);

export const BlisterCustomizerModal: React.FC<BlisterCustomizerModalProps> = ({
  config,
  onSave,
  onClose,
}) => {
  const today = getTodayIso();
  const [draft, setDraft] = useState<BlisterConfig>({ ...config });
  const [markPreviousTaken, setMarkPreviousTaken] = useState(false);

  const totalPhysical = draft.activePills + draft.placeboPills;
  const totalCycle = Math.max(1, totalPhysical + draft.pauseDays);

  // Current pill day (1-based) computed from packStartDate relative to today
  const rawDayToday = diffDays(draft.packStartDate, today) + 1;
  const pillDayToday = Math.max(1, Math.min(totalCycle, rawDayToday));
  const startWeekdayIdx = getWeekdayIndex(draft.packStartDate);

  const setPillDayToday = (dayNum: number) => {
    const clamped = Math.max(1, Math.min(totalCycle, dayNum));
    const newStart = addDays(today, -(clamped - 1));
    setDraft((prev) => ({ ...prev, packStartDate: newStart }));
    if (clamped > 1) {
      setMarkPreviousTaken(true);
    }
  };

  // Pick start weekday (Mo=0 .. So=6) — shifts packStartDate to the most recent matching weekday <= today
  const setStartWeekday = (targetIdx: number) => {
    const todayIdx = getWeekdayIndex(today);
    const daysBack = (todayIdx - targetIdx + 7) % 7;
    const newStart = addDays(today, -daysBack);
    setDraft((prev) => ({ ...prev, packStartDate: newStart }));
    if (daysBack > 0) {
      setMarkPreviousTaken(true);
    }
  };

  const applyPreset = (presetId: BlisterPresetId) => {
    const meta = BLISTER_PRESETS.find((p) => p.id === presetId);
    if (!meta) return;
    setDraft((prev) => ({
      ...prev,
      presetId,
      ...meta.defaults,
    }));
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[88vh] app-bg rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-white/20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 bg-white border-b border-rose-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900">Blister anpassen</h2>
            <p className="text-[11px] text-slate-500">
              {totalPhysical} Pillen • {totalCycle} Tage Zyklus
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-4 space-y-4">
          {/* Starttag & Aktueller Pillentag */}
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200/70 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 app-accent-text" />
                Starttag & Pillentag
              </span>
              <span className="text-[11px] font-semibold text-slate-500">
                Start: {WEEKDAYS_SHORT[startWeekdayIdx]}, {formatDateShort(draft.packStartDate)}
              </span>
            </div>

            {/* Start-Wochentag Picker */}
            <div>
              <span className="block text-xs font-semibold text-slate-700 mb-1.5">
                Starttag (Wochentag von Pille #1)
              </span>
              <div className="grid grid-cols-7 gap-1">
                {WEEKDAYS_SHORT.map((day, idx) => {
                  const active = startWeekdayIdx === idx;
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setStartWeekday(idx)}
                      className={`py-2 rounded-xl text-xs font-bold border transition active:scale-95 ${
                        active
                          ? 'app-accent-bg text-white shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Aktueller Pillentag heute */}
            <div className="pt-1 border-t border-slate-100">
              <StepperRow
                label="Aktueller Pillentag heute"
                prefix="Tag "
                value={pillDayToday}
                min={1}
                max={totalCycle}
                onChange={setPillDayToday}
              />
            </div>

            {/* Exaktes Startdatum */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-700">Startdatum</span>
              <input
                type="date"
                value={draft.packStartDate}
                onChange={(e) => {
                  if (e.target.value) {
                    setDraft({ ...draft, packStartDate: e.target.value });
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none"
              />
            </div>

            {pillDayToday > 1 && (
              <label className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 cursor-pointer">
                <span className="text-xs font-medium text-slate-700">
                  Tage 1–{Math.min(pillDayToday - 1, totalPhysical)} als genommen markieren
                </span>
                <input
                  type="checkbox"
                  checked={markPreviousTaken}
                  onChange={(e) => setMarkPreviousTaken(e.target.checked)}
                  className="w-5 h-5 accent-[#D94E6A]"
                />
              </label>
            )}
          </div>

          {/* Design */}
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200/70">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Design
            </span>
            <div className="grid grid-cols-2 gap-2">
              {BLISTER_THEMES.map((theme) => {
                const active = (draft.theme || 'classic_foil') === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setDraft({ ...draft, theme: theme.id })}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs font-bold transition ${
                      active
                        ? 'app-accent-soft'
                        : 'bg-slate-50 text-slate-700 border-slate-200/80'
                    }`}
                  >
                    <span>{theme.name}</span>
                    {active && <Check className="w-3.5 h-3.5 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Schema Presets */}
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200/70">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Schema
            </span>
            <div className="grid grid-cols-2 gap-2">
              {BLISTER_PRESETS.map((preset) => {
                const active = draft.presetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset.id)}
                    className={`text-left px-3 py-2.5 rounded-xl border transition ${
                      active
                        ? 'app-accent-soft'
                        : 'bg-slate-50 border-slate-200/80 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{preset.name}</span>
                      {active && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional Custom Pill Name */}
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200/70">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Eigener Pillenname (optional)
            </label>
            <input
              type="text"
              value={draft.brandName}
              maxLength={24}
              onChange={(e) => setDraft({ ...draft, brandName: e.target.value })}
              placeholder="Leer lassen oder eigenen Namen eingeben"
              className="w-full text-sm font-semibold text-slate-900 bg-transparent focus:outline-none"
            />
          </div>

          {/* Safe Stepper Controls */}
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200/70 divide-y divide-slate-100">
            <StepperRow
              label="Wirkstoff-Pillen"
              value={draft.activePills}
              min={7}
              max={84}
              onChange={(v) => setDraft({ ...draft, presetId: 'custom', activePills: v })}
            />
            <StepperRow
              label="Placebo-Pillen"
              value={draft.placeboPills}
              min={0}
              max={10}
              onChange={(v) => setDraft({ ...draft, presetId: 'custom', placeboPills: v })}
            />
            <StepperRow
              label="Pausentage"
              value={draft.pauseDays}
              min={0}
              max={10}
              unit=" T"
              onChange={(v) => setDraft({ ...draft, presetId: 'custom', pauseDays: v })}
            />
            <div className="pt-2.5">
              <span className="block text-xs font-semibold text-slate-700 mb-2">
                Pillen pro Reihe
              </span>
              <div className="grid grid-cols-5 gap-1.5">
                {[3, 4, 5, 6, 7].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setDraft({ ...draft, columns: c })}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      draft.columns === c
                        ? 'app-accent-bg text-white'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Direction */}
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200/70">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Einnahmerichtung
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setDraft({ ...draft, arrowFlow: 'snake' })}
                className={`py-2 rounded-xl text-xs font-bold border transition ${
                  draft.arrowFlow === 'snake'
                    ? 'app-accent-soft'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                Schlangenlinie ↩
              </button>
              <button
                type="button"
                onClick={() => setDraft({ ...draft, arrowFlow: 'rows' })}
                className={`py-2 rounded-xl text-xs font-bold border transition ${
                  draft.arrowFlow === 'rows'
                    ? 'app-accent-soft'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                Zeilenweise →
              </button>
            </div>
          </div>

          {/* Pill Colors */}
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200/70 space-y-3">
            <div>
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Pillenfarbe
              </span>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(PILL_COLORS) as PillColorKey[]).map((key) => {
                  const item = PILL_COLORS[key];
                  const selected = draft.activeColor === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setDraft({ ...draft, activeColor: key })}
                      className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition ${
                        selected ? 'border-rose-500 scale-110 shadow-sm' : 'border-slate-200'
                      }`}
                      style={{ background: item.gradient }}
                      title={item.label}
                      aria-label={item.label}
                    >
                      {selected && <Check className="w-4 h-4 text-rose-600" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {draft.placeboPills > 0 && (
              <div>
                <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Placebo-Farbe
                </span>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(PILL_COLORS) as PillColorKey[]).map((key) => {
                    const item = PILL_COLORS[key];
                    const selected = draft.placeboColor === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setDraft({ ...draft, placeboColor: key })}
                        className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition ${
                          selected ? 'border-violet-500 scale-110 shadow-sm' : 'border-slate-200'
                        }`}
                        style={{ background: item.gradient }}
                        title={item.label}
                        aria-label={item.label}
                      >
                        {selected && <Check className="w-4 h-4 text-violet-700" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Display Toggles */}
          <div className="bg-white rounded-2xl p-3 border border-slate-200/70 flex flex-wrap gap-2">
            {[
              { key: 'showWeekdays' as const, label: 'Wochentage' },
              { key: 'showArrows' as const, label: 'Pfeile' },
              { key: 'showNumbers' as const, label: 'Nummern' },
            ].map((toggle) => (
              <button
                key={toggle.key}
                type="button"
                onClick={() => setDraft({ ...draft, [toggle.key]: !draft[toggle.key] })}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                  draft[toggle.key]
                    ? 'app-accent-soft'
                    : 'bg-slate-50 text-slate-500 border-slate-200'
                }`}
              >
                {draft[toggle.key] ? '✓ ' : ''}
                {toggle.label}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-rose-100 flex gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-700 text-sm font-bold"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={() => {
              onSave(draft, markPreviousTaken);
              onClose();
            }}
            className="flex-[2] py-3 rounded-2xl app-accent-bg text-white text-sm font-bold shadow-md active:scale-[0.98] transition"
          >
            Übernehmen
          </button>
        </div>
      </div>
    </div>
  );
};
