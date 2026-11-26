import React from 'react';
import type { UserProfile } from '../types';
import { ProfileForm } from './ProfileForm';

interface OnboardingScreenProps {
  onComplete: (profile: UserProfile) => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  return (
    <div className="min-h-screen bg-[#FAF6F5] flex flex-col items-center">
      <div className="w-full max-w-md px-5 pt-safe pb-10">
        <div className="pt-8 pb-6 text-center">
          <div className="relative w-24 h-24 mx-auto">
            <img
              src="/assets/cat-walker.png"
              alt=""
              className="w-full h-full object-contain drop-shadow-md animate-cat-idle"
            />
          </div>
          <h1
            className="text-3xl font-bold text-[#2B1F24] mt-3"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            Willkommen bei Lunea
          </h1>
          <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
            Lass uns kurz dein Profil anlegen. Nur dein Name ist Pflicht, alles andere kannst du
            später ergänzen.
          </p>
        </div>

        <div className="bg-white/80 rounded-3xl p-5 border border-rose-100 shadow-sm">
          <ProfileForm submitLabel="Los geht's" onSubmit={onComplete} />
        </div>

        <p className="text-[11px] text-slate-400 text-center mt-4 leading-relaxed">
          Deine Daten bleiben ausschließlich auf deinem Gerät gespeichert.
        </p>
      </div>
    </div>
  );
};
