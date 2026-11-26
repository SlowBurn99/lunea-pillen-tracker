import React from 'react';
import { Moon, Flower2 } from 'lucide-react';
import type { AvatarId, CatNames } from '../types';

export function getAvatarOptions(catNames?: CatNames): Array<{ id: AvatarId; label: string }> {
  return [
    { id: 'cat0', label: catNames?.peek0 || 'Katze 1' },
    { id: 'cat1', label: catNames?.peek1 || 'Katze 2' },
    { id: 'cat2', label: catNames?.peek2 || 'Katze 3' },
    { id: 'cat3', label: catNames?.peek3 || 'Katze 4' },
    { id: 'moon', label: 'Mond' },
    { id: 'flower', label: 'Blüte' },
  ];
}

interface ProfileAvatarProps {
  avatar: AvatarId;
  size?: number;
  className?: string;
}

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({ avatar, size = 40, className = '' }) => {
  const style = { width: size, height: size };

  if (avatar.startsWith('cat')) {
    const idx = avatar.slice(3);
    return (
      <span
        className={`inline-block rounded-full overflow-hidden bg-slate-200 ring-2 ring-white shadow-sm shrink-0 ${className}`}
        style={style}
      >
        <img
          src={`./assets/cat-peek-${idx}.png`}
          alt=""
          draggable={false}
          className="w-full h-full object-cover scale-[1.35]"
        />
      </span>
    );
  }

  const Icon = avatar === 'moon' ? Moon : Flower2;
  const bg =
    avatar === 'moon'
      ? 'bg-gradient-to-br from-indigo-400 to-violet-600'
      : 'bg-gradient-to-br from-rose-300 to-pink-500';
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full text-white ring-2 ring-white shadow-sm shrink-0 ${bg} ${className}`}
      style={style}
    >
      <Icon style={{ width: size * 0.5, height: size * 0.5 }} />
    </span>
  );
};
