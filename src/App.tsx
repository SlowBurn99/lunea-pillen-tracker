import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarDays,
  BellRing,
  HeartPulse,
  Settings,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Sparkles,
  Package,
  Droplets,
  LayoutGrid,
} from 'lucide-react';
import type { AppState, BlisterConfig, BlisterThemeId, DayLog, TabId } from './types';
import { createInitialState, loadAppState, saveAppState } from './utils/storage';
import {
  addDays,
  diffDays,
  formatDateGerman,
  formatTimeFromIso,
  getTimeUntilAlarm,
  getTodayIso,
} from './utils/date';
import {
  fireBrowserNotification,
  getAlarmNotificationText,
  syncNativeAlarms,
} from './utils/notifications';
import { playAlarmSound, playBlisterPopSound, triggerHaptic } from './utils/sound';
import { BlisterPack } from './components/BlisterPack';
import { BlisterCustomizerModal } from './components/BlisterCustomizerModal';
import { CalendarView } from './components/CalendarView';
import { AlarmView } from './components/AlarmView';
import { InsightsView } from './components/InsightsView';
import { SettingsView } from './components/SettingsView';
import { AlarmOverlayModal } from './components/AlarmOverlayModal';
import { PinLockScreen } from './components/PinLockScreen';
import { OnboardingScreen } from './components/OnboardingScreen';
import { ProfileAvatar } from './components/ProfileAvatar';

