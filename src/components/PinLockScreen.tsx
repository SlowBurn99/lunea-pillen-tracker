import React, { useState } from 'react';
import { Lock, Delete } from 'lucide-react';

interface PinLockScreenProps {
  expectedPin: string;
  onUnlock: () => void;
}

export const PinLockScreen: React.FC<PinLockScreenProps> = ({ expectedPin, onUnlock }) => {
  const [entered, setEntered] = useState('');
  const [error, setError] = useState(false);

  const handleDigit = (d: string) => {
    if (entered.length >= 4) return;
    const next = entered + d;
    setEntered(next);
    setError(false);

    if (next.length === 4) {
      if (next === expectedPin) {
        onUnlock();
      } else {
        setError(true);
        window.setTimeout(() => {
          setEntered('');
          setError(false);
        }, 450);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-[#FAF6F5] flex flex-col items-center justify-center p-6">
      <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-[#F26B8A] to-[#C23A5C] text-white flex items-center justify-center shadow-lg mb-4">
        <Lock className="w-7 h-7" />
      </div>
      <h1 className="text-xl font-bold text-slate-900">Lunea entsperren</h1>
      <p className="text-xs text-slate-500 mt-1">Gib deinen 4-stelligen Privatsphäre-PIN ein</p>

      <div className="flex gap-3.5 my-7">
        {[0, 1, 2, 3].map((idx) => (
          <span
            key={idx}
            className={`w-4 h-4 rounded-full transition-all ${
              error
                ? 'bg-red-500 scale-110'
                : idx < entered.length
                ? 'bg-[#D94E6A] scale-110'
                : 'bg-rose-200'
            }`}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3.5 w-64">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
          <button
            key={digit}
            type="button"
            onClick={() => handleDigit(digit)}
            className="h-15 rounded-2xl bg-white border border-rose-100 shadow-xs text-xl font-bold text-slate-800 hover:bg-rose-50 active:scale-95 transition"
          >
            {digit}
          </button>
        ))}
        <div />
        <button
          type="button"
          onClick={() => handleDigit('0')}
          className="h-15 rounded-2xl bg-white border border-rose-100 shadow-xs text-xl font-bold text-slate-800 hover:bg-rose-50 active:scale-95 transition"
        >
          0
        </button>
        <button
          type="button"
          onClick={() => setEntered((e) => e.slice(0, -1))}
          className="h-15 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 active:scale-95 transition"
          aria-label="Löschen"
        >
          <Delete className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
