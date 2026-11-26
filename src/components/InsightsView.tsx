import React, { useMemo, useState } from 'react';
import {
  HelpCircle,
  Plane,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Flame,
  CalendarCheck,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import type { AppState, PillType } from '../types';
import { SYMPTOM_OPTIONS, TIMEZONES } from '../data/presets';
import { formatDateShort } from '../utils/date';

interface InsightsViewProps {
  state: AppState;
}

export const InsightsView: React.FC<InsightsViewProps> = ({ state }) => {
  // Interactive Missed Pill Assistant State
  const [guideType, setGuideType] = useState<PillType>(state.blister.pillType);
  const [delayCategory, setDelayCategory] = useState<'within' | 'over' | 'vomit'>('within');
  const [weekNum, setWeekNum] = useState<1 | 2 | 3>(1);

  // Travel / Timezone Calculator
  const [destOffset, setDestOffset] = useState<number>(-5); // New York default

  // Adherence Stats
  const stats = useMemo(() => {
    const allEntries = Object.values(state.entries);
    const taken = allEntries.filter((e) => e.status === 'taken').length;
    const late = allEntries.filter((e) => e.status === 'late').length;
    const missed = allEntries.filter((e) => e.status === 'missed').length;

    const histTaken = state.history.reduce((acc, h) => acc + h.takenCount, 0);
    const histLate = state.history.reduce((acc, h) => acc + h.lateCount, 0);
    const histMissed = state.history.reduce((acc, h) => acc + h.missedCount, 0);

    const totalCompleted = taken + late + histTaken + histLate;
    const totalAll = totalCompleted + missed + histMissed;
    const adherencePct = totalAll > 0 ? Math.round((totalCompleted / totalAll) * 100) : 100;

    // Top symptoms
    const counts: Record<string, number> = {};
    Object.values(state.dayLogs).forEach((l) => {
      l.symptoms.forEach((s) => {
        counts[s] = (counts[s] || 0) + 1;
      });
    });
    const topSymptoms = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([id, count]) => ({
        meta: SYMPTOM_OPTIONS.find((x) => x.id === id),
        count,
      }));

    return {
      takenCurrent: taken + late,
      lateCurrent: late,
      missedCurrent: missed,
      totalCompleted,
      adherencePct,
      topSymptoms,
    };
  }, [state.entries, state.history, state.dayLogs]);

  // Missed pill guidance recommendation
  const missedAdvice = useMemo(() => {
    if (delayCategory === 'vomit') {
      return {
        level: 'warn' as const,
        title: 'Erbrechen / starker Durchfall innerhalb von 3–4 Stunden',
        steps: [
          'Der Wirkstoff wurde möglicherweise noch nicht vollständig aufgenommen.',
          'Nimm innerhalb des Toleranzfensters eine Ersatzpille aus einem Ersatzblister (oder vom Ende deines aktuellen Blisters).',
          'Falls das Erbrechen länger anhält oder die Zeit überschritten wurde, verhüte in den nächsten 7 Tagen zusätzlich (z. B. mit Kondom).',
        ],
      };
    }

    if (guideType === 'minipill') {
      if (delayCategory === 'within') {
        return {
          level: 'ok' as const,
          title: 'Innerhalb des Toleranzfensters (Desogestrel 12 Std. / Levonorgestrel 3 Std.)',
          steps: [
            'Hole die vergessene Pille sofort nach.',
            'Nimm die nächste Pille wieder zur gewohnten Uhrzeit ein.',
            'Der Verhütungsschutz bleibt in der Regel vollständig bestehen.',
          ],
        };
      }
      return {
        level: 'danger' as const,
        title: 'Toleranzfenster bei Minipille überschritten',
        steps: [
          'Nimm die vergessene Pille sofort nach (auch wenn dadurch 2 Pillen an einem Tag genommen werden).',
          'Verhüte in den nächsten 7 Tagen zusätzlich mit einer Barrieremethode (z. B. Kondom).',
          'Bei ungeschütztem Sex in den letzten Tagen: Lass dich in der Apotheke oder Praxis beraten.',
        ],
      };
    }

    // Combined pill
    if (delayCategory === 'within') {
      return {
        level: 'ok' as const,
        title: 'Weniger als 12 Stunden zu spät (Kombinationspille)',
        steps: [
          'Kein Grund zur Panik! Der Verhütungsschutz ist weiterhin voll gewährleistet.',
          'Nimm die vergessene Pille sofort nachträglich ein.',
          'Die nächste Pille nimmst du wieder zur ganz normalen Uhrzeit.',
        ],
      };
    }

    if (weekNum === 1) {
      return {
        level: 'danger' as const,
        title: 'Über 12 Stunden zu spät – Einnahmewoche 1',
        steps: [
          'Nimm die vergessene Pille sofort nach (auch wenn 2 Pillen gleichzeitig genommen werden).',
          'Verhüte in den nächsten 7 Tagen zusätzlich (z. B. Kondom).',
          'Hattest du in den letzten 7 Tagen ungeschützten Geschlechtsverkehr, kann eine Schwangerschaft nicht sicher ausgeschlossen werden – bitte ärztlich/in der Apotheke abklären.',
        ],
      };
    }

    if (weekNum === 2) {
      return {
        level: 'warn' as const,
        title: 'Über 12 Stunden zu spät – Einnahmewoche 2',
        steps: [
          'Hole die vergessene Pille sofort nach.',
          'Wenn du in den 7 Tagen davor alle Pillen korrekt genommen hast, bleibt der Schutz meist erhalten.',
          'Falls vorher bereits eine Pille vergessen wurde: 7 Tage zusätzlich verhüten.',
        ],
      };
    }

    return {
      level: 'warn' as const,
      title: 'Über 12 Stunden zu spät – Einnahmewoche 3',
      steps: [
        'Option A (Pause auslassen): Pille sofort nachholen, Blister beenden und direkt ohne Pause mit dem nächsten Blister starten (Schutz bleibt erhalten).',
        'Option B (Pause vorziehen): Keine weitere Pille mehr nehmen, direkt die 7-tägige Pause starten (inkl. dem vergessenen Tag).',
        'Prüfe im Zweifel kurz deine Packungsbeilage.',
      ],
    };
  }, [guideType, delayCategory, weekNum]);

  // Travel timezone conversion from Germany (UTC+1 base)
  const travelCalculation = useMemo(() => {
    const [h, m] = state.alarm.time.split(':').map(Number);
    const homeOffset = 1;
    const diffHours = destOffset - homeOffset;
    const localHour = (((h || 20) + diffHours) % 24 + 24) % 24;
    const formattedLocal = `${String(localHour).padStart(2, '0')}:${String(m || 0).padStart(2, '0')} Uhr`;
    const isNightShift = localHour >= 0 && localHour <= 6;
    return { diffHours, formattedLocal, isNightShift };
  }, [state.alarm.time, destOffset]);

  return (
    <div className="space-y-4">
      {/* Adherence KPI Grid */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-white rounded-3xl p-3.5 border border-rose-100/80 shadow-xs text-center">
          <div className="w-8 h-8 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1.5">
            <TrendingUp className="w-4 h-4" />
          </div>
          <p className="text-xl font-extrabold text-slate-900">{stats.adherencePct}%</p>
          <p className="text-[10px] font-semibold text-slate-500">Zuverlässigkeit</p>
        </div>

        <div className="bg-white rounded-3xl p-3.5 border border-rose-100/80 shadow-xs text-center">
          <div className="w-8 h-8 mx-auto rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-1.5">
            <Flame className="w-4 h-4" />
          </div>
          <p className="text-xl font-extrabold text-slate-900">{stats.takenCurrent}</p>
          <p className="text-[10px] font-semibold text-slate-500">Aktueller Blister</p>
        </div>

        <div className="bg-white rounded-3xl p-3.5 border border-rose-100/80 shadow-xs text-center">
          <div className="w-8 h-8 mx-auto rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-1.5">
            <CalendarCheck className="w-4 h-4" />
          </div>
          <p className="text-xl font-extrabold text-slate-900">{stats.totalCompleted}</p>
          <p className="text-[10px] font-semibold text-slate-500">Gesamt genommen</p>
        </div>
      </div>

      {/* INTERACTIVE "PILLE VERGESSEN?" ASSISTANT */}
      <div className="bg-white rounded-3xl p-4 border border-rose-100/80 shadow-xs space-y-3.5">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600">
            <HelpCircle className="w-4 h-4" />
            Notfall-Ratgeber: Pille vergessen?
          </span>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Wähle deine Situation für eine schnelle Orientierungshilfe.
          </p>
        </div>

        {/* Step 1: Pill Type */}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => setGuideType('combined')}
            className={`py-2 px-2 rounded-xl text-xs font-bold border transition ${
              guideType === 'combined'
                ? 'bg-rose-50 text-rose-800 border-rose-400'
                : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}
          >
            Kombinationspille
          </button>
          <button
            type="button"
            onClick={() => setGuideType('minipill')}
            className={`py-2 px-2 rounded-xl text-xs font-bold border transition ${
              guideType === 'minipill'
                ? 'bg-rose-50 text-rose-800 border-rose-400'
                : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}
          >
            Minipille
          </button>
        </div>

        {/* Step 2: Situation */}
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { id: 'within' as const, label: guideType === 'combined' ? '< 12 Std.' : 'Im Fenster' },
            { id: 'over' as const, label: guideType === 'combined' ? '> 12 Std.' : 'Überschritten' },
            { id: 'vomit' as const, label: 'Erbrechen' },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setDelayCategory(opt.id)}
              className={`py-2 px-2 rounded-xl text-[11px] font-bold border transition ${
                delayCategory === opt.id
                  ? 'bg-[#D94E6A] text-white border-[#D94E6A]'
                  : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Step 3: Week selector if Combined & Over 12h */}
        {guideType === 'combined' && delayCategory === 'over' && (
          <div className="grid grid-cols-3 gap-1.5">
            {([1, 2, 3] as const).map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setWeekNum(w)}
                className={`py-1.5 rounded-xl text-xs font-bold border transition ${
                  weekNum === w
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                Woche {w}
              </button>
            ))}
          </div>
        )}

        {/* Recommendation Box */}
        <div
          className={`rounded-2xl p-3.5 border space-y-2 ${
            missedAdvice.level === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
              : missedAdvice.level === 'warn'
              ? 'bg-amber-50 border-amber-200 text-amber-950'
              : 'bg-rose-50 border-rose-200 text-rose-950'
          }`}
        >
          <div className="flex items-start gap-2">
            {missedAdvice.level === 'ok' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : missedAdvice.level === 'warn' ? (
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <p className="text-xs font-bold leading-snug">{missedAdvice.title}</p>
          </div>
          <ul className="space-y-1.5 pl-6 list-disc text-[11px] leading-relaxed opacity-90">
            {missedAdvice.steps.map((s, idx) => (
              <li key={idx}>{s}</li>
            ))}
          </ul>
          <p className="text-[10px] opacity-70 pt-1 border-t border-black/10">
            Hinweis: Diese App ersetzt keine ärztliche Beratung. Im Zweifelsfall immer die Packungsbeilage deiner Pille prüfen.
          </p>
        </div>
      </div>

      {/* TRAVEL / TIMEZONE CALCULATOR */}
      <div className="bg-white rounded-3xl p-4 border border-rose-100/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Plane className="w-4 h-4 text-sky-500" />
            Reisemodus & Zeitzonen-Rechner
          </span>
          <span className="text-[11px] font-semibold text-slate-400">
            Heimatzeit: {state.alarm.time} Uhr
          </span>
        </div>

        <select
          value={destOffset}
          onChange={(e) => setDestOffset(Number(e.target.value))}
          className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-rose-400"
        >
          {TIMEZONES.map((tz) => (
            <option key={tz.label} value={tz.offset}>
              {tz.label}
            </option>
          ))}
        </select>

        <div className="rounded-2xl bg-sky-50/80 border border-sky-200/70 p-3.5 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold text-sky-800">
              Deine Einnahmezeit am Reiseziel ({travelCalculation.diffHours >= 0 ? '+' : ''}
              {travelCalculation.diffHours} Std.)
            </p>
            <p className="text-lg font-extrabold text-sky-950 flex items-center gap-1.5 mt-0.5">
              <Clock className="w-4 h-4 text-sky-600" />
              {travelCalculation.formattedLocal}
            </p>
            {travelCalculation.isNightShift && (
              <p className="text-[10px] text-sky-800 mt-1">
                Tipp: Da dies nachts liegt, kannst du bei der Kombinationspille die Zeit schrittweise um je 2–3 Std. verschieben (Abstand nie &gt; 36 Std.).
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Top Logged Symptoms */}
      {stats.topSymptoms.length > 0 && (
        <div className="bg-white rounded-3xl p-4 border border-rose-100/80 shadow-xs space-y-2.5">
          <span className="text-xs font-bold text-slate-800">Häufigste Symptome</span>
          <div className="flex flex-wrap gap-2">
            {stats.topSymptoms.map(({ meta, count }) =>
              meta ? (
                <span
                  key={meta.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-100 text-xs font-semibold text-rose-900"
                >
                  {meta.emoji} {meta.label}
                  <span className="px-1.5 py-0.5 rounded-full bg-white text-rose-600 text-[10px] font-bold">
                    {count}×
                  </span>
                </span>
              ) : null
            )}
          </div>
        </div>
      )}

      {/* Pack History */}
      <div className="bg-white rounded-3xl p-4 border border-rose-100/80 shadow-xs space-y-2.5">
        <span className="text-xs font-bold text-slate-800">Blister-Verlauf</span>
        <div className="space-y-2">
          {state.history.map((pack) => (
            <div
              key={pack.id}
              className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100"
            >
              <div>
                <p className="text-xs font-bold text-slate-800">{pack.brandName}</p>
                <p className="text-[11px] text-slate-500">
                  {formatDateShort(pack.startDate)} – {formatDateShort(pack.endDate)}
                </p>
              </div>
              <div className="text-right">
                <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold">
                  {pack.takenCount}/{pack.totalPills} pünktlich
                </span>
                {pack.lateCount > 0 && (
                  <p className="text-[10px] text-amber-600 font-medium mt-0.5">
                    {pack.lateCount}× verspätet
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
