import React, { useEffect, useState } from 'react';
import {
  Bell,
  BellRing,
  Clock,
  Volume2,
  EyeOff,
  Plus,
  Trash2,
  ShieldCheck,
  Play,
  Package,
  CheckCircle2,
} from 'lucide-react';
import type { AlarmConfig, AlarmSoundId, DiscreetMode } from '../types';
import { DISCREET_MESSAGES } from '../data/presets';
import { getTimeUntilAlarm } from '../utils/date';
import { playAlarmSound } from '../utils/sound';
import {
  getWebNotificationPermission,
  requestNotificationPermission,
  type NotificationPermissionState,
} from '../utils/notifications';

interface AlarmViewProps {
  alarm: AlarmConfig;
  soundEnabled: boolean;
  onChange: (updated: AlarmConfig) => void;
  onTriggerTestAlarm: () => void;
}

export const AlarmView: React.FC<AlarmViewProps> = ({
  alarm,
  soundEnabled,
  onChange,
  onTriggerTestAlarm,
}) => {
  const [countdown, setCountdown] = useState(() => getTimeUntilAlarm(alarm.time));
  const [permState, setPermState] = useState<NotificationPermissionState>(() =>
    getWebNotificationPermission()
  );
  const [newExtraTime, setNewExtraTime] = useState('21:00');

  useEffect(() => {
    const tick = () => setCountdown(getTimeUntilAlarm(alarm.time));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [alarm.time]);

  const handleRequestPermission = async () => {
    const res = await requestNotificationPermission();
    setPermState(res);
  };

  const addExtraAlarm = () => {
    if (!newExtraTime || alarm.extraTimes.includes(newExtraTime) || newExtraTime === alarm.time) {
      return;
    }
    onChange({
      ...alarm,
      extraTimes: [...alarm.extraTimes, newExtraTime].sort(),
    });
  };

  const removeExtraAlarm = (t: string) => {
    onChange({
      ...alarm,
      extraTimes: alarm.extraTimes.filter((x) => x !== t),
    });
  };

  const previewNotification =
    alarm.discreetMode === 'custom'
      ? {
          title: 'Lunea Erinnerung',
          body: alarm.customMessage || 'Dein eigener diskreter Text erscheint hier.',
        }
      : DISCREET_MESSAGES[alarm.discreetMode];

  return (
    <div className="space-y-4">
      {/* Hero Alarm Clock Card */}
      <div className="rounded-3xl bg-gradient-to-br from-[#D94E6A] via-[#C93D5E] to-[#A52E50] text-white p-5 shadow-lg relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/10 blur-xl pointer-events-none" />

        <div className="flex items-start justify-between relative z-10">
          <div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-rose-100">
              <BellRing className="w-3.5 h-3.5" />
              Täglicher Pillenwecker
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <input
                type="time"
                value={alarm.time}
                onChange={(e) => onChange({ ...alarm, time: e.target.value })}
                className="text-4xl font-extrabold tracking-tight bg-white/15 hover:bg-white/20 rounded-2xl px-3 py-1.5 text-white border border-white/25 focus:outline-none focus:ring-2 focus:ring-white/60 cursor-pointer"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => onChange({ ...alarm, enabled: !alarm.enabled })}
            className={`w-14 h-8 rounded-full p-1 transition-colors flex items-center ${
              alarm.enabled ? 'bg-emerald-400 justify-end' : 'bg-white/25 justify-start'
            }`}
            aria-label="Pillenwecker ein- oder ausschalten"
          >
            <span className="w-6 h-6 rounded-full bg-white shadow-md" />
          </button>
        </div>

        <div className="mt-4 pt-3.5 border-t border-white/20 flex items-center justify-between text-xs relative z-10">
          <span className="flex items-center gap-1.5 text-rose-50 font-medium">
            <Clock className="w-3.5 h-3.5" />
            {alarm.enabled
              ? `Nächster Wecker in ${countdown.hours} Std. ${countdown.minutes} Min.`
              : 'Wecker aktuell pausiert'}
          </span>

          <button
            type="button"
            onClick={onTriggerTestAlarm}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-rose-700 text-xs font-bold shadow-sm hover:bg-rose-50 active:scale-95 transition"
          >
            <Play className="w-3 h-3 fill-current" />
            Wecker testen
          </button>
        </div>
      </div>

      {/* Browser / Native Push Permission Card */}
      <div className="bg-white rounded-3xl p-4 border border-rose-100/80 shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${
              permState === 'granted'
                ? 'bg-emerald-50 text-emerald-600'
                : 'bg-amber-50 text-amber-600'
            }`}
          >
            {permState === 'granted' ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <Bell className="w-5 h-5" />
            )}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900">
              {permState === 'granted'
                ? 'Benachrichtigungen aktiv'
                : 'Push-Benachrichtigungen erlauben'}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
              {permState === 'granted'
                ? 'Du erhältst Erinnerungen im Browser & später nativ auf iOS/Android.'
                : 'Erlaube Benachrichtigungen, damit der Wecker auch im Hintergrund meldet.'}
            </p>
          </div>
        </div>
        {permState !== 'granted' && (
          <button
            type="button"
            onClick={handleRequestPermission}
            className="shrink-0 px-3 py-2 rounded-xl bg-rose-500 text-white text-xs font-bold hover:bg-rose-600 transition"
          >
            Erlauben
          </button>
        )}
      </div>

      {/* Extra Alarm Times */}
      <div className="bg-white rounded-3xl p-4 border border-rose-100/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800">Zusätzliche Weckzeiten</span>
          <span className="text-[11px] text-slate-400">Optional (Backup-Wecker)</span>
        </div>

        {alarm.extraTimes.length > 0 && (
          <div className="space-y-2">
            {alarm.extraTimes.map((t) => (
              <div
                key={t}
                className="flex items-center justify-between px-3.5 py-2 rounded-2xl bg-slate-50 border border-slate-200/70"
              >
                <span className="text-sm font-bold text-slate-800">{t} Uhr</span>
                <button
                  type="button"
                  onClick={() => removeExtraAlarm(t)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            type="time"
            value={newExtraTime}
            onChange={(e) => setNewExtraTime(e.target.value)}
            className="flex-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-800"
          />
          <button
            type="button"
            onClick={addExtraAlarm}
            className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Hinzufügen
          </button>
        </div>
      </div>

      {/* Snooze & Tolerance Window */}
      <div className="bg-white rounded-3xl p-4 border border-rose-100/80 shadow-xs space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-800">Schlummer-Intervall (Snooze)</span>
            <span className="text-xs font-bold text-rose-600">alle {alarm.snoozeMinutes} Min.</span>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {[5, 10, 15, 30, 60].map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => onChange({ ...alarm, snoozeMinutes: mins })}
                className={`py-2 rounded-xl text-xs font-bold border transition ${
                  alarm.snoozeMinutes === mins
                    ? 'bg-[#D94E6A] text-white border-[#D94E6A]'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                {mins}m
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center justify-between gap-3 cursor-pointer pt-1">
          <div>
            <p className="text-xs font-bold text-slate-800">Hartnäckig erinnern bis ausgedrückt</p>
            <p className="text-[11px] text-slate-500">
              Wiederholt den Alarm im Snooze-Takt, bis die heutige Pille genommen wurde.
            </p>
          </div>
          <input
            type="checkbox"
            checked={alarm.repeatUntilTaken}
            onChange={(e) => onChange({ ...alarm, repeatUntilTaken: e.target.checked })}
            className="w-4 h-4 accent-[#D94E6A]"
          />
        </label>

        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Einnahme-Toleranzfenster
            </span>
            <span className="text-xs font-bold text-emerald-700">{alarm.toleranceHours} Std.</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { h: 12, label: '12 Std. (Kombi)' },
              { h: 3, label: '3 Std. (Minipille)' },
              { h: 6, label: '6 Std. (Eigen)' },
            ].map((opt) => (
              <button
                key={opt.h}
                type="button"
                onClick={() => onChange({ ...alarm, toleranceHours: opt.h })}
                className={`py-2 px-2 rounded-xl text-[11px] font-bold border transition ${
                  alarm.toleranceHours === opt.h
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-400'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Alarm Sound Picker */}
      <div className="bg-white rounded-3xl p-4 border border-rose-100/80 shadow-xs space-y-2.5">
        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <Volume2 className="w-4 h-4 text-rose-500" />
          Weckton auswählen & anhören
        </span>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { id: 'harp', label: 'Sanfte Harfe' },
              { id: 'chime', label: 'Morgenglocke' },
              { id: 'ping', label: 'Diskret Ping' },
            ] as Array<{ id: AlarmSoundId; label: string }>
          ).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                onChange({ ...alarm, soundId: s.id });
                playAlarmSound(s.id, soundEnabled || true);
              }}
              className={`py-2.5 px-2 rounded-2xl text-xs font-bold border transition flex flex-col items-center gap-1 ${
                alarm.soundId === s.id
                  ? 'bg-rose-50 text-rose-800 border-rose-400'
                  : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Discreet Lockscreen Mode */}
      <div className="bg-white rounded-3xl p-4 border border-rose-100/80 shadow-xs space-y-3">
        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <EyeOff className="w-4 h-4 text-rose-500" />
          Diskreter Sperrbildschirm-Text
        </span>

        <div className="grid grid-cols-2 gap-1.5">
          {(
            [
              { id: 'standard', label: 'Standard (Pille 💊)' },
              { id: 'routine', label: 'Tägliche Routine ✨' },
              { id: 'water', label: 'Wasser trinken 💧' },
              { id: 'custom', label: 'Eigener Text' },
            ] as Array<{ id: DiscreetMode; label: string }>
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onChange({ ...alarm, discreetMode: m.id })}
              className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition text-left ${
                alarm.discreetMode === m.id
                  ? 'bg-rose-50 text-rose-800 border-rose-400 font-bold'
                  : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {alarm.discreetMode === 'custom' && (
          <input
            type="text"
            value={alarm.customMessage}
            onChange={(e) => onChange({ ...alarm, customMessage: e.target.value })}
            placeholder="z. B. Vitamine nicht vergessen!"
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-rose-400"
          />
        )}

        {/* Lockscreen preview bubble */}
        <div className="rounded-2xl bg-slate-900/92 text-white p-3 flex items-center gap-3 shadow-inner">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center text-xs font-bold shrink-0">
            L
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold truncate">{previewNotification.title}</p>
              <span className="text-[10px] text-slate-400">jetzt</span>
            </div>
            <p className="text-[11px] text-slate-300 truncate">{previewNotification.body}</p>
          </div>
        </div>
      </div>

      {/* Pause & Refill Reminders */}
      <div className="bg-white rounded-3xl p-4 border border-rose-100/80 shadow-xs space-y-3">
        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <Package className="w-4 h-4 text-rose-500" />
          Pausen- & Rezept-Erinnerungen
        </span>

        <label className="flex items-center justify-between text-xs text-slate-700 cursor-pointer">
          <span>Auch in der Einnahmepause erinnern</span>
          <input
            type="checkbox"
            checked={alarm.notifyOnPauseDays}
            onChange={(e) => onChange({ ...alarm, notifyOnPauseDays: e.target.checked })}
            className="w-4 h-4 accent-[#D94E6A]"
          />
        </label>

        <label className="flex items-center justify-between text-xs text-slate-700 cursor-pointer">
          <span>Am letzten Pausentag an neuen Blister erinnern</span>
          <input
            type="checkbox"
            checked={alarm.pauseEndReminder}
            onChange={(e) => onChange({ ...alarm, pauseEndReminder: e.target.checked })}
            className="w-4 h-4 accent-[#D94E6A]"
          />
        </label>

        <label className="flex items-center justify-between text-xs text-slate-700 cursor-pointer">
          <span>Rezept-Warnung bei &le; {alarm.refillThresholdDays} Pillen Vorrat</span>
          <input
            type="checkbox"
            checked={alarm.refillReminderEnabled}
            onChange={(e) => onChange({ ...alarm, refillReminderEnabled: e.target.checked })}
            className="w-4 h-4 accent-[#D94E6A]"
          />
        </label>
      </div>
    </div>
  );
};