export function App() {
  const [state, setState] = useState<AppState>(() => loadAppState());
  const [activeTab, setActiveTab] = useState<TabId>('blister');
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [alarmModalOpen, setAlarmModalOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(() => !loadAppState().settings.pinEnabled);
  const [toast, setToast] = useState<string | null>(null);
  const [snoozeUntil, setSnoozeUntil] = useState<number | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());

  const lastTriggeredMinuteRef = useRef<string>('');

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => {
      setToast((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  // Persist app state automatically
  useEffect(() => {
    saveAppState(state);
  }, [state]);

  // Sync Capacitor native notifications whenever alarm config changes
  useEffect(() => {
    syncNativeAlarms(state.alarm);
  }, [state.alarm]);

  // Live clock tick every 15s for countdown & active in-app alarm scheduler
  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 15000);
    return () => window.clearInterval(id);
  }, []);

  const today = getTodayIso();
  const totalPhysicalPills = state.blister.activePills + state.blister.placeboPills;
  const totalCycleDays = totalPhysicalPills + state.blister.pauseDays;
  const cycleDayIndex = diffDays(state.blister.packStartDate, today);
  const isInPause = cycleDayIndex >= totalPhysicalPills && cycleDayIndex < totalCycleDays;
  const isTodayPlacebo =
    cycleDayIndex >= state.blister.activePills && cycleDayIndex < totalPhysicalPills;
  const todayEntry = state.entries[today];
  const isTodayTaken = todayEntry?.status === 'taken' || todayEntry?.status === 'late';

  // Trigger live web alarm / snooze when due
  useEffect(() => {
    if (!state.alarm.enabled || isTodayTaken) return;
    if (isInPause && !state.alarm.notifyOnPauseDays) return;

    const now = new Date(nowTick);
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const minuteKey = `${today}_${hhmm}`;

    const allTimes = [state.alarm.time, ...state.alarm.extraTimes];
    const shouldFireScheduled =
      allTimes.includes(hhmm) && lastTriggeredMinuteRef.current !== minuteKey;
    const shouldFireSnooze = snoozeUntil !== null && nowTick >= snoozeUntil;

    if (shouldFireScheduled || shouldFireSnooze) {
      if (shouldFireScheduled) lastTriggeredMinuteRef.current = minuteKey;
      if (shouldFireSnooze) setSnoozeUntil(null);

      const { title, body } = getAlarmNotificationText(state.alarm);
      fireBrowserNotification(title, body);
      playAlarmSound(state.alarm.soundId, state.settings.soundEnabled);
      triggerHaptic(state.settings.hapticsEnabled, 'heavy');
      setAlarmModalOpen(true);
    }
  }, [
    nowTick,
    state.alarm,
    state.settings.soundEnabled,
    state.settings.hapticsEnabled,
    isTodayTaken,
    isInPause,
    today,
    snoozeUntil,
  ]);

  const alarmCountdown = useMemo(() => getTimeUntilAlarm(state.alarm.time), [state.alarm.time, nowTick]);

  // Remaining active pills in current blister + stock packs
  const remainingPillsInCurrentPack = useMemo(() => {
    let taken = 0;
    for (let i = 0; i < totalPhysicalPills; i++) {
      const d = addDays(state.blister.packStartDate, i);
      const st = state.entries[d]?.status;
      if (st === 'taken' || st === 'late') taken++;
    }
    return Math.max(0, totalPhysicalPills - taken);
  }, [state.blister.packStartDate, state.entries, totalPhysicalPills]);

  const totalRemainingStockPills =
    remainingPillsInCurrentPack + state.settings.packsInStock * totalPhysicalPills;
  const showRefillWarning =
    state.alarm.refillReminderEnabled &&
    totalRemainingStockPills <= state.alarm.refillThresholdDays;

  // Compute current intake streak
  const streak = useMemo(() => {
    let count = 0;
    for (let offset = 0; offset < 90; offset++) {
      const d = addDays(today, -offset);
      const st = state.entries[d]?.status;
      if (st === 'taken' || st === 'late') {
        count++;
      } else if (offset === 0) {
        // Today not popped yet doesn't break yesterday's streak
        continue;
      } else {
        break;
      }
    }
    return count;
  }, [state.entries, today]);

  // Actions
  const handlePopPill = (dayIndex: number, date: string) => {
    const nowIso = new Date().toISOString();
    const isToday = date === today;
    let status: 'taken' | 'late' = 'taken';
    let delayMinutes = 0;

    if (isToday) {
      const delta = getTimeUntilAlarm(state.alarm.time).minutesDeltaToday;
      delayMinutes = Math.max(0, delta);
      if (delta > 60) status = 'late';
    } else if (date < today) {
      status = 'late';
    }

    setState((prev) => ({
      ...prev,
      entries: {
        ...prev.entries,
        [date]: {
          dayIndex,
          date,
          status,
          takenAt: nowIso,
          delayMinutes,
        },
      },
    }));

    if (isToday) {
      setSnoozeUntil(null);
      setAlarmModalOpen(false);
    }

    const isPlacebo = dayIndex >= state.blister.activePills;
    const theme = state.blister.theme || 'classic_foil';
    showToast(
      theme === 'cat_bowl'
        ? `Napf #${dayIndex + 1} leergefressen & gespeichert!`
        : theme === 'cat_peek'
        ? `Miau! Kätzchen #${dayIndex + 1} schaut heraus!`
        : isPlacebo
        ? `Placebo #${dayIndex + 1} ausgedrückt ✓`
        : `Pille #${dayIndex + 1} ausgedrückt & gespeichert ✨`
    );
  };

  const handleUndoPill = (date: string) => {
    setState((prev) => {
      const nextEntries = { ...prev.entries };
      delete nextEntries[date];
      return { ...prev, entries: nextEntries };
    });
    showToast('Einnahme rückgängig gemacht');
  };

  const handleMarkMissed = (dayIndex: number, date: string) => {
    setState((prev) => ({
      ...prev,
      entries: {
        ...prev.entries,
        [date]: {
          dayIndex,
          date,
          status: 'missed',
        },
      },
    }));
    showToast('Als vergessen markiert – schau bei Bedarf in den Ratgeber');
  };

  const handleChangeTheme = (theme: BlisterThemeId) => {
    setState((prev) => ({
      ...prev,
      blister: { ...prev.blister, theme },
    }));
  };

  const handleSaveBlisterConfig = (updated: BlisterConfig) => {
    setState((prev) => ({
      ...prev,
      blister: updated,
    }));
    showToast(`Blister aktualisiert (${updated.activePills + updated.placeboPills} Pillen)`);
  };

  const handleStartNewPack = () => {
    const startDate = state.blister.packStartDate;
    const endDate = addDays(startDate, totalCycleDays - 1);
    let takenCount = 0;
    let lateCount = 0;
    let missedCount = 0;

    for (let i = 0; i < totalPhysicalPills; i++) {
      const d = addDays(startDate, i);
      const st = state.entries[d]?.status;
      if (st === 'taken') takenCount++;
      else if (st === 'late') lateCount++;
      else if (st === 'missed') missedCount++;
    }

    setState((prev) => ({
      ...prev,
      blister: {
        ...prev.blister,
        packStartDate: today,
      },
      settings: {
        ...prev.settings,
        packsInStock: Math.max(0, prev.settings.packsInStock - 1),
      },
      history: [
        {
          id: `pack-${Date.now()}`,
          brandName: prev.blister.brandName,
          startDate,
          endDate,
          totalPills: totalPhysicalPills,
          takenCount,
          lateCount,
          missedCount,
        },
        ...prev.history,
      ],
    }));

    setActiveTab('blister');
    showToast('Neuer Blister ab heute gestartet! 🎉');
  };

  const handleSaveDayLog = (log: DayLog) => {
    setState((prev) => ({
      ...prev,
      dayLogs: {
        ...prev.dayLogs,
        [log.date]: log,
      },
    }));
  };

  const handleTriggerTestAlarm = () => {
    const { title, body } = getAlarmNotificationText(state.alarm);
    fireBrowserNotification(title, body);
    playAlarmSound(state.alarm.soundId, true);
    triggerHaptic(state.settings.hapticsEnabled, 'heavy');
    setAlarmModalOpen(true);
  };

  const handleAlarmTakeNow = () => {
    setAlarmModalOpen(false);
    setActiveTab('blister');
    if (cycleDayIndex >= 0 && cycleDayIndex < totalPhysicalPills && !isTodayTaken) {
      playBlisterPopSound(state.settings.soundEnabled);
      triggerHaptic(state.settings.hapticsEnabled, 'heavy');
      handlePopPill(cycleDayIndex, today);
    }
  };

  const handleAlarmSnooze = () => {
    setAlarmModalOpen(false);
    setSnoozeUntil(Date.now() + state.alarm.snoozeMinutes * 60 * 1000);
    showToast(`Wecker schlummert für ${state.alarm.snoozeMinutes} Minuten ⏰`);
  };

  if (state.settings.pinEnabled && !unlocked) {
    return (
      <PinLockScreen
        expectedPin={state.settings.pinCode}
        onUnlock={() => setUnlocked(true)}
      />
    );
  }

  if (!state.profile) {
    return (
      <OnboardingScreen
        onComplete={(profile) => setState((prev) => ({ ...prev, profile }))}
      />
    );
  }

  const greeting = (() => {
    const h = new Date(nowTick).getHours();
    if (h < 11) return 'Guten Morgen';
    if (h < 18) return 'Hallo';
    return 'Guten Abend';
  })();

  return (
    <div className="min-h-screen bg-[#FAF6F5] text-[#2B1F24] flex flex-col items-center">
      {/* Main Mobile-First Centered App Container */}
      <div className="w-full max-w-md min-h-screen flex flex-col relative pb-24">
        {/* Top Header */}
        <header className="pt-safe px-5 pt-4 pb-3 flex items-center justify-between gap-2 sticky top-0 z-30 bg-[#FAF6F5]/88 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className="flex items-center gap-2.5 text-left min-w-0 flex-1"
            aria-label="Profil öffnen"
          >
            <ProfileAvatar avatar={state.profile.avatar} size={40} />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-rose-500 leading-none">
                {greeting}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-lg font-bold tracking-tight text-[#2B1F24] truncate leading-tight">
                  {state.profile.name}
                </span>
                <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
                  Tag {Math.max(1, Math.min(totalCycleDays, cycleDayIndex + 1))}/{totalCycleDays}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium leading-tight">
                {formatDateGerman(today)}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('alarm')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border text-xs font-bold shadow-xs transition active:scale-95 ${
              state.alarm.enabled
                ? 'bg-white border-rose-200 text-rose-700'
                : 'bg-slate-100 border-slate-200 text-slate-500'
            }`}
          >
            <BellRing className={`w-3.5 h-3.5 ${state.alarm.enabled ? 'text-rose-500' : ''}`} />
            {state.alarm.time}
          </button>
        </header>

        {/* Scrollable Tab Content */}
        <main className="flex-1 px-4 pt-1 space-y-4">
          {activeTab === 'blister' && (
            <>
              {/* Refill Alert if low stock */}
              {showRefillWarning && (
                <div className="rounded-2xl bg-amber-50 border border-amber-200 px-3.5 py-2.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-amber-900 font-medium">
                    <Package className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Nur noch <strong>{totalRemainingStockPills} Pillen</strong> im Vorrat – bald neues Rezept holen!
                    </span>
                  </div>
                </div>
              )}

              {/* Today Status Hero Banner */}
              {isInPause ? (
                <div className="rounded-3xl bg-gradient-to-r from-violet-500 to-rose-400 text-white p-4 shadow-md flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-violet-100 flex items-center gap-1">
                      <Droplets className="w-3.5 h-3.5" />
                      Einnahmepause • Tag {cycleDayIndex - totalPhysicalPills + 1} von {state.blister.pauseDays}
                    </span>
                    <p className="text-base font-extrabold mt-0.5">Heute keine Pille nötig</p>
                    <p className="text-xs text-white/85 mt-0.5">
                      Neuer Blister startet in {totalCycleDays - cycleDayIndex} Tag(en).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('calendar')}
                    className="shrink-0 px-3 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-xs font-bold backdrop-blur-xs transition"
                  >
                    Blutung loggen
                  </button>
                </div>
              ) : isTodayTaken ? (
                <div className="rounded-3xl bg-white border border-emerald-200/80 p-4 shadow-xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-sm shadow-emerald-200 shrink-0">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-slate-900">
                        Heutige Pille genommen!
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Ausgedrückt um {formatTimeFromIso(todayEntry?.takenAt)} • Serie: {streak} Tage 🔥
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl bg-white border border-rose-200/90 p-4 shadow-xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                        alarmCountdown.isPastToday
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-rose-100 text-rose-600'
                      }`}
                    >
                      {alarmCountdown.isPastToday ? (
                        <AlertTriangle className="w-5 h-5" />
                      ) : (
                        <Clock className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-slate-900">
                        {isTodayPlacebo
                          ? 'Heute: Placebo-Pille fällig'
                          : alarmCountdown.isPastToday
                          ? 'Heutige Pille noch offen'
                          : 'Bereit für deine heutige Pille'}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {alarmCountdown.isPastToday
                          ? `Wecker war um ${state.alarm.time} Uhr (${state.alarm.toleranceHours} Std. Schutzfenster)`
                          : `Wecker in ${alarmCountdown.hours} Std. ${alarmCountdown.minutes} Min. • Tippe unten auf „Heute“`}
                      </p>
                    </div>
                  </div>
                  {cycleDayIndex >= 0 && cycleDayIndex < totalPhysicalPills && (
                    <button
                      type="button"
                      onClick={() => {
                        playBlisterPopSound(state.settings.soundEnabled);
                        triggerHaptic(state.settings.hapticsEnabled, 'heavy');
                        handlePopPill(cycleDayIndex, today);
                      }}
                      className="shrink-0 px-3 py-2 rounded-xl bg-[#D94E6A] hover:bg-[#c23b57] text-white text-xs font-bold shadow-xs active:scale-95 transition"
                    >
                      Ausdrücken
                    </button>
                  )}
                </div>
              )}

              {/* INTERACTIVE REALISTIC BLISTER PACK */}
              <BlisterPack
                config={state.blister}
                entries={state.entries}
                soundEnabled={state.settings.soundEnabled}
                hapticsEnabled={state.settings.hapticsEnabled}
                pressToPopMode={state.settings.pressToPopMode}
                alarmTime={state.alarm.time}
                onPopPill={handlePopPill}
                onUndoPill={handleUndoPill}
                onMarkMissed={handleMarkMissed}
                onChangeTheme={handleChangeTheme}
                onOpenCustomizer={() => setCustomizerOpen(true)}
                onStartNewPack={handleStartNewPack}
              />

              {/* Subtle tactile tip */}
              <p className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5 pt-1">
                <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                Tippe auf eine Pille im Blister zum Ausdrücken • „Größe“ für andere Marken
              </p>
            </>
          )}

          {activeTab === 'calendar' && (
            <CalendarView
              blister={state.blister}
              entries={state.entries}
              dayLogs={state.dayLogs}
              onSaveDayLog={handleSaveDayLog}
            />
          )}

          {activeTab === 'alarm' && (
            <AlarmView
              alarm={state.alarm}
              soundEnabled={state.settings.soundEnabled}
              onChange={(updatedAlarm) =>
                setState((prev) => ({ ...prev, alarm: updatedAlarm }))
              }
              onTriggerTestAlarm={handleTriggerTestAlarm}
            />
          )}

          {activeTab === 'insights' && <InsightsView state={state} />}

          {activeTab === 'settings' && (
            <SettingsView
              state={state}
              onUpdateSettings={(patch) =>
                setState((prev) => ({
                  ...prev,
                  settings: { ...prev.settings, ...patch },
                }))
              }
              onOpenCustomizer={() => setCustomizerOpen(true)}
              onStartNewPack={handleStartNewPack}
              onUpdateProfile={(profile) => {
                setState((prev) => ({ ...prev, profile }));
                showToast('Profil gespeichert');
              }}
              onResetAll={() => {
                const fresh = createInitialState();
                setState((prev) => ({ ...fresh, profile: prev.profile }));
                setActiveTab('blister');
                showToast('Demo-Daten wurden zurückgesetzt');
              }}
            />
          )}
        </main>

        {/* Floating Toast */}
        {toast && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-slate-900/92 text-white text-xs font-semibold shadow-xl backdrop-blur-md whitespace-nowrap">
            {toast}
          </div>
        )}

        {/* Bottom iOS-Style Frosted Tab Bar */}
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-40 bg-white/88 backdrop-blur-xl border-t border-rose-100/90 px-2 pt-2 pb-safe shadow-[0_-8px_30px_rgba(43,31,36,0.06)]">
          <div className="grid grid-cols-5 gap-1">
            {(
              [
                { id: 'blister', label: 'Blister', icon: LayoutGrid },
                { id: 'calendar', label: 'Kalender', icon: CalendarDays },
                { id: 'alarm', label: 'Wecker', icon: BellRing },
                { id: 'insights', label: 'Ratgeber', icon: HeartPulse },
                { id: 'settings', label: 'Mehr', icon: Settings },
              ] as Array<{ id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }>
            ).map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex flex-col items-center justify-center py-1.5 rounded-2xl transition ${
                    active ? 'text-[#D94E6A]' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <div
                    className={`relative p-1 rounded-xl transition ${
                      active ? 'bg-rose-50' : ''
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.id === 'alarm' && state.alarm.enabled && (
                      <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
                    )}
                  </div>
                  <span
                    className={`text-[10px] mt-0.5 ${
                      active ? 'font-bold' : 'font-medium'
                    }`}
                  >
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Blister Size & Brand Customizer Modal */}
      {customizerOpen && (
        <BlisterCustomizerModal
          config={state.blister}
          onSave={handleSaveBlisterConfig}
          onClose={() => setCustomizerOpen(false)}
        />
      )}

      {/* Active Ringing Alarm Overlay Modal */}
      {alarmModalOpen && (
        <AlarmOverlayModal
          alarm={state.alarm}
          brandName={state.blister.brandName}
          onTakeNow={handleAlarmTakeNow}
          onSnooze={handleAlarmSnooze}
          onDismiss={() => setAlarmModalOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
