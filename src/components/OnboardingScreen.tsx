import React from 'react';
import type { CatNames, UserProfile } from '../types';
import { ProfileForm } from './ProfileForm';

interface OnboardingScreenProps {
  catNames: CatNames;
  onComplete: (profile: UserProfile) => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ catNames, onComplete }) => {
  return (
    <div className="min-h-screen bg-[#FAF6F5] flex flex-col items-center justify-center">
      <div className="w-full max-w-md px-5 pt-safe pb-8">
        <div className="pt-4 pb-5 text-center">
          <div className="w-20 h-20 mx-auto">
            <img
              src="/assets/cat-walker.png"
              alt=""
              className="w-full h-full object-contain drop-shadow-md animate-cat-idle"
            />
          </div>
          <h1
            className="text-3xl font-bold text-[#2B1F24] mt-2"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            Pille
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Dein Profil — nur der Name ist Pflicht.
          </p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-rose-100 shadow-sm">
          <ProfileForm catNames={catNames} submitLabel="Starten" onSubmit={onComplete} />
        </div>

        <p className="text-[11px] text-slate-400 text-center mt-4">
          100 % lokal auf deinem Gerät.
        </p>
      </div>
    </div>
  );
};
