import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  RotateCw,
  SlidersHorizontal,
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
import type { BlisterConfig, BlisterThemeId, CatNames, PillEntry } from '../types';
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
  catNames: CatNames;
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

type CatAnimPhase = 'idle' | 'walking' | 'eating' | 'happy' | 'roaming' | 'sniffing' | 'sleeping';
type BowlEatStage = 'full' | 'half' | 'empty';

const ROTATION_SEEDS = [12, 74, 138, 196, 251, 314, 43, 109, 172, 229, 287, 342];

const THEME_ICONS: Record<BlisterThemeId, React.ComponentType<{ className?: string }>> = {
  classic_foil: Disc,
  cat_peek: Cat,
  cat_bowl: Utensils,
  rosegold_bloom: Flower2,
};

const PRELOAD_SPRITES = [
  '/assets/cat-walk-1.png',
  '/assets/cat-walk-2.png',
  '/assets/cat-eat-1.png',
  '/assets/cat-eat-2.png',
  '/assets/cat-sniff.png',
  '/assets/cat-sleep-1.png',
  '/assets/cat-sleep-2.png',
  '/assets/cat-bowl-full.png',
  '/assets/cat-bowl-half.png',
  '/assets/cat-bowl-empty.png',
  '/assets/cat-peek-happy-0.png',
  '/assets/cat-peek-happy-1.png',
  '/assets/cat-peek-happy-2.png',
  '/assets/cat-peek-happy-3.png',
];

export function getPeekCatName(dayIndex: number, catNames: CatNames): string {
  const keys: Array<keyof CatNames> = ['peek0', 'peek1', 'peek2', 'peek3'];
  return catNames[keys[dayIndex % 4]]?.trim() || `Kätzchen ${(dayIndex % 4) + 1}`;
}

