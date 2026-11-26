import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import type { AvatarId, CatNames, UserProfile } from '../types';
import { getAvatarOptions, ProfileAvatar } from './ProfileAvatar';

interface ProfileFormProps {
  initial?: UserProfile | null;
  catNames?: CatNames;
  submitLabel: string;
  onSubmit: (profile: UserProfile) => void;
  onCancel?: () => void;
  startExpanded?: boolean;
}

export const ProfileForm: React.FC<ProfileFormProps> = ({
  initial,
  catNames,
  submitLabel,
  onSubmit,
  onCancel,
  startExpanded = false,
}) => {
  const [name, setName] = useState(initial?.name ?? '');
  const [avatar, setAvatar] = useState<AvatarId>(initial?.avatar ?? 'cat0');
  const [age, setAge] = useState(initial?.age ? String(initial.age) : '');
  const [pillSince, setPillSince] = useState(initial?.pillSince ?? '');
  const [cycleLength, setCycleLength] = useState(
    initial?.cycleLength ? String(initial.cycleLength) : ''
  );
  const [doctor, setDoctor] = useState(initial?.doctor ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [showOptional, setShowOptional] = useState(startExpanded);
  const [touched, setTouched] = useState(false);

  const avatarOptions = getAvatarOptions(catNames);
  const trimmedName = name.trim();
  const nameInvalid = touched && trimmedName.length === 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!trimmedName) return;

    const ageNum = parseInt(age, 10);
    const cycleNum = parseInt(cycleLength, 10);

    onSubmit({
      name: trimmedName,
      avatar,
      age: Number.isFinite(ageNum) && ageNum > 0 && ageNum < 120 ? ageNum : undefined,
      pillSince: pillSince || undefined,
      cycleLength:
        Number.isFinite(cycleNum) && cycleNum >= 15 && cycleNum <= 60 ? cycleNum : undefined,
      doctor: doctor.trim() || undefined,
      notes: notes.trim() || undefined,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    });
  };

  const inputClass =
    'w-full px-3.5 py-2.5 rounded-2xl bg-white border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Avatar picker */}
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-2">Avatar</label>
        <div className="grid grid-cols-3 gap-2">
          {avatarOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setAvatar(opt.id)}
              className={`flex flex-col items-center gap-1 py-2 px-1 rounded-2xl transition ${
                avatar === opt.id
                  ? 'bg-rose-100 ring-2 ring-rose-400'
                  : 'bg-slate-50/70 hover:bg-rose-50'
              }`}
            >
              <ProfileAvatar avatar={opt.id} size={44} />
              <span className="text-[10px] font-semibold text-slate-600 truncate max-w-full px-1">
                {opt.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Name (required) */}
      <div>
        <label htmlFor="profile-name" className="block text-xs font-bold text-slate-700 mb-1.5">
          Name <span className="text-rose-500">*</span>
        </label>
        <input
          id="profile-name"
          type="text"
          autoComplete="given-name"
          value={name}
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setTouched(true)}
          placeholder="Dein Name"
          className={`${inputClass} ${nameInvalid ? 'border-rose-500 ring-2 focus:ring-rose-100' : ''}`}
        />
        {nameInvalid && (
          <p className="text-[11px] text-rose-600 font-medium mt-1">Bitte Namen eingeben.</p>
        )}
      </div>

      {/* Optional section toggle */}
      <button
        type="button"
        onClick={() => setShowOptional((v) => !v)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-rose-50/70 border border-rose-100 text-xs font-bold text-rose-800"
      >
        <span>Mehr Infos (optional)</span>
        {showOptional ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {showOptional && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Alter</label>
              <input
                type="number"
                inputMode="numeric"
                min={10}
                max={99}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="z. B. 24"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Zykluslänge
              </label>
              <input
                type="number"
                inputMode="numeric"
                min={15}
                max={60}
                value={cycleLength}
                onChange={(e) => setCycleLength(e.target.value)}
                placeholder="28 Tage"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Pille seit
            </label>
            <input
              type="date"
              value={pillSince}
              onChange={(e) => setPillSince(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Frauenarzt / Praxis
            </label>
            <input
              type="text"
              value={doctor}
              onChange={(e) => setDoctor(e.target.value)}
              placeholder="Optional"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Notizen</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional"
              className={inputClass}
            />
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-700 text-sm font-bold"
          >
            Abbrechen
          </button>
        )}
        <button
          type="submit"
          disabled={!trimmedName}
          className="flex-[2] py-3 rounded-2xl bg-[#D94E6A] disabled:opacity-40 text-white text-sm font-bold shadow-md shadow-rose-200 flex items-center justify-center gap-2 active:scale-[0.98] transition"
        >
          <Sparkles className="w-4 h-4" />
          {submitLabel}
        </button>
      </div>
    </form>
  );
};
