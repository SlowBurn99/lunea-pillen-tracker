import React, { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Droplets,
  Check,
  AlertTriangle,
  Plus,
  HeartPulse,
  StickyNote,
  ShieldAlert,
  X,
} from 'lucide-react';
import type { BleedingLevel, BlisterConfig, DayLog, PillEntry } from '../types';
import { BLEEDING_OPTIONS, MOOD_OPTIONS, SYMPTOM_OPTIONS } from '../data/presets';
import {
  MONTHS_DE,
  WEEKDAYS_SHORT,
  diffDays,
  formatDateGerman,
  getTodayIso,
  toIsoDate,
} from '../utils/date';

interface CalendarViewProps {
  blister: BlisterConfig;
  entries: Record<string, PillEntry>;
  dayLogs: Record<string, DayLog>;
  onSaveDayLog: (log: DayLog) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  blister,
  entries,
  dayLogs,
  onSaveDayLog,
}) => {
  const todayIso = getTodayIso();
  const todayDate = new Date();
  const [viewYear, setViewYear] = useState(todayDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(todayDate.getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);
  const [editorOpen, setEditorOpen] = useState(false);

  const totalPhysical = blister.activePills + blister.placeboPills;
  const totalCycle = Math.max(1, totalPhysical + blister.pauseDays);

  // Determine cycle phase for any calendar date (including future predictions!)
  const getPredictedPhase = (iso: string): 'active' | 'placebo' | 'pause' | 'predicted_bleed' => {
    const delta = diffDays(blister.packStartDate, iso);
    const mod = ((delta % totalCycle) + totalCycle) % totalCycle;
    if (mod >= totalPhysical) {
      // Withdrawal bleeding usually occurs days 2..5 of pause
      const pauseDay = mod - totalPhysical;
      if (pauseDay >= 1 && pauseDay <= 4) return 'predicted_bleed';
      return 'pause';
    }
    if (mod >= blister.activePills) {
      const placeboDay = mod - blister.activePills;
      if (placeboDay >= 1 && placeboDay <= 3) return 'predicted_bleed';
      return 'placebo';
    }
    return 'active';
  };

  const calendarCells = useMemo(() => {
    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const startWeekday = (firstOfMonth.getDay() + 6) % 7; // Mon=0
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const cells: Array<{ iso: string | null; dayNum?: number }> = [];
    for (let i = 0; i < startWeekday; i++) {
      cells.push({ iso: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = toIsoDate(new Date(viewYear, viewMonth, d));
      cells.push({ iso, dayNum: d });
    }
    return cells;
  }, [viewYear, viewMonth]);

  const currentLog: DayLog = dayLogs[selectedDate] || {
    date: selectedDate,
    bleeding: 'none',
    symptoms: [],
    moods: [],
    note: '',
  };

  const updateCurrentLog = (patch: Partial<DayLog>) => {
    onSaveDayLog({
      ...currentLog,
      ...patch,
      date: selectedDate,
    });
  };

  const toggleTag = (field: 'symptoms' | 'moods', id: string) => {
    const existing = currentLog[field];
    const next = existing.includes(id)
      ? existing.filter((x) => x !== id)
      : [...existing, id];
    updateCurrentLog({ [field]: next });
  };

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const selectedEntry = entries[selectedDate];
  const selectedPhase = getPredictedPhase(selectedDate);

  return (
    <div className="space-y-4">
      {/* Month Card */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-rose-100/80">
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={prevMonth}
            className="p-2 rounded-xl bg-rose-50/70 hover:bg-rose-100 text-rose-800 transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-center">
            <h2 className="text-base font-bold text-slate-900">
              {MONTHS_DE[viewMonth]} {viewYear}
            </h2>
            <button
              type="button"
              onClick={() => {
                setViewYear(todayDate.getFullYear());
                setViewMonth(todayDate.getMonth());
                setSelectedDate(todayIso);
              }}
              className="text-[11px] font-semibold text-rose-500 hover:underline"
            >
              Zu Heute springen
            </button>
          </div>
          <button
            type="button"
            onClick={nextMonth}
            className="p-2 rounded-xl bg-rose-50/70 hover:bg-rose-100 text-rose-800 transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {WEEKDAYS_SHORT.map((w) => (
            <div key={w} className="text-center text-[11px] font-bold text-slate-400">
              {w}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {calendarCells.map((cell, idx) => {
            if (!cell.iso) {
              return <div key={`empty-${idx}`} className="h-11" />;
            }
            const iso = cell.iso;
            const entry = entries[iso];
            const log = dayLogs[iso];
            const phase = getPredictedPhase(iso);
            const isToday = iso === todayIso;
            const isSelected = iso === selectedDate;
            const hasBleeding = log && log.bleeding !== 'none';
            const isPredictedBleed = iso > todayIso && phase === 'predicted_bleed' && !hasBleeding;
            const isPauseOrPlacebo = phase === 'pause' || phase === 'placebo';
            const hasSymptoms = log && (log.symptoms.length > 0 || log.moods.length > 0 || Boolean(log.note));

            return (
              <button
                key={iso}
                type="button"
                onClick={() => setSelectedDate(iso)}
                className={`relative h-11 rounded-2xl flex flex-col items-center justify-center transition ${
                  isSelected
                    ? 'bg-[#D94E6A] text-white shadow-sm ring-2 ring-rose-300'
                    : hasBleeding
                    ? 'bg-rose-100 text-rose-900 border border-rose-300/80'
                    : isPredictedBleed
                    ? 'bg-rose-50/70 text-rose-700 border border-dashed border-rose-300'
                    : isPauseOrPlacebo
                    ? 'bg-violet-50/80 text-violet-900 border border-violet-100'
                    : isToday
                    ? 'bg-rose-50 text-rose-800 font-bold border border-rose-300'
                    : 'bg-slate-50/60 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className={`text-xs ${isToday || isSelected ? 'font-bold' : 'font-medium'}`}>
                  {cell.dayNum}
                </span>

                {/* Indicators Row */}
                <div className="flex items-center gap-0.5 mt-0.5">
                  {entry?.status === 'taken' && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSelected ? 'bg-white' : 'bg-emerald-500'
                      }`}
                    />
                  )}
                  {entry?.status === 'late' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  )}
                  {entry?.status === 'missed' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  )}
                  {hasBleeding && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSelected ? 'bg-rose-200' : 'bg-rose-600'
                      }`}
                    />
                  )}
                  {hasSymptoms && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSelected ? 'bg-amber-200' : 'bg-indigo-400'
                      }`}
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-x-3 gap-y-1.5 text-[10px] text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Pille genommen
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400" /> Verspätet
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500" /> Periode / Blutung
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-rose-50 border border-dashed border-rose-400" /> Prognose
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-violet-100" /> Pause / Placebo
          </span>
        </div>
      </div>

      {/* Selected Day Summary Card */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-rose-100/80 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-rose-500">
              Tagesprotokoll
            </p>
            <h3 className="text-base font-bold text-slate-900">{formatDateGerman(selectedDate)}</h3>
          </div>
          <button
            type="button"
            onClick={() => setEditorOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#D94E6A] text-white text-xs font-bold shadow-xs hover:bg-[#c23b57] active:scale-95 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Eintragen
          </button>
        </div>

        {/* Pill & Cycle Phase Status Row */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-slate-50 p-3 border border-slate-100">
            <span className="text-[10px] font-semibold text-slate-400 uppercase">Pille</span>
            <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-slate-800">
              {selectedEntry?.status === 'taken' ? (
                <>
                  <Check className="w-4 h-4 text-emerald-500" /> Pünktlich genommen
                </>
              ) : selectedEntry?.status === 'late' ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-500" /> Verspätet genommen
                </>
              ) : selectedEntry?.status === 'missed' ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-red-500" /> Vergessen
                </>
              ) : selectedPhase === 'pause' || selectedPhase === 'predicted_bleed' ? (
                <span className="text-violet-700">Einnahmepause / Blutung</span>
              ) : (
                <span className="text-slate-500">Noch offen</span>
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-rose-50/60 p-3 border border-rose-100">
            <span className="text-[10px] font-semibold text-rose-400 uppercase">Blutung</span>
            <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-rose-900">
              <Droplets className="w-4 h-4 text-rose-500" />
              {BLEEDING_OPTIONS.find((b) => b.id === currentLog.bleeding)?.label || 'Keine'}
            </div>
          </div>
        </div>

        {/* Logged Symptoms / Moods / Alerts */}
        {(currentLog.symptoms.length > 0 ||
          currentLog.moods.length > 0 ||
          currentLog.vomitingOrDiarrhea ||
          currentLog.antibiotics ||
          currentLog.note) && (
          <div className="space-y-2 pt-1">
            {(currentLog.vomitingOrDiarrhea || currentLog.antibiotics) && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 flex items-center gap-2 text-xs text-amber-900 font-medium">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Schutz-Hinweis:{' '}
                  {[
                    currentLog.vomitingOrDiarrhea && 'Erbrechen/Durchfall',
                    currentLog.antibiotics && 'Antibiotika',
                  ]
                    .filter(Boolean)
                    .join(' & ')}
                </span>
              </div>
            )}

            <div className="flex flex-wrap gap-1.5">
              {currentLog.symptoms.map((sId) => {
                const s = SYMPTOM_OPTIONS.find((x) => x.id === sId);
                return s ? (
                  <span
                    key={sId}
                    className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 text-[11px] font-medium border border-rose-100"
                  >
                    {s.emoji} {s.label}
                  </span>
                ) : null;
              })}
              {currentLog.moods.map((mId) => {
                const m = MOOD_OPTIONS.find((x) => x.id === mId);
                return m ? (
                  <span
                    key={mId}
                    className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-800 text-[11px] font-medium border border-indigo-100"
                  >
                    {m.emoji} {m.label}
                  </span>
                ) : null;
              })}
            </div>

            {currentLog.note && (
              <p className="text-xs text-slate-600 bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                “{currentLog.note}”
              </p>
            )}
          </div>
        )}
      </div>

      {/* Quick Bleeding Row for Selected Day */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-rose-100/80">
        <span className="block text-xs font-bold text-slate-800 mb-2.5 flex items-center gap-1.5">
          <Droplets className="w-3.5 h-3.5 text-rose-500" />
          Schnell-Log: Blutung am {formatDateGerman(selectedDate).split(' ')[0]}{' '}
          {formatDateGerman(selectedDate).split(' ')[1]}
        </span>
        <div className="grid grid-cols-5 gap-1.5">
          {BLEEDING_OPTIONS.map((opt) => {
            const active = currentLog.bleeding === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => updateCurrentLog({ bleeding: opt.id as BleedingLevel })}
                className={`py-2 px-1 rounded-2xl border flex flex-col items-center gap-1 transition ${
                  active
                    ? 'bg-rose-500 text-white border-rose-500 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200/80 hover:border-rose-200'
                }`}
              >
                <span className="text-xs leading-none">
                  {opt.drops === 0 ? '○' : '🩸'.repeat(Math.min(opt.drops, 3))}
                </span>
                <span className="text-[10px] font-bold truncate max-w-full">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Full Day Editor Bottom Sheet */}
      {editorOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-end sm:items-center justify-center"
          onClick={() => setEditorOpen(false)}
        >
          <div
            className="w-full max-w-lg max-h-[88vh] bg-[#FAF6F5] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 bg-white border-b border-rose-100 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-rose-500 uppercase">Tages-Log</p>
                <h3 className="text-base font-bold text-slate-900">{formatDateGerman(selectedDate)}</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="p-2 rounded-full bg-slate-100 text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto p-5 space-y-5">
              {/* Bleeding */}
              <div>
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-2">
                  <Droplets className="w-3.5 h-3.5 text-rose-500" />
                  Blutungsstärke
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {BLEEDING_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => updateCurrentLog({ bleeding: opt.id as BleedingLevel })}
                      className={`py-2 px-1 rounded-xl border text-[11px] font-bold transition ${
                        currentLog.bleeding === opt.id
                          ? 'bg-rose-500 text-white border-rose-500'
                          : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Symptoms */}
              <div>
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-2">
                  <HeartPulse className="w-3.5 h-3.5 text-rose-500" />
                  Symptome
                </label>
                <div className="flex flex-wrap gap-2">
                  {SYMPTOM_OPTIONS.map((s) => {
                    const active = currentLog.symptoms.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleTag('symptoms', s.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                          active
                            ? 'bg-rose-500 text-white border-rose-500'
                            : 'bg-white text-slate-700 border-slate-200'
                        }`}
                      >
                        {s.emoji} {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Moods */}
              <div>
                <label className="text-xs font-bold text-slate-700 mb-2 block">Stimmung</label>
                <div className="flex flex-wrap gap-2">
                  {MOOD_OPTIONS.map((m) => {
                    const active = currentLog.moods.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleTag('moods', m.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                          active
                            ? 'bg-indigo-500 text-white border-indigo-500'
                            : 'bg-white text-slate-700 border-slate-200'
                        }`}
                      >
                        {m.emoji} {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Protection factors */}
              <div className="bg-white rounded-2xl p-3.5 border border-amber-200/70 space-y-2.5">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  Wichtige Faktoren für den Pillenschutz
                </span>
                <label className="flex items-center justify-between text-xs text-slate-700 cursor-pointer">
                  <span>Erbrechen oder starker Durchfall (&lt; 4 Std. nach Pille)</span>
                  <input
                    type="checkbox"
                    checked={Boolean(currentLog.vomitingOrDiarrhea)}
                    onChange={(e) => updateCurrentLog({ vomitingOrDiarrhea: e.target.checked })}
                    className="w-4 h-4 accent-rose-500"
                  />
                </label>
                <label className="flex items-center justify-between text-xs text-slate-700 cursor-pointer">
                  <span>Antibiotika / Wechselwirkungen eingenommen</span>
                  <input
                    type="checkbox"
                    checked={Boolean(currentLog.antibiotics)}
                    onChange={(e) => updateCurrentLog({ antibiotics: e.target.checked })}
                    className="w-4 h-4 accent-rose-500"
                  />
                </label>
              </div>

              {/* Free Note */}
              <div>
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-2">
                  <StickyNote className="w-3.5 h-3.5 text-rose-500" />
                  Persönliche Notiz
                </label>
                <textarea
                  rows={3}
                  value={currentLog.note}
                  onChange={(e) => updateCurrentLog({ note: e.target.value })}
                  placeholder="z. B. Pille im Urlaub genommen, leichte Kopfschmerzen..."
                  className="w-full rounded-2xl bg-white border border-slate-200 p-3 text-xs text-slate-800 focus:outline-none focus:border-rose-400"
                />
              </div>
            </div>

            <div className="p-4 bg-white border-t border-rose-100">
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="w-full py-3 rounded-2xl bg-[#D94E6A] text-white text-sm font-bold shadow-sm"
              >
                Fertig speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
