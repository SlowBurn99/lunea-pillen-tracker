import React, { useState } from 'react';
import { X, Check, Sparkles, Grid, CircleDot, ArrowRightLeft, Palette } from 'lucide-react';
import type { BlisterConfig, BlisterPresetId, PillColorKey } from '../types';
import { BLISTER_PRESETS, BLISTER_THEMES, PILL_COLORS } from '../data/presets';

interface BlisterCustomizerModalProps {
  config: BlisterConfig;
  onSave: (updated: BlisterConfig) => void;
  onClose: () => void;
}

export const BlisterCustomizerModal: React.FC<BlisterCustomizerModalProps> = ({
  config,
  onSave,
  onClose,
}) => {
  const [draft, setDraft] = useState<BlisterConfig>({ ...config });

  const applyPreset = (presetId: BlisterPresetId) => {
    const meta = BLISTER_PRESETS.find((p) => p.id === presetId);
    if (!meta) return;
    setDraft((prev) => ({
      ...prev,
      presetId,
      ...meta.defaults,
    }));
  };

  const totalPhysical = draft.activePills + draft.placeboPills;
  const totalCycle = totalPhysical + draft.pauseDays;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] bg-[#FAF6F5] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-white border-b border-rose-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-rose-500" />
              Blister-Größe & Design anpassen
            </h2>
            <p className="text-xs text-slate-500">
              {totalPhysical} Pillen im Blister • {totalCycle} Tage Zyklus
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-5 space-y-5">
          {/* Blister Design Themes */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              <Palette className="w-3.5 h-3.5 text-rose-500" />
              Blister-Design & Stil
            </label>
            <div className="grid grid-cols-2 gap-2">
              {BLISTER_THEMES.map((theme) => {
                const active = (draft.theme || 'classic_foil') === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setDraft({ ...draft, theme: theme.id })}
                    className={`text-left p-3 rounded-2xl border transition ${
                      active
                        ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-200/70'
                        : 'bg-white border-slate-200/80 hover:border-rose-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{theme.name}</span>
                      {active && <Check className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">{theme.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Presets */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Gängige Pillen-Schemata (Marken-Vorlagen)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {BLISTER_PRESETS.map((preset) => {
                const active = draft.presetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset.id)}
                    className={`text-left p-3 rounded-2xl border transition ${
                      active
                        ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-200/70'
                        : 'bg-white border-slate-200/80 hover:border-rose-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{preset.name}</span>
                      {active && <Check className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">{preset.examples}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Brand & Start Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl p-3 border border-slate-200/70">
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Markenname / Aufdruck
              </label>
              <input
                type="text"
                value={draft.brandName}
                onChange={(e) => setDraft({ ...draft, brandName: e.target.value })}
                placeholder="z. B. Maxim, Slinda..."
                className="w-full text-sm font-semibold text-slate-900 bg-transparent focus:outline-none"
              />
            </div>
            <div className="bg-white rounded-2xl p-3 border border-slate-200/70">
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Startdatum (Pille #1)
              </label>
              <input
                type="date"
                value={draft.packStartDate}
                onChange={(e) => setDraft({ ...draft, packStartDate: e.target.value })}
                className="w-full text-sm font-semibold text-slate-900 bg-transparent focus:outline-none"
              />
            </div>
          </div>

          {/* Custom Pill Counts Sliders */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/70 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Grid className="w-3.5 h-3.5 text-rose-500" />
                Individuelle Blister-Größe
              </span>
              <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                {draft.activePills} + {draft.placeboPills} Placebo / {draft.pauseDays} Pause
              </span>
            </div>

            {/* Active Pills */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600 font-medium">Wirkstoff-Pillen im Blister</span>
                <span className="font-bold text-slate-900">{draft.activePills} Pillen</span>
              </div>
              <input
                type="range"
                min={7}
                max={84}
                step={1}
                value={draft.activePills}
                onChange={(e) =>
                  setDraft({ ...draft, presetId: 'custom', activePills: Number(e.target.value) })
                }
                className="w-full accent-[#D94E6A]"
              />
            </div>

            {/* Placebo Pills */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600 font-medium">Placebo-Pillen im Blister</span>
                <span className="font-bold text-slate-900">{draft.placeboPills} Pillen</span>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                step={1}
                value={draft.placeboPills}
                onChange={(e) =>
                  setDraft({ ...draft, presetId: 'custom', placeboPills: Number(e.target.value) })
                }
                className="w-full accent-violet-500"
              />
            </div>

            {/* Pause Days */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600 font-medium">Pillenfreie Pausentage danach</span>
                <span className="font-bold text-slate-900">{draft.pauseDays} Tage</span>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                step={1}
                value={draft.pauseDays}
                onChange={(e) =>
                  setDraft({ ...draft, presetId: 'custom', pauseDays: Number(e.target.value) })
                }
                className="w-full accent-rose-400"
              />
            </div>

            {/* Columns per Row */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-600 font-medium">Pillen pro Reihe (Spalten)</span>
                <span className="font-bold text-slate-900">{draft.columns} Spalten</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {[3, 4, 5, 6, 7].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setDraft({ ...draft, columns: c })}
                    className={`py-1.5 rounded-xl text-xs font-bold border transition ${
                      draft.columns === c
                        ? 'bg-[#D94E6A] text-white border-[#D94E6A]'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Blister Form & Arrow Flow */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl p-3.5 border border-slate-200/70">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-2">
                <CircleDot className="w-3.5 h-3.5 text-rose-500" />
                Blister-Form
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { id: 'classic', label: 'Klassisch' },
                    { id: 'compact', label: 'Kompakt' },
                    { id: 'oval', label: 'Rund/Oval' },
                  ] as const
                ).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setDraft({ ...draft, shape: s.id })}
                    className={`py-2 px-1 rounded-xl text-[11px] font-bold border transition ${
                      draft.shape === s.id
                        ? 'bg-rose-50 text-rose-700 border-rose-400'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-3.5 border border-slate-200/70">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-2">
                <ArrowRightLeft className="w-3.5 h-3.5 text-rose-500" />
                Einnahmerichtung
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setDraft({ ...draft, arrowFlow: 'snake' })}
                  className={`py-2 px-2 rounded-xl text-[11px] font-bold border transition ${
                    draft.arrowFlow === 'snake'
                      ? 'bg-rose-50 text-rose-700 border-rose-400'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  Schlangenlinie ↩
                </button>
                <button
                  type="button"
                  onClick={() => setDraft({ ...draft, arrowFlow: 'rows' })}
                  className={`py-2 px-2 rounded-xl text-[11px] font-bold border transition ${
                    draft.arrowFlow === 'rows'
                      ? 'bg-rose-50 text-rose-700 border-rose-400'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  Zeilenweise →
                </button>
              </div>
            </div>
          </div>

          {/* Pill Colors */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/70 space-y-3">
            <div>
              <span className="block text-xs font-bold text-slate-800 mb-2">
                Farbe der Wirkstoff-Pillen
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
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs font-medium transition ${
                        selected
                          ? 'border-rose-500 bg-rose-50 text-rose-900 font-bold'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      <span
                        className="w-4 h-4 rounded-full border border-slate-300 shadow-xs"
                        style={{ background: item.gradient }}
                      />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {draft.placeboPills > 0 && (
              <div>
                <span className="block text-xs font-bold text-slate-800 mb-2">
                  Farbe der Placebo-Pillen
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
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs font-medium transition ${
                          selected
                            ? 'border-violet-500 bg-violet-50 text-violet-900 font-bold'
                            : 'border-slate-200 bg-white text-slate-600'
                        }`}
                      >
                        <span
                          className="w-4 h-4 rounded-full border border-slate-300 shadow-xs"
                          style={{ background: item.gradient }}
                        />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Display Toggles */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/70 flex flex-wrap gap-2">
            {[
              { key: 'showWeekdays' as const, label: 'Wochentage (Mo–So)' },
              { key: 'showArrows' as const, label: 'Einnahmepfeile' },
              { key: 'showNumbers' as const, label: 'Nummern (1–28)' },
            ].map((toggle) => (
              <button
                key={toggle.key}
                type="button"
                onClick={() => setDraft({ ...draft, [toggle.key]: !draft[toggle.key] })}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                  draft[toggle.key]
                    ? 'bg-rose-50 text-rose-700 border-rose-300'
                    : 'bg-slate-50 text-slate-500 border-slate-200'
                }`}
              >
                {draft[toggle.key] ? '✓ ' : ''}
                {toggle.label}
              </button>
            ))}
          </div>
        </div>

        {/* Footer Save */}
        <div className="p-4 bg-white border-t border-rose-100 flex gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-700 text-sm font-bold hover:bg-slate-200 transition"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={() => {
              onSave(draft);
              onClose();
            }}
            className="flex-[2] py-3 rounded-2xl bg-[#D94E6A] text-white text-sm font-bold shadow-md hover:bg-[#c23b57] active:scale-[0.98] transition"
          >
            Blister übernehmen
          </button>
        </div>
      </div>
    </div>
  );
};
