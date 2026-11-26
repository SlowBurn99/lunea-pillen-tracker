import React from 'react';
import { BellRing, Clock, Sparkles, X } from 'lucide-react';
import type { AlarmConfig } from '../types';
import { getAlarmNotificationText } from '../utils/notifications';

interface AlarmOverlayModalProps {
  alarm: AlarmConfig;
  brandName: string;
  onTakeNow: () => void;
  onSnooze: () => void;
  onDismiss: () => void;
}

export const AlarmOverlayModal: React.FC<AlarmOverlayModalProps> = ({
  alarm,
  brandName,
  onTakeNow,
  onSnooze,
  onDismiss,
}) => {
  const { title, body } = getAlarmNotificationText(alarm);

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/65 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-[32px] bg-white p-6 shadow-2xl border border-rose-100 text-center relative overflow-hidden">
        <button
          type="button"
          onClick={onDismiss}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
          aria-label="Schließen"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-18 h-18 mx-auto rounded-full bg-gradient-to-br from-[#F26B8A] to-[#C23A5C] text-white flex items-center justify-center shadow-lg shadow-rose-300/60">
          <BellRing className="w-9 h-9 animate-alarm-ring" />
        </div>

        <span className="inline-block mt-4 px-3 py-1 rounded-full bg-rose-50 text-rose-600 text-[11px] font-bold tracking-wider uppercase">
          {alarm.time} Uhr{brandName ? ` • ${brandName}` : ''}
        </span>

        <h2 className="text-xl font-extrabold text-slate-900 mt-2">{title}</h2>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{body}</p>

        <div className="mt-6 space-y-2.5">
          <button
            type="button"
            onClick={onTakeNow}
            className="w-full py-3.5 rounded-2xl bg-[#D94E6A] hover:bg-[#c23b57] text-white text-sm font-bold shadow-md shadow-rose-200 flex items-center justify-center gap-2 active:scale-[0.98] transition"
          >
            <Sparkles className="w-4 h-4" />
            Pille jetzt ausdrücken
          </button>

          <button
            type="button"
            onClick={onSnooze}
            className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition"
          >
            <Clock className="w-3.5 h-3.5" />
            Schlummern ({alarm.snoozeMinutes} Min.)
          </button>
        </div>
      </div>
    </div>
  );
};
