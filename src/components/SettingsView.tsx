import React, { useState } from 'react';
import {
  SlidersHorizontal,
  Volume2,
  Vibrate,
  Lock,
  Package,
  Download,
  Printer,
  RotateCcw,
  Smartphone,
  Hand,
  Check,
} from 'lucide-react';
import type { AppState, UserProfile } from '../types';
import { ProfileAvatar } from './ProfileAvatar';
import { ProfileForm } from './ProfileForm';
import { formatDateGerman } from '../utils/date';

interface SettingsViewProps {
  state: AppState;
  onUpdateSettings: (patch: Partial<AppState['settings']>) => void;
  onUpdateProfile: (profile: UserProfile) => void;
  onOpenCustomizer: () => void;
  onStartNewPack: () => void;
  onResetAll: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  state,
  onUpdateSettings,
  onUpdateProfile,
  onOpenCustomizer,
  onStartNewPack,
  onResetAll,
}) => {
  const [pinDraft, setPinDraft] = useState(state.settings.pinCode);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const profile = state.profile;

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lunea-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportSuccess(true);
    window.setTimeout(() => setExportSuccess(false), 2500);
  };

  return (
    <div className="space-y-4">
      {/* Profile Card */}
      {profile && (
        <div className="bg-white rounded-3xl p-4 border border-rose-100/80 shadow-xs">
          {editingProfile ? (
            <ProfileForm
              initial={profile}
              submitLabel="Profil speichern"
              startExpanded
              onCancel={() => setEditingProfile(false)}
              onSubmit={(p) => {
                onUpdateProfile(p);
                setEditingProfile(false);
              }}
            />
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <ProfileAvatar avatar={profile.avatar} size={52} />
                  <div className="min-w-0">
                    <p className="text-base font-bold text-slate-900 truncate">{profile.name}</p>
                    <p className="text-xs text-slate-500">
                      {profile.age ? `${profile.age} Jahre` : 'Alter nicht angegeben'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingProfile(true)}
                  className="shrink-0 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200"
                >
                  Bearbeiten
                </button>
              </div>

              {(profile.pillSince || profile.cycleLength || profile.doctor || profile.notes) && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {profile.pillSince && (
                    <div className="rounded-2xl bg-slate-50 p-2.5 border border-slate-100">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase">Pille seit</p>
                      <p className="font-bold text-slate-800 mt-0.5">
                        {formatDateGerman(profile.pillSince)}
                      </p>
                    </div>
                  )}
                  {profile.cycleLength && (
                    <div className="rounded-2xl bg-slate-50 p-2.5 border border-slate-100">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase">Natürl. Zyklus</p>
                      <p className="font-bold text-slate-800 mt-0.5">{profile.cycleLength} Tage</p>
                    </div>
                  )}
                  {profile.doctor && (
                    <div className="col-span-2 rounded-2xl bg-slate-50 p-2.5 border border-slate-100">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase">Frauenarzt</p>
                      <p className="font-bold text-slate-800 mt-0.5">{profile.doctor}</p>
                    </div>
                  )}
                  {profile.notes && (
                    <div className="col-span-2 rounded-2xl bg-slate-50 p-2.5 border border-slate-100">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase">Notizen</p>
                      <p className="text-slate-700 mt-0.5">{profile.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Blister Quick Card */}
      <button
        type="button"
        onClick={onOpenCustomizer}
        className="w-full text-left bg-white rounded-3xl p-4 border border-rose-200/80 shadow-xs flex items-center justify-between hover:bg-rose-50/40 transition"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">Blister-Größe & Marke anpassen</p>
            <p className="text-xs text-slate-500">
              {state.blister.brandName} • {state.blister.activePills} Wirkstoff
              {state.blister.placeboPills > 0 ? ` + ${state.blister.placeboPills} Placebo` : ''}
              {state.blister.pauseDays > 0 ? ` + ${state.blister.pauseDays} Tage Pause` : ''}
            </p>
          </div>
        </div>
        <span className="text-xs font-bold text-rose-600">Ändern →</span>
      </button>

      {/* Pack Stock / Prescription Counter */}
      <div className="bg-white rounded-3xl p-4 border border-rose-100/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Package className="w-4 h-4 text-rose-500" />
            Packungsvorrat (Rezept-Tracker)
          </span>
          <span className="text-xs font-bold text-rose-600">
            {state.settings.packsInStock} Blister vorrätig
          </span>
        </div>

        <div className="flex items-center justify-between bg-slate-50 rounded-2xl p-2 border border-slate-200/70">
          <button
            type="button"
            onClick={() =>
              onUpdateSettings({ packsInStock: Math.max(0, state.settings.packsInStock - 1) })
            }
            className="w-10 h-9 rounded-xl bg-white border border-slate-200 font-bold text-slate-700 hover:bg-slate-100"
          >
            −
          </button>
          <span className="text-sm font-extrabold text-slate-800">
            {state.settings.packsInStock} Packung{state.settings.packsInStock === 1 ? '' : 'en'} zu Hause
          </span>
          <button
            type="button"
            onClick={() => onUpdateSettings({ packsInStock: state.settings.packsInStock + 1 })}
            className="w-10 h-9 rounded-xl bg-white border border-slate-200 font-bold text-slate-700 hover:bg-slate-100"
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={onStartNewPack}
          className="w-full py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition"
        >
          Jetzt neuen Blister ab heute starten
        </button>
      </div>

      {/* Sound, Haptics & Pop Feel */}
      <div className="bg-white rounded-3xl p-4 border border-rose-100/80 shadow-xs space-y-3.5">
        <span className="text-xs font-bold text-slate-800 block">Haptik, Sound & Ausdrücken</span>

        <label className="flex items-center justify-between cursor-pointer">
          <span className="flex items-center gap-2 text-xs font-medium text-slate-700">
            <Volume2 className="w-4 h-4 text-rose-500" />
            Blister-Pop-Geräusch (Alufolie)
          </span>
          <input
            type="checkbox"
            checked={state.settings.soundEnabled}
            onChange={(e) => onUpdateSettings({ soundEnabled: e.target.checked })}
            className="w-4 h-4 accent-[#D94E6A]"
          />
        </label>

        <label className="flex items-center justify-between cursor-pointer">
          <span className="flex items-center gap-2 text-xs font-medium text-slate-700">
            <Vibrate className="w-4 h-4 text-rose-500" />
            Haptisches Feedback (Vibration)
          </span>
          <input
            type="checkbox"
            checked={state.settings.hapticsEnabled}
            onChange={(e) => onUpdateSettings({ hapticsEnabled: e.target.checked })}
            className="w-4 h-4 accent-[#D94E6A]"
          />
        </label>

        <div className="pt-2 border-t border-slate-100">
          <span className="flex items-center gap-2 text-xs font-medium text-slate-700 mb-2">
            <Hand className="w-4 h-4 text-rose-500" />
            Ausdrück-Geste
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onUpdateSettings({ pressToPopMode: 'tap' })}
              className={`py-2 rounded-xl text-xs font-bold border transition ${
                state.settings.pressToPopMode === 'tap'
                  ? 'bg-rose-50 text-rose-700 border-rose-400'
                  : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
            >
              Einfach tippen
            </button>
            <button
              type="button"
              onClick={() => onUpdateSettings({ pressToPopMode: 'hold' })}
              className={`py-2 rounded-xl text-xs font-bold border transition ${
                state.settings.pressToPopMode === 'hold'
                  ? 'bg-rose-50 text-rose-700 border-rose-400'
                  : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
            >
              Drücken & Ausdrücken
            </button>
          </div>
        </div>
      </div>

      {/* Privacy PIN Lock */}
      <div className="bg-white rounded-3xl p-4 border border-rose-100/80 shadow-xs space-y-3">
        <label className="flex items-center justify-between cursor-pointer">
          <span className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <Lock className="w-4 h-4 text-rose-500" />
            App-PIN-Sperre (Privatsphäre)
          </span>
          <input
            type="checkbox"
            checked={state.settings.pinEnabled}
            onChange={(e) => onUpdateSettings({ pinEnabled: e.target.checked })}
            className="w-4 h-4 accent-[#D94E6A]"
          />
        </label>

        {state.settings.pinEnabled && (
          <div className="flex items-center gap-2 pt-1">
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pinDraft}
              onChange={(e) => setPinDraft(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="4-stelliger PIN"
              className="flex-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono tracking-widest text-center"
            />
            <button
              type="button"
              disabled={pinDraft.length !== 4}
              onClick={() => onUpdateSettings({ pinCode: pinDraft })}
              className="px-4 py-2 rounded-xl bg-[#D94E6A] disabled:opacity-40 text-white text-xs font-bold"
            >
              PIN speichern
            </button>
          </div>
        )}
      </div>

      {/* iOS / Android Deployment Info */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-3xl p-4 space-y-2 shadow-sm">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-rose-300" />
          <span className="text-xs font-bold">iOS App & Android APK Ready (Capacitor + PWA)</span>
        </div>
        <p className="text-[11px] text-slate-300 leading-relaxed">
          • <strong>Sofort auf dem iPhone testen:</strong> In Safari öffnen → Teilen → <em>„Zum Home-Bildschirm“</em>.<br />
          • <strong>Native iOS App / Android APK:</strong> Das Projekt ist bereits mit <code>Capacitor</code> &amp; nativen <code>LocalNotifications</code> vorkonfiguriert (<code>npm run cap:ios</code> / <code>cap:android</code>).
        </p>
      </div>

      {/* Backup, Print & Reset */}
      <div className="bg-white rounded-3xl p-4 border border-rose-100/80 shadow-xs space-y-2.5">
        <span className="text-xs font-bold text-slate-800 block">Daten & Arztbericht</span>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleExportJson}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition"
          >
            {exportSuccess ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Download className="w-3.5 h-3.5" />}
            {exportSuccess ? 'Gespeichert!' : 'Backup (JSON)'}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition"
          >
            <Printer className="w-3.5 h-3.5" />
            Drucken / PDF
          </button>
        </div>

        <button
          type="button"
          onClick={onResetAll}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Demo-Daten zurücksetzen
        </button>
      </div>
    </div>
  );
};
