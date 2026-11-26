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
  Lock,
} from 'lucide-react';
import type { AlarmConfig, AlarmSoundId, DiscreetMode } from '../types';
import { DISCREET_MESSAGES } from '../data/presets';
import { getTimeUntilAlarm } from '../utils/date';
import { playAlarmSound } from '../utils/sound';
import {
  checkNotificationPermission,
  getWebNotificationPermission,
  requestNotificationPermission,
  scheduleLockscreenTestNotification,
  type NotificationPermissionState,
} from '../utils/notifications';

interface AlarmViewProps {
  alarm: AlarmConfig;
  soundEnabled: boolean;
  onChange: (updated: AlarmConfig) => void;
  onTriggerTestAlarm: () => void;
  onNotifyToast?: (msg: string) => void;
}

export const AlarmView: React.FC<AlarmViewProps> = ({
  alarm,
  soundEnabled,
  onChange,
  onTriggerTestAlarm,
  onNotifyToast,
}) => {
  const [countdown, setCountdown] = useState(() => getTimeUntilAlarm(alarm.time));
  const [permState, setPermState] = useState<NotificationPermissionState>(() =>
    getWebNotificationPermission()
  );
  const [newExtraTime, setNewExtraTime] = useState('21:00');
  const [lockTestPending, setLockTestPending] = useState(false);

  // Check real native Android/iOS or Web permission asynchronously on mount
  useEffect(() => {
    let mounted = true;
    checkNotificationPermission().then((st) => {
      if (mounted) setPermState(st);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const tick = () => setCountdown(getTimeUntilAlarm(alarm.time));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [alarm.time]);

  const handleRequestPermission = async () => {
    const res = await requestNotificationPermission();
    setPermState(res);
    if (res === 'granted') {
      onNotifyToast?.('Benachrichtigungen aktiviert ✓');
    }
  };

  const handleLockscreenTest = async () => {
    const res = await scheduleLockscreenTestNotification(alarm, 5);
    const updatedPerm = await checkNotificationPermission();
    setPermState(updatedPerm);

    if (res.ok) {
      setLockTestPending(true);
      onNotifyToast?.('Wecker klingelt in 5 Sek. – Handy jetzt sperren!');
      window.setTimeout(() => setLockTestPending(false), 5500);
    } else if (res.reason) {
      onNotifyToast?.(res.reason);
    }
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
          title: 'Pille',
          body: alarm.customMessage || 'Dein eigener diskreter Text',
        }
      : DISCREET_MESSAGES[alarm.discreetMode];

  return (
    <div className="space-y-3.5">
      {/* Hero Alarm Clock Card — clean stacked layout, zero mobile overflow */}
      <div className="rounded-3xl app-accent-gradient text-white p-5 shadow-lg relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/10 blur-xl pointer-events-none" />

        {/* Top Row: Label + Toggle */}
        <div className="flex items-center justify-between relative z-10">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white/90">
            <BellRing className="w-4 h-4" />
            Täglicher Wecker
          </span>

          <button
            type="button"
            onClick={async () => {
              const nextEnabled = !alarm.enabled;
              onChange({ ...alarm, enabled: nextEnabled });
              if (nextEnabled && permState !== 'granted') {
                const res = await requestNotificationPermission();
                setPermState(res);
              }
            }}
            className={`w-13 h-7 rounded-full p-0.5 transition-colors flex items-center shrink-0 ${
              alarm.enabled ? 'bg-emerald-400 justify-end' : 'bg-white/25 justify-start'
            }`}
            aria-label="Wecker ein- oder ausschalten"
          >
            <span className="w-6 h-6 rounded-full bg-white shadow-md" />
          </button>
        </div>

        {/* Center Time Picker */}
        <div className="mt-4 flex flex-col items-center relative z-10">
          <input
            type="time"
            value={alarm.time}
            onChange={(e) => {
              if (e.target.value) onChange({ ...alarm, time: e.target.value });
            }}
            aria-label="Weckzeit"
            className="w-full max-w-[210px] text-center text-4xl font-extrabold tracking-tight bg-white/15 hover:bg-white/20 rounded-2xl px-4 py-2.5 text-white border border-white/25 focus:outline-none focus:ring-2 focus:ring-white/60 cursor-pointer"
          />
          <span className="mt-2.5 inline-flex items-center gap-1.5 text-xs text-white/90 font-medium">
            <Clock className="w-3.5 h-3.5" />
            {alarm.enabled
              ? `In ${countdown.hours} Std. ${countdown.minutes} Min.`
              : 'Wecker pausiert'}
          </span>
        </div>

        {/* Two Clean Test Buttons */}
        <div className="mt-4 pt-3.5 border-t border-white/20 grid grid-cols-2 gap-2 relative z-10">
          <button
            type="button"
            onClick={onTriggerTestAlarm}
            className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white app-accent-text text-xs font-bold shadow-sm active:scale-95 transition"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Sofort testen
          </button>
          <button
            type="button"
            onClick={handleLockscreenTest}
            disabled={lockTestPending}
            className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white/18 hover:bg-white/25 text-white border border-white/25 text-xs font-bold active:scale-95 transition disabled:opacity-70"
          >
            <Lock className="w-3.5 h-3.5" />
            {lockTestPending ? 'Klingelt in 5s…' : 'Sperrbild (5s)'}
          </button>
        </div>
      </div>

      {/* Native Push / Lockscreen Permission Card */}
      <div className="bg-white rounded-3xl p-4 border border-rose-100/80 shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
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
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900">
              {permState === 'granted' ? 'Wecker-Meldungen aktiv' : 'Meldungen erlauben'}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
              {permState === 'granted'
                ? 'Klingelt mit Ton auch bei gesperrtem Handy.'
                : 'Wichtig für Alarm bei geschlossener App.'}
            </p>
          </div>
        </div>
        {permState !== 'granted' && (
          <button
            type="button"
            onClick={handleRequestPermission}
            className="shrink-0 px-3.5 py-2 rounded-xl app-accent-bg text-white text-xs font-bold active:scale-95 transition"
          >
            Erlauben
          </button>
        )}
      </div>

      {/* Alarm Sound Picker */}
      <div className="bg-white rounded-3xl p-4 border border-rose-100/80 shadow-xs space-y-2.5">
        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <Volume2 className="w-4 h-4 app-accent-text" />
          Weckton
        </span>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { id: 'harp', label: 'Harfe' },
              { id: 'chime', label: 'Glocke' },
              { id: 'ping', label: 'Ping' },
            ] as Array<{ id: AlarmSoundId; label: string }>
          ).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                onChange({ ...alarm, soundId: s.id });
                playAlarmSound(s.id, soundEnabled || true);
              }}
              className={`py-2.5 px-2 rounded-2xl text-xs font-bold border transition flex flex-col items-center gap-1 active:scale-95 ${
                alarm.soundId === s.id
                  ? 'app-accent-soft'
                  : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Extra Alarm Times */}
      <div className="bg-white rounded-3xl p-4 border border-rose-100/80 shadow-xs space-y-3">
        <span className="text-xs font-bold text-slate-800 block">Zusatz-Wecker</span>

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
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 min-w-0">
          <input
            type="time"
            value={newExtraTime}
            onChange={(e) => setNewExtraTime(e.target.value)}
            className="min-w-0 flex-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-800"
          />
          <button
            type="button"
            onClick={addExtraAlarm}
            className="shrink-0 inline-flex items-center gap-1 px-3.5 py-2.5 rounded-xl app-accent-soft border text-xs font-bold active:scale-95 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Plus
          </button>
        </div>
      </div>

      {/* Snooze & Tolerance Window */}
      <div className="bg-white rounded-3xl p-4 border border-rose-100/80 shadow-xs space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-800">Schlummern</span>
            <span className="text-xs font-bold app-accent-text">alle {alarm.snoozeMinutes} Min.</span>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {[5, 10, 15, 30, 60].map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => onChange({ ...alarm, snoozeMinutes: mins })}
                className={`py-2 rounded-xl text-xs font-bold border transition ${
                  alarm.snoozeMinutes === mins
                    ? 'app-accent-bg text-white'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                {mins}m
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center justify-between gap-3 cursor-pointer">
          <span className="text-xs font-semibold text-slate-800">
            Wiederholen bis Pille genommen
          </span>
          <input
            type="checkbox"
            checked={alarm.repeatUntilTaken}
            onChange={(e) => onChange({ ...alarm, repeatUntilTaken: e.target.checked })}
            className="w-5 h-5 accent-[#D94E6A]"
          />
        </label>

        <div className="pt-2.5 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Schutzfenster
            </span>
            <span className="text-xs font-bold text-emerald-700">{alarm.toleranceHours} Std.</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { h: 12, label: '12 Std.' },
              { h: 3, label: '3 Std.' },
              { h: 6, label: '6 Std.' },
            ].map((opt) => (
              <button
                key={opt.h}
                type="button"
                onClick={() => onChange({ ...alarm, toleranceHours: opt.h })}
                className={`py-2 rounded-xl text-xs font-bold border transition ${
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

      {/* Discreet Lockscreen Mode */}
      <div className="bg-white rounded-3xl p-4 border border-rose-100/80 shadow-xs space-y-3">
        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <EyeOff className="w-4 h-4 app-accent-text" />
          Sperrbildschirm-Text
        </span>

        <div className="grid grid-cols-2 gap-1.5">
          {(
            [
              { id: 'standard', label: 'Standard' },
              { id: 'routine', label: 'Tägliche Routine' },
              { id: 'water', label: 'Wasser trinken' },
              { id: 'custom', label: 'Eigener Text' },
            ] as Array<{ id: DiscreetMode; label: string }>
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onChange({ ...alarm, discreetMode: m.id })}
              className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition text-left ${
                alarm.discreetMode === m.id
                  ? 'app-accent-soft font-bold'
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
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none"
          />
        )}

        {/* Lockscreen preview bubble */}
        <div className="rounded-2xl bg-slate-900 text-white p-3 flex items-center gap-3 shadow-inner">
          <img
            src="/icon.png"
            alt=""
            className="w-8 h-8 rounded-xl object-cover shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold truncate">{previewNotification.title}</p>
              <span className="text-[10px] text-slate-400 shrink-0">jetzt</span>
            </div>
            <p className="text-[11px] text-slate-300 truncate">{previewNotification.body}</p>
          </div>
        </div>
      </div>

      {/* Pause & Refill Reminders */}
      <div className="bg-white rounded-3xl p-4 border border-rose-100/80 shadow-xs space-y-3">
        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <Package className="w-4 h-4 app-accent-text" />
          Weitere Erinnerungen
        </span>

        <label className="flex items-center justify-between gap-3 text-xs text-slate-700 cursor-pointer">
          <span>Auch in der Pause erinnern</span>
          <input
            type="checkbox"
            checked={alarm.notifyOnPauseDays}
            onChange={(e) => onChange({ ...alarm, notifyOnPauseDays: e.target.checked })}
            className="w-5 h-5 accent-[#D94E6A]"
          />
        </label>

        <label className="flex items-center justify-between gap-3 text-xs text-slate-700 cursor-pointer">
          <span>Vor neuem Blister erinnern</span>
          <input
            type="checkbox"
            checked={alarm.pauseEndReminder}
            onChange={(e) => onChange({ ...alarm, pauseEndReminder: e.target.checked })}
            className="w-5 h-5 accent-[#D94E6A]"
          />
        </label>

        <label className="flex items-center justify-between gap-3 text-xs text-slate-700 cursor-pointer">
          <span>Rezept-Warnung ({alarm.refillThresholdDays} Tage vorher)</span>
          <input
            type="checkbox"
            checked={alarm.refillReminderEnabled}
            onChange={(e) => onChange({ ...alarm, refillReminderEnabled: e.target.checked })}
            className="w-5 h-5 accent-[#D94E6A]"
          />
        </label>
      </div>
    </div>
  );
};