export const BlisterPack: React.FC<BlisterPackProps> = ({
  config,
  catNames,
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
  const walkerName = catNames.walker?.trim() || 'Mimi';

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

  // Peeking kittens live expressions (which pocket indices are currently smiling/meowing ^ ^)
  const [happyKittenIdx, setHappyKittenIdx] = useState<number | null>(null);

  // Cat Bowl multi-frame walking & REAL eating choreography state
  const cardRef = useRef<HTMLDivElement | null>(null);
  const pocketRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const [catPos, setCatPos] = useState<{ x: number; y: number } | null>(null);
  const [catFacing, setCatFacing] = useState<'left' | 'right'>('right');
  const [catPhase, setCatPhase] = useState<CatAnimPhase>('idle');
  const [catFrame, setCatFrame] = useState<0 | 1>(0);
  const [catWalkMs, setCatWalkMs] = useState(550);
  const [eatingBowlIndex, setEatingBowlIndex] = useState<number | null>(null);
  const [eatingBowlStage, setEatingBowlStage] = useState<BowlEatStage>('full');
  const [crumbBurstKey, setCrumbBurstKey] = useState(0);
  const [pawPrints, setPawPrints] = useState<PawPrint[]>([]);
  const [showCatTag, setShowCatTag] = useState(false);
  const catTimersRef = useRef<number[]>([]);
  const roamTimersRef = useRef<number[]>([]);
  const catPosRef = useRef<{ x: number; y: number }>({ x: 160, y: 30 });
  const roamStepCountRef = useRef(0);

  const holdTimerRef = useRef<number | null>(null);
  const didHoldPopRef = useRef(false);

  // Preload all multi-frame sprites for flicker-free animation
  useEffect(() => {
    PRELOAD_SPRITES.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  const clearCatTimers = () => {
    catTimersRef.current.forEach((id) => window.clearTimeout(id));
    catTimersRef.current = [];
  };

  const clearRoamTimers = () => {
    roamTimersRef.current.forEach((id) => window.clearTimeout(id));
    roamTimersRef.current = [];
  };

  useEffect(() => {
    if (catPos) {
      catPosRef.current = catPos;
    }
  }, [catPos]);

  useEffect(() => {
    return () => {
      clearCatTimers();
      clearRoamTimers();
    };
  }, []);

  useEffect(() => {
    if (isCatBowl && isBackView) {
      setIsBackView(false);
    }
  }, [isCatBowl, isBackView]);

  // Multi-frame sprite ticker for walking/roaming (145ms), eating (220ms), and sleeping breath (1150ms)
  useEffect(() => {
    if (catPhase !== 'walking' && catPhase !== 'roaming' && catPhase !== 'eating' && catPhase !== 'sleeping') {
      setCatFrame(0);
      return;
    }
    const intervalMs =
      catPhase === 'walking'
        ? 140
        : catPhase === 'roaming'
        ? 165
        : catPhase === 'eating'
        ? 220
        : 1150;
    const id = window.setInterval(() => {
      setCatFrame((f) => (f === 0 ? 1 : 0));
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [catPhase]);

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

  // Periodic lively happy-meow/smile animation on random popped peeking kittens!
  const poppedIndices = useMemo(
    () =>
      pills
        .filter((p) => p.entry?.status === 'taken' || p.entry?.status === 'late')
        .map((p) => p.dayIndex),
    [pills]
  );

  useEffect(() => {
    if (!isCatPeek || poppedIndices.length === 0) return;
    const id = window.setInterval(() => {
      const pick = poppedIndices[Math.floor(Math.random() * poppedIndices.length)];
      setHappyKittenIdx(pick);
      window.setTimeout(() => {
        setHappyKittenIdx((cur) => (cur === pick ? null : cur));
      }, 1150);
    }, 3200);
    return () => window.clearInterval(id);
  }, [isCatPeek, poppedIndices]);

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

  // Position cat cleanly: when 0 bowls eaten, rest nicely in top-center lounge (never hiding Bowl #1!)
  useEffect(() => {
    if (!isCatBowl) return;
    const raf = window.requestAnimationFrame(() => {
      const cardW = cardRef.current?.clientWidth || 320;
      const poppedPills = pills.filter(
        (p) => p.entry?.status === 'taken' || p.entry?.status === 'late'
      );
      if (poppedPills.length === 0) {
        setCatPos({ x: cardW / 2, y: 30 });
        setCatFacing('left');
        setCatPhase('idle');
        return;
      }
      const anchor = poppedPills[poppedPills.length - 1];
      const pt = getPocketCenter(anchor.dayIndex);
      if (pt) {
        setCatPos({ x: pt.x + 12, y: Math.max(36, pt.y - 16) });
        setCatPhase('idle');
      }
    });
    return () => window.cancelAnimationFrame(raf);
  }, [isCatBowl, config.columns, config.shape, currentSheet, totalPhysicalPills]);

  // AUTONOMOUS COZY LIFE: After eating at least 1 bowl, the cat roams across the blister, sniffs curiously, and curls up to sleep!
  useEffect(() => {
    if (!isCatBowl || poppedCount === 0 || eatingBowlIndex !== null) {
      clearRoamTimers();
      return;
    }
    if (catPhase !== 'idle') return;

    const scheduleRoamCycle = () => {
      clearRoamTimers();
      const tStart = window.setTimeout(() => {
        const cardEl = cardRef.current;
        if (!cardEl) return;
        const cw = cardEl.clientWidth || 320;
        const ch = cardEl.clientHeight || 280;
        const start = catPosRef.current;

        // Every 3rd cycle, curl up peacefully for a nap! Otherwise stroll & sniff!
        roamStepCountRef.current += 1;
        const shouldNap = roamStepCountRef.current % 3 === 0;

        // Pick a pleasant roaming point inside the blister card margins
        const padX = 38;
        const padTop = 44;
        const padBottom = 38;
        let destX = padX + Math.random() * Math.max(40, cw - padX * 2);
        let destY = padTop + Math.random() * Math.max(40, ch - padTop - padBottom);
        // Ensure a noticeable stroll distance
        if (Math.hypot(destX - start.x, destY - start.y) < 55) {
          destX = start.x > cw / 2 ? padX + 24 : cw - padX - 24;
        }

        const dx = destX - start.x;
        const dy = destY - start.y;
        const dist = Math.hypot(dx, dy);
        const strollMs = Math.max(700, Math.min(1650, Math.round(dist * 6.2)));

        setCatFacing(dx >= 0 ? 'right' : 'left');
        setCatWalkMs(strollMs);
        setCatPhase('roaming');

        // Soft exploratory pawprints
        const steps = Math.min(4, Math.max(2, Math.floor(dist / 42)));
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
        const prints: PawPrint[] = [];
        for (let s = 1; s <= steps; s++) {
          const frac = s / (steps + 1);
          prints.push({
            id: Date.now() + s,
            x: start.x + dx * frac + (s % 2 === 0 ? 4 : -4),
            y: start.y + dy * frac + 14,
            angle,
          });
        }
        setPawPrints(prints);

        window.requestAnimationFrame(() => {
          setCatPos({ x: destX, y: destY });
        });

        const tArrive = window.setTimeout(() => {
          setPawPrints([]);
          if (shouldNap) {
            // Curl up into a warm sleeping cinnamon roll with floating Zzz!
            setCatPhase('sleeping');
            const tWake = window.setTimeout(() => {
              setCatPhase('idle');
            }, 7200);
            roamTimersRef.current.push(tWake);
          } else {
            // Sniff curiously around the blister!
            setCatPhase('sniffing');
            const tDoneSniff = window.setTimeout(() => {
              setCatPhase('idle');
            }, 2800);
            roamTimersRef.current.push(tDoneSniff);
          }
        }, strollMs);

        roamTimersRef.current.push(tArrive);
      }, 2200);

      roamTimersRef.current = [tStart];
    };

    scheduleRoamCycle();
    return () => clearRoamTimers();
  }, [isCatBowl, poppedCount, eatingBowlIndex, catPhase]);

  // REAL MULTI-STAGE WALK -> BITE -> HALF-BOWL -> CHEW -> EMPTY-BOWL -> HAPPY LICK CHOREOGRAPHY!
  const runCatToBowl = (dayIndex: number, date: string) => {
    clearCatTimers();
    clearRoamTimers();
    const target = getPocketCenter(dayIndex);
    if (!target) {
      playCatMunchSound(soundEnabled);
      onPopPill(dayIndex, date);
      return;
    }

    const cardW = cardRef.current?.clientWidth || 320;
    const start = catPos || { x: cardW / 2, y: 30 };
    // Position cat slightly offset beside the bowl so her head dips directly into the bowl!
    const standOnRight = target.x < cardW * 0.72;
    const dest = {
      x: standOnRight ? target.x + 22 : target.x - 22,
      y: Math.max(34, target.y - 8),
    };
    const dx = dest.x - start.x;
    const dy = dest.y - start.y;
    const dist = Math.hypot(dx, dy);
    const travelDuration = Math.max(420, Math.min(860, Math.round(dist * 3.3)));

    // Sprite natively faces LEFT
    setCatFacing(dx >= 0 ? 'right' : 'left');
    setCatWalkMs(travelDuration);
    setCatPhase('walking');
    setEatingBowlIndex(dayIndex);
    setEatingBowlStage('full');
    triggerHaptic(hapticsEnabled, 'light');

    // Pawprint trail along walking line
    const steps = Math.min(6, Math.max(2, Math.floor(dist / 32)));
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    const prints: PawPrint[] = [];
    for (let s = 1; s <= steps; s++) {
      const frac = s / (steps + 1);
      prints.push({
        id: Date.now() + s,
        x: start.x + dx * frac + (s % 2 === 0 ? 5 : -5),
        y: start.y + dy * frac + 14,
        angle,
      });
    }
    setPawPrints(prints);

    window.requestAnimationFrame(() => {
      setCatPos(dest);
    });

    // 1. Arrive at bowl, turn to face the bowl directly, start real biting & chewing!
    const tArrive = window.setTimeout(() => {
      setCatFacing(standOnRight ? 'left' : 'right');
      setCatPhase('eating');
      setCrumbBurstKey((k) => k + 1);
      playCatMunchSound(soundEnabled);
      triggerHaptic(hapticsEnabled, 'medium');
    }, travelDuration);

    // 2. Bite 2: Bowl visibly drops from FULL -> HALF-EATEN + second crumb burst!
    const tHalf = window.setTimeout(() => {
      setEatingBowlStage('half');
      setCrumbBurstKey((k) => k + 1);
      triggerHaptic(hapticsEnabled, 'light');
    }, travelDuration + 460);

    // 3. Final bite: Bowl becomes LICKED CLEAN EMPTY + record pill!
    const tEmpty = window.setTimeout(() => {
      setEatingBowlStage('empty');
      setCatPhase('happy');
      onPopPill(dayIndex, date);
      triggerHaptic(hapticsEnabled, 'heavy');
    }, travelDuration + 1020);

    // 4. Satisfied lip-lick pause, then calm idle!
    const tDone = window.setTimeout(() => {
      setCatPhase('idle');
      setEatingBowlIndex(null);
      setPawPrints([]);
    }, travelDuration + 1680);

    catTimersRef.current = [tArrive, tHalf, tEmpty, tDone];
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
      setHappyKittenIdx(dayIndex);
      window.setTimeout(() => {
        setHappyKittenIdx((cur) => (cur === dayIndex ? null : cur));
      }, 1650);
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
      if (isCatPeek) {
        // Petting a popped kitten triggers a happy meow animation before opening details!
        playCatPeekSound(soundEnabled);
        triggerHaptic(hapticsEnabled, 'light');
        setHappyKittenIdx(pill.dayIndex);
        window.setTimeout(() => {
          setHappyKittenIdx((cur) => (cur === pill.dayIndex ? null : cur));
        }, 1200);
      }
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

  const isPackFinished =
    totalPhysicalPills > 0 &&
    (poppedCount >= totalPhysicalPills || currentCycleIndex >= totalCycleDays);

  // Current sprite URL for our animated cat
  const catSpriteSrc =
    catPhase === 'walking' || catPhase === 'roaming'
      ? catFrame === 0
        ? '/assets/cat-walk-1.png'
        : '/assets/cat-walk-2.png'
      : catPhase === 'eating'
      ? catFrame === 0
        ? '/assets/cat-eat-1.png'
        : '/assets/cat-eat-2.png'
      : catPhase === 'sniffing'
      ? '/assets/cat-sniff.png'
      : catPhase === 'sleeping'
      ? catFrame === 0
        ? '/assets/cat-sleep-1.png'
        : '/assets/cat-sleep-2.png'
      : catPhase === 'happy'
      ? '/assets/cat-eat-2.png'
      : '/assets/cat-walk-1.png';

  const renderPocket = (pill: (typeof pills)[number], compactSize = false) => {
    const status = pill.entry?.status;
    const isPopped = status === 'taken' || status === 'late';
    const isMissed = status === 'missed' || (pill.isPast && !isPopped && !pill.isPlacebo);
    const isJustPopping = poppingAnim?.dayIndex === pill.dayIndex;
    const isActiveEatBowl = isCatBowl && eatingBowlIndex === pill.dayIndex;
    const isBeingEaten = isActiveEatBowl && catPhase === 'eating';
    const isPressing = pressingIndex === pill.dayIndex;
    const isKittenHappy = isCatPeek && happyKittenIdx === pill.dayIndex;
    const colorKey = pill.isPlacebo ? config.placeboColor : config.activeColor;
    const colorStyle = PILL_COLORS[colorKey];
    const rotation = ROTATION_SEEDS[pill.dayIndex % ROTATION_SEEDS.length];
    const catVariantIdx = pill.dayIndex % 4;
    // Staggered organic delay for each kitten's living head-tilt animation
    const kittenDelaySec = `${((pill.dayIndex * 0.85) % 4.5).toFixed(2)}s`;

    const pocketDim = compactSize
      ? 'w-9 h-9 sm:w-10 sm:h-10'
      : config.columns >= 7
      ? 'w-10 h-10 sm:w-11 sm:h-11'
      : config.columns >= 5
      ? 'w-12 h-12 sm:w-13 sm:h-13'
      : 'w-14 h-14 sm:w-15 sm:h-15';

    // Determine exact bowl image (full -> half -> empty during real eating!)
    const bowlSrc = isPopped
      ? '/assets/cat-bowl-empty.png'
      : isActiveEatBowl && eatingBowlStage === 'half'
      ? '/assets/cat-bowl-half.png'
      : isActiveEatBowl && eatingBowlStage === 'empty'
      ? '/assets/cat-bowl-empty.png'
      : '/assets/cat-bowl-full.png';

    return (
      <div key={pill.dayIndex} className="relative flex flex-col items-center">
        {config.showWeekdays && (
          <span
            className={`text-[10px] font-bold tracking-tight mb-1 leading-none select-none ${
              pill.isToday
                ? 'app-accent-text font-extrabold'
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
          aria-label={`Tag ${pill.dayIndex + 1}, ${pill.weekday} ${formatDateShort(pill.date)}`}
          className={`relative ${pocketDim} rounded-full flex items-center justify-center cursor-pointer select-none transition-transform duration-150 focus:outline-none ${
            pill.isToday && !isPopped ? 'animate-today-pulse' : ''
          } ${isPressing ? 'scale-[0.88]' : 'hover:scale-[1.05] active:scale-[0.90]'}`}
        >
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

          {isCatBowl ? (
            <div className="relative w-full h-full flex items-center justify-center">
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
                src={bowlSrc}
                alt=""
                draggable={false}
                className={`w-[108%] h-[108%] max-w-none object-contain drop-shadow-sm transition-all duration-200 pointer-events-none ${
                  isBeingEaten ? 'scale-95' : ''
                }`}
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

              {/* Real flying brown kibble crumbs & pink hearts during eating! */}
              {isBeingEaten && (
                <div key={crumbBurstKey} className="absolute inset-0 pointer-events-none z-40">
                  {[
                    { cx: '-16px', cy: '-18px' },
                    { cx: '18px', cy: '-15px' },
                    { cx: '-12px', cy: '-24px' },
                    { cx: '10px', cy: '-22px' },
                    { cx: '0px', cy: '-26px' },
                  ].map((c, idx) => (
                    <span
                      key={idx}
                      className="absolute top-1/2 left-1/2 w-1.5 h-1.5 rounded-full bg-amber-800 shadow-xs animate-crumb-fly"
                      style={
                        {
                          '--cx': c.cx,
                          '--cy': c.cy,
                          animationDelay: `${idx * 45}ms`,
                        } as React.CSSProperties
                      }
                    />
                  ))}
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-rose-500 text-xs font-bold animate-heart-float">
                    ♥
                  </span>
                </div>
              )}
            </div>
          ) : isPopped ? (
            isCatPeek ? (
              /* LIVELY ANIMATED PEEKING KITTEN WITH DUAL EXPRESSION & STAGGERED WIGGLE! */
              <div
                className={`relative w-[118%] h-[118%] rounded-full flex items-center justify-center pointer-events-none ${
                  isJustPopping
                    ? 'animate-cat-peek'
                    : isKittenHappy
                    ? 'animate-kitten-joy'
                    : 'animate-kitten-alive'
                }`}
                style={
                  !isJustPopping && !isKittenHappy
                    ? { animationDelay: kittenDelaySec }
                    : undefined
                }
              >
                <img
                  src={
                    isKittenHappy
                      ? `/assets/cat-peek-happy-${catVariantIdx}.png`
                      : `/assets/cat-peek-${catVariantIdx}.png`
                  }
                  alt=""
                  draggable={false}
                  className="w-full h-full object-cover rounded-full pointer-events-none drop-shadow-xs"
                />
                {isKittenHappy && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-rose-500 text-[11px] font-bold animate-heart-float">
                    ♥
                  </span>
                )}
                <span
                  className={`absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full border border-white shadow-sm ${
                    status === 'late' ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                />
              </div>
            ) : isRoseGold ? (
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

          {pill.isToday && !isPopped && (
            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-1.5 py-[1px] rounded-full app-accent-bg text-white text-[8px] font-bold tracking-wider uppercase shadow-sm whitespace-nowrap z-10 pointer-events-none">
              Heute
            </span>
          )}
        </button>

        {config.showNumbers && (
          <span
            className={`text-[9px] mt-2 font-medium leading-none select-none ${
              pill.isToday && !isPopped
                ? 'opacity-0'
                : pill.isToday
                ? 'app-accent-text font-bold'
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

  const surfaceClass = isCatBowl
    ? 'blister-catbowl-surface border-amber-200/80'
    : isRoseGold
    ? 'blister-rosegold-surface border-rose-200/90'
    : isBackView
    ? 'blister-back-surface border-white/80'
    : 'blister-card-surface border-white/80';

  const schemaTag = `${config.activePills}${
    config.placeboPills > 0
      ? `+${config.placeboPills}`
      : config.pauseDays > 0
      ? `+${config.pauseDays}`
      : ''
  }`;

  return (
    <div className="w-full flex flex-col items-center">
      {/* Slim Design Switcher + Controls */}
      <div className="w-full flex items-center justify-between gap-1.5 mb-2.5">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
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
                className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-bold border transition active:scale-95 ${
                  active
                    ? 'app-accent-bg text-white shadow-xs'
                    : 'bg-white/90 text-slate-600 border-rose-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.shortLabel}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {!isCatBowl && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic(hapticsEnabled, 'light');
                setIsBackView((v) => !v);
              }}
              className="w-8 h-8 rounded-xl bg-white/90 border border-slate-200/80 text-slate-600 flex items-center justify-center active:scale-95 transition"
              title="Umdrehen"
              aria-label="Blister umdrehen"
            >
              <RotateCw
                className={`w-3.5 h-3.5 transition-transform duration-300 ${
                  isBackView ? 'rotate-180 app-accent-text' : ''
                }`}
              />
            </button>
          )}
          <button
            type="button"
            onClick={onOpenCustomizer}
            className="w-8 h-8 rounded-xl app-accent-soft border flex items-center justify-center active:scale-95 transition"
            title="Blister anpassen"
            aria-label="Blister anpassen"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Multi-sheet selector for 84+7 */}
      {isMultiSheet && (
        <div className="w-full flex items-center justify-center gap-2 mb-2.5">
          {Array.from({ length: totalSheets }, (_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveBlock(idx)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                currentSheet === idx
                  ? 'app-accent-bg text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              Monat {idx + 1}
            </button>
          ))}
        </div>
      )}

      {/* THE BLISTER CARD */}
      <div className="w-full perspective-1200">
        <div
          ref={cardRef}
          className={`relative w-full transition-all duration-500 ${surfaceClass} ${
            useOvalLayout
              ? 'rounded-[44px] px-4 py-6'
              : config.shape === 'compact'
              ? 'rounded-[22px] px-3 py-4'
              : 'rounded-[28px] px-3.5 py-5 sm:px-5 sm:py-5'
          } border overflow-hidden`}
        >
          {/* Top Bar inside Card (extra lounge headroom when Cat Bowl has 0 eaten so Mimi rests cleanly above Bowl #1) */}
          <div
            className={`relative z-10 flex items-center justify-between text-[10px] font-semibold opacity-75 px-0.5 select-none ${
              isCatBowl && poppedCount === 0 ? 'mb-9' : 'mb-3'
            }`}
          >
            <span
              className={
                isCatBowl ? 'text-amber-900' : isRoseGold ? 'text-rose-900' : 'text-slate-600'
              }
            >
              {config.brandName.trim() ? `${config.brandName.trim()} • ${schemaTag}` : schemaTag}
            </span>
            <span
              className={
                isCatBowl ? 'text-amber-900' : isRoseGold ? 'text-rose-900' : 'text-slate-600'
              }
            >
              {poppedCount}/{totalPhysicalPills}
            </span>
          </div>

          {!isCatBowl && (
            <div
              className="absolute inset-0 pointer-events-none opacity-30"
              style={{
                background:
                  'linear-gradient(122deg, transparent 18%, rgba(255,255,255,0.75) 36%, transparent 50%, rgba(255,255,255,0.3) 78%, transparent 92%)',
              }}
            />
          )}

          {/* Pawprint trail overlay */}
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

          {/* POCKET LAYOUT */}
          {useOvalLayout ? (
            <div className="relative z-10 my-2 flex items-center justify-center">
              <div className="relative w-[304px] h-[304px] sm:w-[332px] sm:h-[332px]">
                <div
                  className={`absolute inset-[56px] rounded-full border border-dashed flex flex-col items-center justify-center text-center p-4 shadow-inner ${
                    isCatBowl
                      ? 'border-amber-400/50 bg-white/55'
                      : 'border-slate-500/35 bg-white/25 backdrop-blur-[1px]'
                  }`}
                >
                  <span className="text-xl font-bold text-slate-800">
                    {poppedCount}/{totalPhysicalPills}
                  </span>
                  {config.brandName.trim() && (
                    <span className="text-[11px] text-slate-600 mt-0.5 truncate max-w-full">
                      {config.brandName.trim()}
                    </span>
                  )}
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
            <div className="relative z-10 space-y-3.5">
              {rows.map((row, rowIdx) => (
                <div key={row.rowIdx} className="relative">
                  {rowIdx > 0 && (
                    <div
                      className={`w-full border-t border-dashed mb-3 relative ${
                        isCatBowl ? 'border-amber-300/60' : 'border-slate-500/28'
                      }`}
                    />
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

          {/* LIVE MULTI-FRAME WALKING, EATING, SNIFFING & SLEEPING CAT! */}
          {isCatBowl && catPos && (
            <button
              type="button"
              onClick={() => {
                clearRoamTimers();
                playCatPeekSound(soundEnabled);
                triggerHaptic(hapticsEnabled, 'light');
                setCatPhase('happy');
                setShowCatTag(true);
                window.setTimeout(() => {
                  setCatPhase((cur) => (cur === 'happy' ? 'idle' : cur));
                  setShowCatTag(false);
                }, 1500);
              }}
              aria-label={walkerName}
              className="absolute z-30 w-15 h-15 -translate-x-1/2 -translate-y-1/2 cursor-pointer focus:outline-none"
              style={{
                left: `${catPos.x}px`,
                top: `${catPos.y}px`,
                transitionProperty: 'left, top',
                transitionDuration: `${catWalkMs}ms`,
                transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-10 h-2.5 rounded-full bg-amber-950/20 blur-[2px] pointer-events-none" />
              <div
                className="w-full h-full transition-transform duration-150"
                style={{
                  transform:
                    catPhase === 'sleeping'
                      ? 'scaleX(1)'
                      : catFacing === 'right'
                      ? 'scaleX(-1)'
                      : 'scaleX(1)',
                }}
              >
                <img
                  src={catSpriteSrc}
                  alt={walkerName}
                  draggable={false}
                  className={`w-full h-full object-contain drop-shadow-md pointer-events-none ${
                    catPhase === 'walking' || catPhase === 'roaming'
                      ? 'animate-cat-trot'
                      : catPhase === 'eating'
                      ? 'animate-cat-munch'
                      : catPhase === 'sniffing'
                      ? 'animate-cat-sniff'
                      : catPhase === 'sleeping'
                      ? 'animate-cat-sleep'
                      : catPhase === 'happy'
                      ? 'animate-kitten-joy'
                      : 'animate-cat-idle'
                  }`}
                />
              </div>

              {/* Floating dreamy Zzz bubbles while curled up asleep */}
              {catPhase === 'sleeping' && (
                <div className="absolute -top-2 right-1 pointer-events-none select-none">
                  <span className="absolute text-[10px] font-extrabold text-indigo-400 animate-zzz">
                    z
                  </span>
                  <span
                    className="absolute text-xs font-extrabold text-indigo-500 animate-zzz"
                    style={{ left: '5px', animationDelay: '0.8s' }}
                  >
                    Z
                  </span>
                  <span
                    className="absolute text-[9px] font-extrabold text-violet-400 animate-zzz"
                    style={{ left: '-2px', animationDelay: '1.6s' }}
                  >
                    z
                  </span>
                </div>
              )}

              {/* Curious sniff sparkle when sniffing */}
              {catPhase === 'sniffing' && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-white/90 border border-amber-200 text-[8px] font-bold text-amber-700 shadow-xs whitespace-nowrap pointer-events-none">
                  schnupper…
                </span>
              )}

              {(catPhase === 'eating' || catPhase === 'happy' || showCatTag) && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-white/95 border border-rose-200 text-[9px] font-extrabold text-rose-600 shadow-sm whitespace-nowrap pointer-events-none">
                  {catPhase === 'eating'
                    ? `${walkerName} mampft!`
                    : catPhase === 'happy'
                    ? `${walkerName} ♥`
                    : `${walkerName} ♥`}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* PILL-FREE PAUSE STRIP */}
      {pauseDaysList.length > 0 && (
        <div className="w-full mt-3 rounded-2xl bg-white/85 border border-violet-200/70 p-3 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-violet-900 flex items-center gap-1.5">
              <Droplets className="w-3.5 h-3.5 app-accent-text" />
              Pause ({config.pauseDays} Tage)
            </span>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {pauseDaysList.map((p) => (
              <div
                key={p.pauseNum}
                className={`flex flex-col items-center py-1.5 rounded-xl border text-center transition ${
                  p.isToday
                    ? 'app-accent-bg text-white shadow-xs'
                    : p.isPast
                    ? 'bg-violet-100/80 text-violet-800 border-violet-200'
                    : 'bg-slate-50 text-slate-600 border-violet-100'
                }`}
              >
                <span className="text-[10px] font-bold leading-none">{p.weekday}</span>
                <span className="text-[10px] mt-1 opacity-85">P{p.pauseNum}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PACK COMPLETE BANNER */}
      {isPackFinished && (
        <div className="w-full mt-3 rounded-2xl app-accent-gradient text-white p-3.5 shadow-md flex items-center justify-between gap-3">
          <p className="text-sm font-bold">
            {isCatBowl ? 'Alle Näpfe leer!' : 'Blister fertig!'}
          </p>
          <button
            type="button"
            onClick={onStartNewPack}
            className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white app-accent-text text-xs font-bold shadow-sm active:scale-95 transition"
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
              <div className="flex items-center gap-2.5">
                {isCatPeek &&
                  (selectedPill.entry?.status === 'taken' ||
                    selectedPill.entry?.status === 'late') && (
                    <img
                      src={`/assets/cat-peek-happy-${selectedPill.dayIndex % 4}.png`}
                      alt=""
                      className="w-11 h-11 rounded-full object-cover border border-rose-100 animate-kitten-joy"
                    />
                  )}
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider app-accent-text">
                    {isCatPeek &&
                    (selectedPill.entry?.status === 'taken' ||
                      selectedPill.entry?.status === 'late')
                      ? `${getPeekCatName(selectedPill.dayIndex, catNames)} • #${selectedPill.dayIndex + 1}`
                      : `${isCatBowl ? 'Napf' : 'Pille'} #${selectedPill.dayIndex + 1}${
                          selectedPill.isPlacebo ? ' • Placebo' : ''
                        }`}
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    {getWeekdayShort(selectedPill.date)}, {formatDateShort(selectedPill.date)}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPill(null)}
                className="p-1.5 rounded-full bg-slate-100 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedPill.entry?.status === 'taken' || selectedPill.entry?.status === 'late' ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl bg-emerald-50 border border-emerald-200/70 p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-950">
                      {selectedPill.entry.status === 'late'
                        ? 'Verspätet'
                        : isCatBowl
                        ? `${walkerName} hat gefressen`
                        : 'Genommen'}
                    </p>
                    <p className="text-[11px] text-emerald-800 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTimeFromIso(selectedPill.entry.takenAt)}
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
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    {isCatBowl ? 'Auffüllen' : 'Rückgängig'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onMarkMissed(selectedPill.dayIndex, selectedPill.date);
                      setSelectedPill(null);
                    }}
                    className="py-2.5 px-3 rounded-xl bg-amber-50 text-amber-800 text-xs font-bold"
                  >
                    Vergessen
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl bg-amber-50 border border-amber-200/80 p-3 flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <p className="text-xs text-amber-900">
                    Erst am <strong>{formatDateShort(selectedPill.date)}</strong> fällig. Trotzdem
                    jetzt?
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
                    className="flex-1 py-2.5 rounded-xl app-accent-bg text-white text-xs font-bold shadow-sm"
                  >
                    {isCatBowl ? `${walkerName} füttern` : 'Ausdrücken'}
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
