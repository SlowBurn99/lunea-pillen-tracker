import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  RotateCw,
  SlidersHorizontal,
  Sparkles,
  Check,
  AlertCircle,
  Clock,
  RefreshCw,
  Droplets,
  Undo2,
  X,
  Cat,
  Flower2,
  Disc,
  Utensils,
} from 'lucide-react';
import type { BlisterConfig, BlisterThemeId, PillEntry } from '../types';
import { BLISTER_THEMES, PILL_COLORS } from '../data/presets';
import {
  addDays,
  diffDays,
  formatDateShort,
  formatTimeFromIso,
  getTodayIso,
  getWeekdayShort,
} from '../utils/date';
import {
  playBlisterPopSound,
  playCatMunchSound,
  playCatPeekSound,
  triggerHaptic,
} from '../utils/sound';

interface BlisterPackProps {
  config: BlisterConfig;
  entries: Record<string, PillEntry>;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  pressToPopMode: 'tap' | 'hold';
  alarmTime: string;
  onPopPill: (dayIndex: number, date: string) => void;
  onUndoPill: (date: string) => void;
  onMarkMissed: (dayIndex: number, date: string) => void;
  onChangeTheme: (theme: BlisterThemeId) => void;
  onOpenCustomizer: () => void;
  onStartNewPack: () => void;
}

interface PopAnimationState {
  dayIndex: number;
  colorGradient: string;
}

interface PawPrint {
  id: number;
  x: number;
  y: number;
  angle: number;
}

const ROTATION_SEEDS = [12, 74, 138, 196, 251, 314, 43, 109, 172, 229, 287, 342];

const THEME_ICONS: Record<BlisterThemeId, React.ComponentType<{ className?: string }>> = {
  classic_foil: Disc,
  cat_peek: Cat,
  cat_bowl: Utensils,
  rosegold_bloom: Flower2,
};

