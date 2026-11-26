import React, { useState } from 'react';
import {
  SlidersHorizontal,
  Volume2,
  Vibrate,
  Lock,
  Package,
  Download,
  Trash2,
  RotateCcw,
  Hand,
  Check,
  Cat,
  ChevronDown,
  ChevronUp,
  Palette,
} from 'lucide-react';
import type { AppColorThemeId, AppState, CatNames, UserProfile } from '../types';
import { APP_COLOR_THEMES } from '../data/presets';
import { ProfileAvatar } from './ProfileAvatar';
import { ProfileForm } from './ProfileForm';
import { formatDateGerman } from '../utils/date';

interface SettingsViewProps {
  state: AppState;
  onUpdateSettings: (patch: Partial<AppState['settings']>) => void;
  onUpdateProfile: (profile: UserProfile) => void;
  onOpenCustomizer: () => void;
  onStartNewPack: () => void;
  onClearProgress: () => void;
  onResetAll: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  state,
  onUpdateSettings,
  onUpdateProfile,
  onOpenCustomizer,
  onStartNewPack,
  onClearProgress,
  onResetAll,
}) => {
  const [pinDraft, setPinDraft] = useState(state.settings.pinCode);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [catsOpen, setCatsOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmFullReset, setConfirmFullReset] = useState(false);

  const profile = state.profile;
  const catNames = state.settings.catNames;

  const updateCatName = (key: keyof CatNames, value: string) => {
    onUpdateSettings({
      catNames: {
        ...catNames,
        [key]: value,
      },
    });
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pille-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportSuccess(true);
    window.setTimeout(() => setExportSuccess(false), 2500);
  };

  const catList: Array<{ key: keyof CatNames; img: string; placeholder: string }> = [
    { key: 'walker', img: '/assets/cat-walker.png', placeholder: 'Napf-Katze' },
    { key: 'peek0', img: '/assets/cat-peek-0.png', placeholder: 'Kätzchen 1' },
    { key: 'peek1', img: '/assets/cat-peek-1.png', placeholder: 'Kätzchen 2' },
    { key: 'peek2', img: '/assets/cat-peek-2.png', placeholder: 'Kätzchen 3' },
    { key: 'peek3', img: '/assets/cat-peek-3.png', placeholder: 'Kätzchen 4' },
  ];

  return (
    <div className="space-y-3.5">
      {/* Profile Card */}
      {profile && (
        <div className="bg-white rounded-3xl p-4 border border-rose-100/80 shadow-xs">
          {editingProfile ? (
            <ProfileForm
              initial={profile}
              catNames={catNames}
              submitLabel="Speichern"
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
                  <ProfileAvatar avatar={profile.avatar} size={48} />
                  <div className="min-w-0">
                    <p className="text-base font-bold text-slate-900 truncate">{profile.name}</p>
                    {profile.age && <p className="text-xs text-slate-500">{profile.age} Jahre</p>}
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
                    <div className="rounded-2xl bg-slate-50 p-2.5">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase">Pille seit</p>
                      <p className="font-bold text-slate-800 mt-0.5">
                        {formatDateGerman(profile.pillSince)}
                      </p>
                    </div>
                  )}
                  {profile.cycleLength && (
                    <div className="rounded-2xl bg-slate-50 p-2.5">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase">Zyklus</p>
                      <p className="font-bold text-slate-800 mt-0.5">{profile.cycleLength} Tage</p>
                    </div>
                  )}
                  {profile.doctor && (
                    <div className="col-span-2 rounded-2xl bg-slate-50 p-2.5">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase">Praxis</p>
                      <p className="font-bold text-slate-800 mt-0.5">{profile.doctor}</p>
                    </div>
                  )}
                  {profile.notes && (
                    <div className="col-span-2 rounded-2xl bg-slate-50 p-2.5">
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

      {/* App Grundfarbe */}
      <div className="bg-white rounded-3xl p-4 border border-rose-100/80 shadow-xs space-y-2.5">
        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <Palette className="w-4 h-4 app-accent-text" />
          App-Farbe
        </span>
        <div className="grid grid-cols-6 gap-2">
          {APP_COLOR_THEMES.map((theme) => {
            const active = (state.settings.appColor || 'rose') === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => onUpdateSettings({ appColor: theme.id as AppColorThemeId })}
                className="flex flex-col items-center gap-1 active:scale-95 transition"
              >
                <span
                  className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition ${
                    active ? 'scale-110 shadow-md border-slate-900' : 'border-white shadow-xs'
                  }`}
                  style={{ backgroundColor: theme.swatch }}
                >
                  {active && <Check className="w-4 h-4 text-white" />}
                </span>
                <span className={`text-[10px] ${active ? 'font-bold text-slate-900' : 'text-slate-500'}`}>
                  {theme.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Blister Quick Card */}
      <button
        type="button"
        onClick={onOpenCustomizer}
        className="w-full text-left bg-white rounded-3xl p-4 border border-rose-100/80 shadow-xs flex items-center justify-between active:scale-[0.99] transition"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">Blister & Design</p>
            <p className="text-xs text-slate-500">
              {state.blister.brandName ? `${state.blister.brandName} • ` : ''}
              {state.blister.activePills}
              {state.blister.placeboPills > 0 ? `+${state.blister.placeboPills} Placebo` : ''}
              {state.blister.pauseDays > 0 ? `+${state.blister.pauseDays} Pause` : ''}
            </p>
          </div>
        </div>
        <span className="text-xs font-bold text-rose-600">Ändern</span>
      </button>

      {/* Name Your Cats Card */}
      <div className="bg-white rounded-3xl p-4 border border-rose-100/80 shadow-xs">
        <button
          type="button"
          onClick={() => setCatsOpen((v) => !v)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Cat className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-slate-900">Katzen benennen</p>
              <p className="text-xs text-slate-500 truncate max-w-[200px]">
                {catNames.walker}, {catNames.peek0}, {catNames.peek1}, …
              </p>
            </div>
          </div>
          {catsOpen ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {catsOpen && (
          <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-2.5">
            {catList.map((c) => (
              <div key={c.key} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-amber-50/70 border border-rose-100 shrink-0 flex items-center justify-center">
                  <img
                    src={c.img}
                    alt=""
                    className={`w-full h-full object-cover ${c.key === 'walker' ? 'object-contain p-0.5' : 'scale-125'}`}
                  />
                </div>
                <input
                  type="text"
                  maxLength={20}
                  value={catNames[c.key]}
                  onChange={(e) => updateCatName(c.key, e.target.value)}
                  placeholder={c.placeholder}
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-800 focus:outline-none focus:border-rose-400 focus:bg-white"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pack Stock */}
      <div className="bg-white rounded-3xl p-4 border border-rose-100/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Package className="w-4 h-4 text-rose-500" />
            Vorrat
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                onUpdateSettings({ packsInStock: Math.max(0, state.settings.packsInStock - 1) })
              }
              className="w-9 h-9 rounded-xl bg-slate-100 font-bold text-slate-700 active:scale-95"
            >
              −
            </button>
            <span className="w-20 text-center text-xs font-extrabold text-slate-800">
              {state.settings.packsInStock} Blister
            </span>
            <button
              type="button"
              onClick={() => onUpdateSettings({ packsInStock: state.settings.packsInStock + 1 })}
              className="w-9 h-9 rounded-xl bg-slate-100 font-bold text-slate-700 active:scale-95"
            >
              +
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={onStartNewPack}
          className="w-full py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition"
        >
          Neuen Blister ab heute starten
        </button>
      </div>

      {/* Sound, Haptics & Pop Mode */}
      <div className="bg-white rounded-3xl p-4 border border-rose-100/80 shadow-xs space-y-3">
        <label className="flex items-center justify-between cursor-pointer py-0.5">
          <span className="flex items-center gap-2.5 text-xs font-semibold text-slate-700">
            <Volume2 className="w-4 h-4 text-rose-500" />
            Ton
          </span>
          <input
            type="checkbox"
            checked={state.settings.soundEnabled}
            onChange={(e) => onUpdateSettings({ soundEnabled: e.target.checked })}
            className="w-5 h-5 accent-[#D94E6A]"
          />
        </label>

        <label className="flex items-center justify-between cursor-pointer py-0.5">
          <span className="flex items-center gap-2.5 text-xs font-semibold text-slate-700">
            <Vibrate className="w-4 h-4 text-rose-500" />
            Vibration
          </span>
          <input
            type="checkbox"
            checked={state.settings.hapticsEnabled}
            onChange={(e) => onUpdateSettings({ hapticsEnabled: e.target.checked })}
            className="w-5 h-5 accent-[#D94E6A]"
          />
        </label>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <Hand className="w-4 h-4 text-rose-500" />
            Ausdrücken
          </span>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => onUpdateSettings({ pressToPopMode: 'tap' })}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                state.settings.pressToPopMode === 'tap'
                  ? 'bg-rose-50 text-rose-700 border-rose-400'
                  : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
            >
              Tippen
            </button>
            <button
              type="button"
              onClick={() => onUpdateSettings({ pressToPopMode: 'hold' })}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                state.settings.pressToPopMode === 'hold'
                  ? 'bg-rose-50 text-rose-700 border-rose-400'
                  : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
            >
              Halten
            </button>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 space-y-2.5">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="flex items-center gap-2.5 text-xs font-semibold text-slate-700">
              <Lock className="w-4 h-4 text-rose-500" />
              PIN-Sperre
            </span>
            <input
              type="checkbox"
              checked={state.settings.pinEnabled}
              onChange={(e) => onUpdateSettings({ pinEnabled: e.target.checked })}
              className="w-5 h-5 accent-[#D94E6A]"
            />
          </label>

          {state.settings.pinEnabled && (
            <div className="flex items-center gap-2">
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pinDraft}
                onChange={(e) => setPinDraft(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="4 Ziffern"
                className="flex-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono tracking-widest text-center"
              />
              <button
                type="button"
                disabled={pinDraft.length !== 4}
                onClick={() => onUpdateSettings({ pinCode: pinDraft })}
                className="px-4 py-2 rounded-xl bg-[#D94E6A] disabled:opacity-40 text-white text-xs font-bold"
              >
                Speichern
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Data & Delete State */}
      <div className="bg-white rounded-3xl p-4 border border-rose-100/80 shadow-xs space-y-2.5">
        <button
          type="button"
          onClick={handleExportJson}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition"
        >
          {exportSuccess ? (
            <Check className="w-4 h-4 text-emerald-600" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {exportSuccess ? 'Backup gespeichert' : 'Backup exportieren'}
        </button>

        {/* Clear current pill & calendar progress */}
        {!confirmClear ? (
          <button
            type="button"
            onClick={() => {
              setConfirmClear(true);
              setConfirmFullReset(false);
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200/80 transition"
          >
            <Trash2 className="w-4 h-4" />
            Stand löschen (Blister & Kalender leeren)
          </button>
        ) : (
          <div className="rounded-2xl bg-amber-50 border border-amber-300 p-3 space-y-2">
            <p className="text-xs font-bold text-amber-950 text-center">
              Alle Einnahmen & Einträge löschen?
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="py-2 rounded-xl bg-white text-slate-700 text-xs font-bold border border-slate-200"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmClear(false);
                  onClearProgress();
                }}
                className="py-2 rounded-xl bg-amber-600 text-white text-xs font-bold"
              >
                Ja, löschen
              </button>
            </div>
          </div>
        )}

        {/* Full factory reset including profile */}
        {!confirmFullReset ? (
          <button
            type="button"
            onClick={() => {
              setConfirmFullReset(true);
              setConfirmClear(false);
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition"
          >
            <RotateCcw className="w-4 h-4" />
            Alles zurücksetzen (inkl. Profil)
          </button>
        ) : (
          <div className="rounded-2xl bg-rose-50 border border-rose-300 p-3 space-y-2">
            <p className="text-xs font-bold text-rose-950 text-center">
              Wirklich alles inkl. Profil löschen?
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setConfirmFullReset(false)}
                className="py-2 rounded-xl bg-white text-slate-700 text-xs font-bold border border-slate-200"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmFullReset(false);
                  onResetAll();
                }}
                className="py-2 rounded-xl bg-rose-600 text-white text-xs font-bold"
              >
                Alles löschen
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