export const BlisterPack: React.FC<BlisterPackProps> = ({
  config,
  entries,
  soundEnabled,
  hapticsEnabled,
  pressToPopMode,
  onPopPill,
  onUndoPill,
  onMarkMissed,
  onChangeTheme,
  onOpenCustomizer,
  onStartNewPack,
}) => {
  const today = getTodayIso();
  const theme: BlisterThemeId = config.theme || 'classic_foil';
  const isCatBowl = theme === 'cat_bowl';
  const isCatPeek = theme === 'cat_peek';
  const isRoseGold = theme === 'rosegold_bloom';

  const [isBackView, setIsBackView] = useState(false);
  const [poppingAnim, setPoppingAnim] = useState<PopAnimationState | null>(null);
  const [pressingIndex, setPressingIndex] = useState<number | null>(null);
  const [selectedPill, setSelectedPill] = useState<{
    dayIndex: number;
    date: string;
    isPlacebo: boolean;
    entry?: PillEntry;
    isFuture: boolean;
  } | null>(null);
  const [activeBlock, setActiveBlock] = useState(0);

  // Cat Bowl live walking & eating state
  const cardRef = useRef<HTMLDivElement | null>(null);
  const pocketRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const [catPos, setCatPos] = useState<{ x: number; y: number } | null>(null);
  const [catFacing, setCatFacing] = useState<'left' | 'right'>('right');
  const [catState, setCatState] = useState<'idle' | 'walking' | 'eating'>('idle');
  const [catWalkMs, setCatWalkMs] = useState(550);
  const [eatingBowlIndex, setEatingBowlIndex] = useState<number | null>(null);
  const [pawPrints, setPawPrints] = useState<PawPrint[]>([]);
  const catTimersRef = useRef<number[]>([]);

  const holdTimerRef = useRef<number | null>(null);
  const didHoldPopRef = useRef(false);

  const clearCatTimers = () => {
    catTimersRef.current.forEach((id) => window.clearTimeout(id));
    catTimersRef.current = [];
  };

  useEffect(() => {
    return () => clearCatTimers();
  }, []);

  // Reset back view when switching to cat_bowl (bowl mat has no foil back)
  useEffect(() => {
    if (isCatBowl && isBackView) {
      setIsBackView(false);
    }
  }, [isCatBowl, isBackView]);

  const totalPhysicalPills = config.activePills + config.placeboPills;
  const totalCycleDays = totalPhysicalPills + config.pauseDays;
  const currentCycleIndex = diffDays(config.packStartDate, today);

  const isMultiSheet = totalPhysicalPills > 35;
  const sheetSize = 28;
  const totalSheets = isMultiSheet ? Math.ceil(totalPhysicalPills / sheetSize) : 1;

  const currentSheet = Math.min(activeBlock, totalSheets - 1);
  const sheetStart = isMultiSheet ? currentSheet * sheetSize : 0;
  const sheetEnd = isMultiSheet
    ? Math.min(sheetStart + sheetSize, totalPhysicalPills)
    : totalPhysicalPills;

  const pills = useMemo(() => {
    const list: Array<{
      dayIndex: number;
      date: string;
      weekday: string;
      isPlacebo: boolean;
      isToday: boolean;
      isPast: boolean;
      isFuture: boolean;
      entry?: PillEntry;
    }> = [];

    for (let i = sheetStart; i < sheetEnd; i++) {
      const date = addDays(config.packStartDate, i);
      const entry = entries[date];
      list.push({
        dayIndex: i,
        date,
        weekday: getWeekdayShort(date),
        isPlacebo: i >= config.activePills,
        isToday: date === today,
        isPast: date < today,
        isFuture: date > today,
        entry,
      });
    }
    return list;
  }, [config.packStartDate, config.activePills, entries, sheetStart, sheetEnd, today]);

  const rows = useMemo(() => {
    const cols = Math.max(3, Math.min(7, config.columns));
    const result: Array<{
      rowIdx: number;
      isReversed: boolean;
      items: typeof pills;
    }> = [];

    for (let r = 0; r < Math.ceil(pills.length / cols); r++) {
      const slice = pills.slice(r * cols, (r + 1) * cols);
      const isReversed = config.arrowFlow === 'snake' && r % 2 === 1;
      result.push({
        rowIdx: r,
        isReversed,
        items: isReversed ? [...slice].reverse() : slice,
      });
    }
    return result;
  }, [pills, config.columns, config.arrowFlow]);

  const poppedCount = useMemo(() => {
    let count = 0;
    for (let i = 0; i < totalPhysicalPills; i++) {
      const d = addDays(config.packStartDate, i);
      const status = entries[d]?.status;
      if (status === 'taken' || status === 'late') count++;
    }
    return count;
  }, [totalPhysicalPills, config.packStartDate, entries]);

  // Measure pocket center relative to blister card
  const getPocketCenter = (dayIndex: number): { x: number; y: number } | null => {
    const cardEl = cardRef.current;
    const pocketEl = pocketRefs.current.get(dayIndex);
    if (!cardEl || !pocketEl) return null;
    const cardRect = cardEl.getBoundingClientRect();
    const pRect = pocketEl.getBoundingClientRect();
    return {
      x: pRect.left - cardRect.left + pRect.width / 2,
      y: pRect.top - cardRect.top + pRect.height / 2,
    };
  };

  // Position the cat neatly when entering Cat Bowl mode
  useEffect(() => {
    if (!isCatBowl) return;
    const raf = window.requestAnimationFrame(() => {
      // Find the last popped bowl on this sheet, or park beside today's/first bowl
      const poppedPills = pills.filter(
        (p) => p.entry?.status === 'taken' || p.entry?.status === 'late'
      );
      const anchor = poppedPills[poppedPills.length - 1] || pills[0];
      if (anchor) {
        const pt = getPocketCenter(anchor.dayIndex);
        if (pt) {
          setCatPos({ x: pt.x, y: Math.max(40, pt.y - 14) });
          setCatState('idle');
          return;
        }
      }
      setCatPos({ x: 56, y: 68 });
    });
    return () => window.cancelAnimationFrame(raf);
  }, [isCatBowl, config.columns, config.shape, currentSheet, totalPhysicalPills]);

  // Send the cat walking to the clicked bowl, munch it empty, and mark pill taken!
  const runCatToBowl = (dayIndex: number, date: string) => {
    clearCatTimers();
    const target = getPocketCenter(dayIndex);
    if (!target) {
      playCatMunchSound(soundEnabled);
      onPopPill(dayIndex, date);
      return;
    }

    const start = catPos || { x: 48, y: 56 };
    const dest = { x: target.x, y: Math.max(36, target.y - 12) };
    const dx = dest.x - start.x;
    const dy = dest.y - start.y;
    const dist = Math.hypot(dx, dy);
    const travelDuration = Math.max(360, Math.min(820, Math.round(dist * 3.1)));

    // Sprite natively faces LEFT, so walking right flips it horizontally
    setCatFacing(dx >= 0 ? 'right' : 'left');
    setCatWalkMs(travelDuration);
    setCatState('walking');
    setEatingBowlIndex(dayIndex);
    triggerHaptic(hapticsEnabled, 'light');

    // Generate cute pawprints along the path
    const steps = Math.min(5, Math.max(2, Math.floor(dist / 36)));
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    const prints: PawPrint[] = [];
    for (let s = 1; s <= steps; s++) {
      const frac = s / (steps + 1);
      prints.push({
        id: Date.now() + s,
        x: start.x + dx * frac + (s % 2 === 0 ? 4 : -4),
        y: start.y + dy * frac + 12,
        angle,
      });
    }
    setPawPrints(prints);

    // Move cat!
    window.requestAnimationFrame(() => {
      setCatPos(dest);
    });

    // Arrive & start munching
    const tArrive = window.setTimeout(() => {
      setCatState('eating');
      playCatMunchSound(soundEnabled);
      triggerHaptic(hapticsEnabled, 'medium');
    }, travelDuration);

    // Mid-munch: bowl empties & pill records as taken!
    const tEmpty = window.setTimeout(() => {
      onPopPill(dayIndex, date);
      triggerHaptic(hapticsEnabled, 'heavy');
    }, travelDuration + 320);

    // Finish eating & return to happy idle
    const tDone = window.setTimeout(() => {
      setCatState('idle');
      setEatingBowlIndex(null);
      setPawPrints([]);
    }, travelDuration + 820);

    catTimersRef.current = [tArrive, tEmpty, tDone];
  };

  const executePop = (dayIndex: number, date: string, isPlacebo: boolean) => {
    if (isCatBowl) {
      runCatToBowl(dayIndex, date);
      return;
    }

    const colorKey = isPlacebo ? config.placeboColor : config.activeColor;
    const colorStyle = PILL_COLORS[colorKey];

    if (isCatPeek) {
      playCatPeekSound(soundEnabled);
    } else {
      playBlisterPopSound(soundEnabled);
    }
    triggerHaptic(hapticsEnabled, 'heavy');

    setPoppingAnim({ dayIndex, colorGradient: colorStyle.gradient });
    onPopPill(dayIndex, date);

    window.setTimeout(() => {
      setPoppingAnim((prev) => (prev?.dayIndex === dayIndex ? null : prev));
    }, 760);
  };

  const handlePocketInteraction = (pill: (typeof pills)[number]) => {
    const isPopped = pill.entry?.status === 'taken' || pill.entry?.status === 'late';
    if (isPopped) {
      setSelectedPill({
        dayIndex: pill.dayIndex,
        date: pill.date,
        isPlacebo: pill.isPlacebo,
        entry: pill.entry,
        isFuture: pill.isFuture,
      });
      return;
    }

    if (pill.isFuture) {
      triggerHaptic(hapticsEnabled, 'light');
      setSelectedPill({
        dayIndex: pill.dayIndex,
        date: pill.date,
        isPlacebo: pill.isPlacebo,
        entry: pill.entry,
        isFuture: true,
      });
      return;
    }

    executePop(pill.dayIndex, pill.date, pill.isPlacebo);
  };

  const handlePointerDown = (pill: (typeof pills)[number]) => {
    const isPopped = pill.entry?.status === 'taken' || pill.entry?.status === 'late';
    if (isPopped) return;
    setPressingIndex(pill.dayIndex);
    didHoldPopRef.current = false;

    if (pressToPopMode === 'hold' && !pill.isFuture) {
      triggerHaptic(hapticsEnabled, 'light');
      holdTimerRef.current = window.setTimeout(() => {
        didHoldPopRef.current = true;
        setPressingIndex(null);
        executePop(pill.dayIndex, pill.date, pill.isPlacebo);
      }, 340);
    }
  };

  const clearPointerPress = () => {
    setPressingIndex(null);
    if (holdTimerRef.current) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  const handleClickPocket = (pill: (typeof pills)[number]) => {
    if (didHoldPopRef.current) {
      didHoldPopRef.current = false;
      return;
    }
    const isPopped = pill.entry?.status === 'taken' || pill.entry?.status === 'late';
    if (pressToPopMode === 'hold' && !isPopped && !pill.isFuture) {
      executePop(pill.dayIndex, pill.date, pill.isPlacebo);
      return;
    }
    handlePocketInteraction(pill);
  };

  const pauseDaysList = useMemo(() => {
    if (config.pauseDays <= 0) return [];
    return Array.from({ length: config.pauseDays }, (_, idx) => {
      const cycleIdx = totalPhysicalPills + idx;
      const date = addDays(config.packStartDate, cycleIdx);
      return {
        pauseNum: idx + 1,
        date,
        weekday: getWeekdayShort(date),
        isToday: date === today,
        isPast: date < today,
      };
    });
  }, [config.pauseDays, config.packStartDate, totalPhysicalPills, today]);

  const isPackFinished = poppedCount >= totalPhysicalPills || currentCycleIndex >= totalCycleDays;

  // Render a single realistic / themed blister pocket
  const renderPocket = (pill: (typeof pills)[number], compactSize = false) => {
    const status = pill.entry?.status;
    const isPopped = status === 'taken' || status === 'late';
    const isMissed = status === 'missed' || (pill.isPast && !isPopped && !pill.isPlacebo);
    const isJustPopping = poppingAnim?.dayIndex === pill.dayIndex;
    const isBeingEaten = isCatBowl && eatingBowlIndex === pill.dayIndex && catState === 'eating';
    const isPressing = pressingIndex === pill.dayIndex;
    const colorKey = pill.isPlacebo ? config.placeboColor : config.activeColor;
    const colorStyle = PILL_COLORS[colorKey];
    const rotation = ROTATION_SEEDS[pill.dayIndex % ROTATION_SEEDS.length];
    const catVariantIdx = pill.dayIndex % 4;

    const pocketDim = compactSize
      ? 'w-9 h-9 sm:w-10 sm:h-10'
      : config.columns >= 7
      ? 'w-10 h-10 sm:w-11 sm:h-11'
      : config.columns >= 5
      ? 'w-12 h-12 sm:w-13 sm:h-13'
      : 'w-14 h-14 sm:w-15 sm:h-15';

    return (
      <div key={pill.dayIndex} className="relative flex flex-col items-center">
        {/* Weekday micro label */}
        {config.showWeekdays && (
          <span
            className={`text-[10px] font-bold tracking-tight mb-1 leading-none select-none ${
              pill.isToday
                ? 'text-[#C23153] font-extrabold'
                : isCatBowl
                ? isPopped
                  ? 'text-amber-700/55'
                  : 'text-amber-900/80'
                : isPopped
                ? 'text-slate-500/80'
                : 'text-slate-600'
            }`}
          >
            {pill.weekday}
          </span>
        )}

        {/* Interactive Pocket Button */}
        <button
          ref={(el) => {
            if (el) pocketRefs.current.set(pill.dayIndex, el);
            else pocketRefs.current.delete(pill.dayIndex);
          }}
          type="button"
          onPointerDown={() => handlePointerDown(pill)}
          onPointerUp={clearPointerPress}
          onPointerLeave={clearPointerPress}
          onPointerCancel={clearPointerPress}
          onClick={() => handleClickPocket(pill)}
          aria-label={`Tag ${pill.dayIndex + 1}, ${pill.weekday} ${formatDateShort(pill.date)}, ${
            isPopped
              ? isCatBowl
                ? 'Napf leergefressen'
                : 'eingenommen'
              : pill.isPlacebo
              ? 'Placebo'
              : isCatBowl
              ? 'Voller Napf'
              : 'noch im Blister'
          }`}
          className={`relative ${pocketDim} rounded-full flex items-center justify-center cursor-pointer select-none transition-transform duration-150 focus:outline-none ${
            pill.isToday && !isPopped ? 'animate-today-pulse' : ''
          } ${isPressing ? 'scale-[0.88]' : 'hover:scale-[1.05] active:scale-[0.90]'}`}
        >
          {/* Outer pocket rim */}
          {!isCatBowl && (
            <span
              className={`absolute inset-[-2px] rounded-full pointer-events-none ${
                isMissed && !isPopped
                  ? 'ring-2 ring-amber-500/85 bg-amber-400/15'
                  : pill.isPlacebo && !isPopped
                  ? 'ring-1 ring-violet-400/50'
                  : isRoseGold
                  ? 'ring-1 ring-rose-400/45'
                  : 'ring-1 ring-slate-400/45'
              }`}
            />
          )}

          {/* THEME 1: CAT BOWL DESIGN */}
          {isCatBowl ? (
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Soft mat coaster ring beneath bowl */}
              <span
                className={`absolute inset-[-2px] rounded-full pointer-events-none ${
                  isMissed && !isPopped
                    ? 'ring-2 ring-amber-500/90 bg-amber-100/50'
                    : pill.isPlacebo && !isPopped
                    ? 'ring-2 ring-violet-300/80 bg-violet-50/40'
                    : 'bg-amber-900/5'
                }`}
              />
              <img
                src={isPopped ? '/assets/cat-bowl-empty.png' : '/assets/cat-bowl-full.png'}
                alt=""
                draggable={false}
                className={`w-[108%] h-[108%] max-w-none object-contain drop-shadow-sm transition-all duration-300 pointer-events-none ${
                  isPopped ? 'opacity-95' : ''
                } ${isBeingEaten ? 'scale-95' : ''}`}
              />
              {pill.isPlacebo && !isPopped && (
                <span className="absolute -top-1 -right-1 px-1 rounded-full bg-violet-500 text-white text-[7px] font-bold shadow-xs">
                  P
                </span>
              )}
              {isPopped && (
                <span
                  className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-white shadow-sm ${
                    status === 'late' ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                />
              )}
              {/* Floating hearts & crumbs while cat munches */}
              {isBeingEaten && (
                <>
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-rose-500 text-xs font-bold animate-heart-float pointer-events-none z-40">
                    ♥
                  </span>
                  <span
                    className="absolute -top-1 left-2 text-amber-500 text-[10px] font-bold animate-heart-float pointer-events-none z-40"
                    style={{ animationDelay: '0.16s' }}
                  >
                    ✦
                  </span>
                </>
              )}
            </div>
          ) : isPopped ? (
            /* POPPED STATES FOR FOIL THEMES */
            isCatPeek ? (
              /* THEME 2: PEEKING KITTEN OUT OF TORN FOIL! */
              <div
                className={`relative w-[116%] h-[116%] rounded-full flex items-center justify-center pointer-events-none ${
                  isJustPopping ? 'animate-cat-peek' : ''
                }`}
              >
                <img
                  src={`/assets/cat-peek-${catVariantIdx}.png`}
                  alt=""
                  draggable={false}
                  className="w-full h-full object-cover rounded-full pointer-events-none drop-shadow-xs"
                />
                <span
                  className={`absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full border border-white shadow-sm ${
                    status === 'late' ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                />
              </div>
            ) : isRoseGold ? (
              /* THEME 4: ROSEGOLD CHERRY BLOSSOM BLOOM */
              <div
                className={`relative w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-[#6b263d] via-[#4a1829] to-[#2e0e19] shadow-inner border border-rose-200/80 ${
                  isJustPopping ? 'animate-cavity-reveal' : ''
                }`}
              >
                <svg viewBox="0 0 64 64" className="w-[82%] h-[82%] drop-shadow-sm">
                  {[0, 72, 144, 216, 288].map((deg) => (
                    <ellipse
                      key={deg}
                      cx="32"
                      cy="17"
                      rx="8.5"
                      ry="13"
                      fill="#FDA4AF"
                      stroke="#FFF1F2"
                      strokeWidth="1.2"
                      transform={`rotate(${deg} 32 32)`}
                    />
                  ))}
                  <circle cx="32" cy="32" r="6" fill="#FDE047" />
                  <circle cx="32" cy="32" r="3" fill="#F59E0B" />
                </svg>
                <span
                  className={`absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full border border-white/90 shadow-sm ${
                    status === 'late' ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                />
              </div>
            ) : (
              /* THEME 1: CLASSIC PHOTOREALISTIC TORN ALUMINUM FOIL CAVITY */
              <div
                className={`relative w-full h-full rounded-full overflow-hidden ${
                  isJustPopping ? 'animate-cavity-reveal' : ''
                }`}
              >
                <img
                  src="/assets/torn-foil-cavity.jpg"
                  alt=""
                  draggable={false}
                  className="w-[146%] h-[146%] max-w-none absolute top-1/2 left-1/2 object-cover torn-foil-mask pointer-events-none"
                  style={{
                    transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                  }}
                />
                <span
                  className={`absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full border border-white/80 shadow-sm flex items-center justify-center ${
                    status === 'late' ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                />
              </div>
            )
          ) : isBackView ? (
            /* BACK FOIL VIEW */
            <div
              className={`relative w-full h-full rounded-full flex flex-col items-center justify-center border border-slate-400/60 shadow-inner transition-all ${
                isPressing ? 'brightness-90 scale-95' : ''
              }`}
              style={{
                background: isRoseGold
                  ? 'radial-gradient(circle at 35% 30%, rgba(255,241,242,0.85), rgba(244,182,194,0.8) 60%, rgba(190,120,138,0.85) 100%)'
                  : 'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.65), rgba(203,213,225,0.75) 60%, rgba(148,163,184,0.85) 100%)',
              }}
            >
              <span className="text-[10px] font-bold text-slate-700 leading-none">
                {pill.dayIndex + 1}
              </span>
              {pill.isPlacebo && (
                <span className="text-[7px] uppercase tracking-wider font-semibold text-violet-700 mt-0.5">
                  PL
                </span>
              )}
            </div>
          ) : (
            /* INTACT FRONT VIEW — 3D Sugar-Coated Pill inside Glossy Clear PVC Dome */
            <div
              className={`relative w-full h-full rounded-full flex items-center justify-center transition-all duration-150 ${
                isPressing ? 'brightness-95' : ''
              }`}
            >
              <span className="absolute inset-0 rounded-full bg-slate-900/18 blur-[1.5px] translate-y-[1.5px]" />
              <span className="absolute inset-0 rounded-full border border-white/75 bg-gradient-to-br from-white/40 via-slate-200/20 to-slate-500/30" />
              <span
                className={`relative w-[68%] h-[68%] rounded-full transition-transform duration-150 flex items-center justify-center ${
                  isPressing ? 'scale-90 translate-y-[1px]' : ''
                }`}
                style={{
                  background: colorStyle.gradient,
                  boxShadow:
                    '0 2px 4px rgba(15, 23, 42, 0.34), inset 0 1.5px 2px rgba(255, 255, 255, 0.9), inset 0 -2px 3px rgba(0, 0, 0, 0.14)',
                }}
              >
                <span className="absolute top-[16%] left-[20%] w-[34%] h-[22%] rounded-full bg-white/85 blur-[0.6px] -rotate-25" />
                {isCatPeek && !pill.isPlacebo && (
                  /* Tiny subtle embossed paw dot inside Cat Peek intact pill */
                  <svg viewBox="0 0 24 24" className="w-3 h-3 text-rose-400/55 fill-current">
                    <circle cx="8" cy="9" r="2" />
                    <circle cx="12" cy="7.5" r="2" />
                    <circle cx="16" cy="9" r="2" />
                    <path d="M12 11c-2.6 0-4.5 1.8-4.5 3.8 0 1.4 1.1 2.2 2.4 2.2 1 0 1.5-.4 2.1-.4s1.1.4 2.1.4c1.3 0 2.4-.8 2.4-2.2 0-2-1.9-3.8-4.5-3.8z" />
                  </svg>
                )}
                {pill.isPlacebo && (
                  <span className="text-[7px] font-bold text-slate-500/75">P</span>
                )}
              </span>

              <span className="absolute inset-[1px] rounded-full pvc-dome pointer-events-none" />
              <span className="absolute top-[11%] left-[18%] w-[44%] h-[22%] rounded-full bg-gradient-to-b from-white/85 to-white/0 blur-[0.5px] -rotate-20 pointer-events-none" />
            </div>
          )}

          {/* POP ANIMATION LAYERS (for foil themes) */}
          {isJustPopping && !isCatBowl && (
            <>
              <span className="absolute inset-[-6px] rounded-full border-2 border-white/90 bg-white/40 animate-foil-burst pointer-events-none z-20" />
              <span
                className="absolute top-1/2 left-1/2 w-6 h-6 rounded-full shadow-lg animate-pill-pop pointer-events-none z-30"
                style={{
                  background: poppingAnim.colorGradient,
                  boxShadow:
                    '0 6px 14px rgba(15,23,42,0.35), inset 0 2px 2px rgba(255,255,255,0.9)',
                }}
              />
              {isCatPeek && (
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-rose-500 text-xs font-bold animate-heart-float pointer-events-none z-30">
                  ♥
                </span>
              )}
              {[
                { tx: '-20px', ty: '-22px' },
                { tx: '22px', ty: '-18px' },
                { tx: '-18px', ty: '18px' },
                { tx: '20px', ty: '16px' },
                { tx: '0px', ty: '-28px' },
              ].map((sp, i) => (
                <span
                  key={i}
                  className="absolute top-1/2 left-1/2 w-1.5 h-1.5 rounded-full bg-gradient-to-br from-white to-slate-300 shadow animate-sparkle pointer-events-none z-30"
                  style={
                    {
                      '--tx': sp.tx,
                      '--ty': sp.ty,
                    } as React.CSSProperties
                  }
                />
              ))}
            </>
          )}

          {/* Today tiny floating tag */}
          {pill.isToday && !isPopped && (
            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-1.5 py-[1px] rounded-full bg-[#D94E6A] text-white text-[8px] font-bold tracking-wider uppercase shadow-sm whitespace-nowrap z-10 pointer-events-none">
              Heute
            </span>
          )}
        </button>

        {/* Pill day number underneath */}
        {config.showNumbers && (
          <span
            className={`text-[9px] mt-2 font-medium leading-none select-none ${
              pill.isToday && !isPopped
                ? 'opacity-0'
                : pill.isToday
                ? 'text-[#C23153] font-bold'
                : isMissed && !isPopped
                ? 'text-amber-700 font-semibold'
                : isCatBowl
                ? 'text-amber-800/70'
                : 'text-slate-500/90'
            }`}
          >
            {pill.dayIndex + 1}
          </span>
        )}
      </div>
    );
  };

  const useOvalLayout = config.shape === 'oval' && pills.length <= 28;

  // Choose card surface class by theme
  const surfaceClass = isCatBowl
    ? 'blister-catbowl-surface border-amber-200/80'
    : isRoseGold
    ? 'blister-rosegold-surface border-rose-200/90'
    : isBackView
    ? 'blister-back-surface border-white/80'
    : 'blister-card-surface border-white/80';

  return (
    <div className="w-full flex flex-col items-center">
      {/* QUICK 1-TAP DESIGN THEME SWITCHER */}
      <div className="w-full flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2.5 px-0.5">
        {BLISTER_THEMES.map((t) => {
          const Icon = THEME_ICONS[t.id];
          const active = theme === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                triggerHaptic(hapticsEnabled, 'light');
                onChangeTheme(t.id);
              }}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition active:scale-95 ${
                active
                  ? 'bg-[#D94E6A] text-white border-[#D94E6A] shadow-sm shadow-rose-200'
                  : 'bg-white/90 text-slate-600 border-rose-100 hover:border-rose-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.shortLabel}
            </button>
          );
        })}
      </div>

      {/* Top Action Bar for Blister */}
      <div className="w-full flex items-center justify-between gap-2 mb-2.5 px-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/85 border border-rose-100 text-xs font-semibold text-rose-900 shadow-xs truncate max-w-[135px] whitespace-nowrap">
            <Sparkles className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span className="truncate">{config.brandName || 'Mein Blister'}</span>
          </span>
          <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap">
            {poppedCount}/{totalPhysicalPills} {isCatBowl ? 'leer' : ''}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {!isCatBowl && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic(hapticsEnabled, 'light');
                setIsBackView((v) => !v);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/90 hover:bg-white border border-slate-200/80 text-xs font-semibold text-slate-700 shadow-xs transition active:scale-95"
              title="Blister umdrehen (Vorder-/Rückseite)"
            >
              <RotateCw
                className={`w-3.5 h-3.5 transition-transform duration-300 ${
                  isBackView ? 'rotate-180 text-rose-500' : ''
                }`}
              />
              {isBackView ? 'Vorne' : 'Rückseite'}
            </button>
          )}

          <button
            type="button"
            onClick={onOpenCustomizer}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200/80 text-xs font-semibold text-rose-700 shadow-xs transition active:scale-95"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Größe
          </button>
        </div>
      </div>

      {/* Multi-sheet selector for 84+7 Long-Cycle Blister */}
      {isMultiSheet && (
        <div className="w-full flex items-center justify-center gap-2 mb-3">
          {Array.from({ length: totalSheets }, (_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveBlock(idx)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                currentSheet === idx
                  ? 'bg-[#D94E6A] text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              Monat {idx + 1} ({idx * sheetSize + 1}–
              {Math.min((idx + 1) * sheetSize, totalPhysicalPills)})
            </button>
          ))}
        </div>
      )}

      {/* THE INTERACTIVE BLISTER CARD */}
      <div className="w-full perspective-1200">
        <div
          ref={cardRef}
          className={`relative w-full transition-all duration-500 ${surfaceClass} ${
            useOvalLayout
              ? 'rounded-[46px] px-4 py-6'
              : config.shape === 'compact'
              ? 'rounded-[22px] px-3 py-4'
              : 'rounded-[28px] px-3.5 py-5 sm:px-5 sm:py-6'
          } border overflow-hidden`}
        >
          {/* Top card stamp / header */}
          <div className="absolute top-2.5 left-3.5 right-3.5 flex items-center justify-between pointer-events-none select-none opacity-75">
            <span
              className={`text-[9px] font-mono tracking-widest uppercase font-bold ${
                isCatBowl ? 'text-amber-900' : isRoseGold ? 'text-rose-900' : 'text-slate-600'
              }`}
            >
              {isCatBowl
                ? 'KATZEN-FUTTERPLATZ'
                : isCatPeek
                ? 'KATZEN-BLISTER'
                : config.brandName || 'LUNEA'}{' '}
              • {config.activePills}
              {config.placeboPills > 0
                ? `+${config.placeboPills}`
                : config.pauseDays > 0
                ? `+${config.pauseDays}P`
                : ''}
            </span>
            <span
              className={`text-[8.5px] font-mono tracking-wider ${
                isCatBowl ? 'text-amber-800' : isRoseGold ? 'text-rose-800' : 'text-slate-500'
              }`}
            >
              {isCatBowl
                ? 'TIPPE AUF EINEN NAPF'
                : isCatPeek
                ? 'DRÜCK MICH!'
                : isBackView
                ? 'DRÜCKFOLIE • RÜCKSEITE'
                : 'CH.-B. 26L04'}
            </span>
          </div>

          {/* Subtle diagonal metallic light sheen for foil themes */}
          {!isCatBowl && (
            <div
              className="absolute inset-0 pointer-events-none opacity-35"
              style={{
                background:
                  'linear-gradient(122deg, transparent 18%, rgba(255,255,255,0.75) 36%, transparent 50%, rgba(255,255,255,0.3) 78%, transparent 92%)',
              }}
            />
          )}

          {/* Pawprint trail overlay when cat walks across bowls */}
          {isCatBowl &&
            pawPrints.map((pp) => (
              <svg
                key={pp.id}
                viewBox="0 0 24 24"
                className="absolute w-3.5 h-3.5 text-amber-700/35 fill-current pointer-events-none z-20 transition-opacity duration-500"
                style={{
                  left: `${pp.x}px`,
                  top: `${pp.y}px`,
                  transform: `translate(-50%, -50%) rotate(${pp.angle}deg)`,
                }}
              >
                <circle cx="8" cy="9" r="2.1" />
                <circle cx="12" cy="7.2" r="2.1" />
                <circle cx="16" cy="9" r="2.1" />
                <path d="M12 11c-2.6 0-4.5 1.8-4.5 3.8 0 1.4 1.1 2.2 2.4 2.2 1 0 1.5-.4 2.1-.4s1.1.4 2.1.4c1.3 0 2.4-.8 2.4-2.2 0-2-1.9-3.8-4.5-3.8z" />
              </svg>
            ))}

          {/* BLISTER POCKET LAYOUT */}
          {useOvalLayout ? (
            <div className="relative z-10 mt-5 mb-2 flex items-center justify-center">
              <div className="relative w-[308px] h-[308px] sm:w-[336px] sm:h-[336px]">
                <div
                  className={`absolute inset-[54px] rounded-full border border-dashed flex flex-col items-center justify-center text-center p-4 shadow-inner ${
                    isCatBowl
                      ? 'border-amber-400/50 bg-white/55'
                      : 'border-slate-500/35 bg-white/25 backdrop-blur-[1px]'
                  }`}
                >
                  <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500">
                    {isCatBowl ? 'Futter-Kreis' : 'Zyklus-Blister'}
                  </span>
                  <span className="text-xl font-bold text-slate-800 mt-0.5">
                    {poppedCount} / {totalPhysicalPills}
                  </span>
                  <span className="text-[11px] text-slate-600 mt-0.5">{config.brandName}</span>
                  <span className="text-[9px] text-rose-600 font-semibold mt-1.5">
                    {isCatBowl ? 'Tippe auf einen Napf' : 'Tippe auf eine Pille'}
                  </span>
                </div>

                {pills.map((pill, idx) => {
                  const angle = (idx / pills.length) * Math.PI * 2 - Math.PI / 2;
                  const radiusPct = 42;
                  const x = 50 + radiusPct * Math.cos(angle);
                  const y = 50 + radiusPct * Math.sin(angle);
                  return (
                    <div
                      key={pill.dayIndex}
                      className="absolute -translate-x-1/2 -translate-y-1/2"
                      style={{ left: `${x}%`, top: `${y}%` }}
                    >
                      {renderPocket(pill, pills.length > 21)}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="relative z-10 mt-5 space-y-3.5">
              {rows.map((row, rowIdx) => (
                <div key={row.rowIdx} className="relative">
                  {rowIdx > 0 && (
                    <div
                      className={`w-full border-t border-dashed mb-3 relative ${
                        isCatBowl ? 'border-amber-300/60' : 'border-slate-500/28'
                      }`}
                    >
                      {!isCatBowl && (
                        <>
                          <span className="absolute -left-4 -top-1.5 w-3 h-3 rounded-full bg-[#faf6f5]/60 border border-slate-400/30" />
                          <span className="absolute -right-4 -top-1.5 w-3 h-3 rounded-full bg-[#faf6f5]/60 border border-slate-400/30" />
                        </>
                      )}
                    </div>
                  )}

                  <div
                    className="grid items-center justify-items-center gap-y-2"
                    style={{
                      gridTemplateColumns: `repeat(${Math.max(
                        3,
                        Math.min(7, config.columns)
                      )}, minmax(0, 1fr))`,
                    }}
                  >
                    {row.items.map((pill, colIdx) => {
                      const hasNextInRow = row.isReversed
                        ? colIdx > 0
                        : colIdx < row.items.length - 1;
                      const showRightArrow =
                        config.showArrows && !row.isReversed && hasNextInRow;
                      const showLeftArrow =
                        config.showArrows && row.isReversed && hasNextInRow;

                      return (
                        <div
                          key={pill.dayIndex}
                          className="relative w-full flex items-center justify-center"
                        >
                          {renderPocket(pill, config.shape === 'compact')}

                          {showRightArrow && (
                            <span
                              className={`absolute -right-1.5 top-1/2 -translate-y-1/2 text-[10px] font-bold pointer-events-none select-none ${
                                isCatBowl ? 'text-amber-600/45' : 'text-slate-500/65'
                              }`}
                              aria-hidden="true"
                            >
                              ›
                            </span>
                          )}
                          {showLeftArrow && (
                            <span
                              className={`absolute -left-1.5 top-1/2 -translate-y-1/2 text-[10px] font-bold pointer-events-none select-none ${
                                isCatBowl ? 'text-amber-600/45' : 'text-slate-500/65'
                              }`}
                              aria-hidden="true"
                            >
                              ‹
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {config.showArrows &&
                    config.arrowFlow === 'snake' &&
                    rowIdx < rows.length - 1 && (
                      <div
                        className={`flex px-4 pt-1 pointer-events-none select-none ${
                          row.isReversed ? 'justify-start' : 'justify-end'
                        }`}
                      >
                        <span
                          className={`text-[10px] leading-none font-bold ${
                            isCatBowl ? 'text-amber-600/45' : 'text-slate-500/65'
                          }`}
                        >
                          ↓
                        </span>
                      </div>
                    )}
                </div>
              ))}
            </div>
          )}

          {/* LIVE ANIMATED WALKING & EATING CAT CHARACTER (for Cat Bowl theme) */}
          {isCatBowl && catPos && (
            <button
              type="button"
              onClick={() => {
                playCatPeekSound(soundEnabled);
                triggerHaptic(hapticsEnabled, 'light');
              }}
              aria-label="Futterkatze streicheln"
              className="absolute z-30 w-14 h-14 -translate-x-1/2 -translate-y-1/2 cursor-pointer focus:outline-none"
              style={{
                left: `${catPos.x}px`,
                top: `${catPos.y}px`,
                transitionProperty: 'left, top',
                transitionDuration: `${catWalkMs}ms`,
                transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              {/* Soft ground shadow beneath cat */}
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-9 h-2.5 rounded-full bg-amber-950/20 blur-[2px] pointer-events-none" />

              {/* Flip wrapper so cat faces movement direction */}
              <div
                className="w-full h-full transition-transform duration-200"
                style={{
                  transform: catFacing === 'right' ? 'scaleX(-1)' : 'scaleX(1)',
                }}
              >
                <img
                  src="/assets/cat-walker.png"
                  alt="Katze"
                  draggable={false}
                  className={`w-full h-full object-contain drop-shadow-md pointer-events-none ${
                    catState === 'walking'
                      ? 'animate-cat-trot'
                      : catState === 'eating'
                      ? 'animate-cat-munch'
                      : 'animate-cat-idle'
                  }`}
                />
              </div>

              {/* Tiny cute speech badge while munching */}
              {catState === 'eating' && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-white/95 border border-rose-200 text-[9px] font-extrabold text-rose-600 shadow-sm whitespace-nowrap pointer-events-none">
                  Mampf!
                </span>
              )}
            </button>
          )}

          {/* Card Footer Strip */}
          <div
            className={`relative z-10 mt-5 pt-2.5 border-t flex items-center justify-between text-[10px] ${
              isCatBowl
                ? 'border-amber-300/45 text-amber-900/80'
                : isRoseGold
                ? 'border-rose-400/30 text-rose-950/80'
                : 'border-slate-500/20 text-slate-600/85'
            }`}
          >
            <span className="flex items-center gap-1.5">
              {isCatBowl ? (
                <span>
                  {totalPhysicalPills - poppedCount} volle Näpfe • {poppedCount} leergefressen
                </span>
              ) : (
                <>
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-slate-400/60"
                    style={{ background: PILL_COLORS[config.activeColor].gradient }}
                  />
                  {config.activePills} Wirkstoff
                  {config.placeboPills > 0 && (
                    <>
                      <span className="mx-0.5 opacity-50">•</span>
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-slate-400/60"
                        style={{ background: PILL_COLORS[config.placeboColor].gradient }}
                      />
                      {config.placeboPills} Placebo
                    </>
                  )}
                </>
              )}
            </span>
            <span className="font-mono text-[9px] opacity-80">
              Start: {formatDateShort(config.packStartDate)}
            </span>
          </div>
        </div>
      </div>

      {/* PILL-FREE PAUSE STRIP */}
      {pauseDaysList.length > 0 && (
        <div className="w-full mt-3.5 rounded-2xl bg-gradient-to-r from-violet-50/90 via-rose-50/70 to-violet-50/90 border border-violet-200/70 p-3.5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-violet-900 flex items-center gap-1.5">
              <Droplets className="w-3.5 h-3.5 text-rose-500" />
              Einnahmepause ({config.pauseDays} Tage • ohne Pille)
            </span>
            <span className="text-[11px] font-medium text-violet-700">
              Abbruchblutung erwartet
            </span>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {pauseDaysList.map((p) => (
              <div
                key={p.pauseNum}
                className={`flex flex-col items-center py-1.5 rounded-xl border text-center transition ${
                  p.isToday
                    ? 'bg-[#D94E6A] text-white border-[#D94E6A] shadow-sm'
                    : p.isPast
                    ? 'bg-violet-100/80 text-violet-800 border-violet-200'
                    : 'bg-white/75 text-slate-600 border-violet-100'
                }`}
              >
                <span className="text-[10px] font-bold leading-none">{p.weekday}</span>
                <span className="text-[10px] mt-1 opacity-85">P{p.pauseNum}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* START NEW BLISTER BANNER WHEN PACK COMPLETE */}
      {isPackFinished && (
        <div className="w-full mt-3.5 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 text-white p-4 shadow-md flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold">
              {isCatBowl ? 'Alle Näpfe leergefressen!' : 'Blister abgeschlossen!'}
            </p>
            <p className="text-xs text-rose-100 mt-0.5">
              Bereit für deinen nächsten Blister? Alte Daten bleiben im Verlauf erhalten.
            </p>
          </div>
          <button
            type="button"
            onClick={onStartNewPack}
            className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-rose-600 text-xs font-bold shadow-sm hover:bg-rose-50 active:scale-95 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Neuer Blister
          </button>
        </div>
      )}

      {/* POCKET DETAIL / FUTURE CONFIRMATION MODAL */}
      {selectedPill && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-xs flex items-end sm:items-center justify-center p-3"
          onClick={() => setSelectedPill(null)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-rose-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-500">
                  {isCatBowl ? 'Napf' : 'Pille'} #{selectedPill.dayIndex + 1} •{' '}
                  {selectedPill.isPlacebo ? 'Placebo' : 'Wirkstoff'}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                  {getWeekdayShort(selectedPill.date)}, {formatDateShort(selectedPill.date)}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPill(null)}
                className="p-1.5 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedPill.entry?.status === 'taken' || selectedPill.entry?.status === 'late' ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl bg-emerald-50 border border-emerald-200/70 p-3.5 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                    <Check className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-emerald-950">
                      {selectedPill.entry.status === 'late'
                        ? 'Verspätet eingenommen'
                        : isCatBowl
                        ? 'Napf pünktlich leergefressen'
                        : 'Pünktlich ausgedrückt'}
                    </p>
                    <p className="text-xs text-emerald-800 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3.5 h-3.5" />
                      Uhrzeit: {formatTimeFromIso(selectedPill.entry.takenAt)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onUndoPill(selectedPill.date);
                      setSelectedPill(null);
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    {isCatBowl ? 'Wieder auffüllen' : 'Rückgängig machen'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onMarkMissed(selectedPill.dayIndex, selectedPill.date);
                      setSelectedPill(null);
                    }}
                    className="py-2.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition"
                  >
                    Als vergessen
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl bg-amber-50 border border-amber-200/80 p-3.5 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-900 leading-relaxed">
                    {isCatBowl
                      ? `Dieser Napf ist erst für den ${formatDateShort(selectedPill.date)} gedacht. Soll die Katze trotzdem schon hinlaufen?`
                      : `Diese Pille ist erst für den ${formatDateShort(selectedPill.date)} vorgesehen. Möchtest du sie trotzdem jetzt ausdrücken?`}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPill(null)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const target = selectedPill;
                      setSelectedPill(null);
                      executePop(target.dayIndex, target.date, target.isPlacebo);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-[#D94E6A] text-white text-xs font-bold shadow-sm hover:bg-[#c23b57]"
                  >
                    {isCatBowl ? 'Katze füttern!' : 'Trotzdem ausdrücken'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
