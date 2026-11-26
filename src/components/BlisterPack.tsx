import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  RotateCw,
  Check,
  AlertCircle,
  Clock,
  RefreshCw,
  Droplets,
  Undo2,
  X,
} from 'lucide-react';
import type { BlisterConfig, BlisterThemeId, CatNames, PillEntry } from '../types';
import { PILL_COLORS } from '../data/presets';
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

type CatActionState = 'idle' | 'walking' | 'eating' | 'happy' | 'sniffing' | 'sleeping';
type BowlEatStage = 'full' | 'half' | 'empty';

const ROTATION_SEEDS = [12, 74, 138, 196, 251, 314, 43, 109, 172, 229, 287, 342];

const WALK_FRAMES = [
  '/assets/cat-walk-0.png',
  '/assets/cat-walk-1.png',
  '/assets/cat-walk-2.png',
  '/assets/cat-walk-3.png',
];

const PRELOAD_SPRITES = [
  '/assets/cat-walker.png',
  ...WALK_FRAMES,
  '/assets/cat-eat-1.png',
  '/assets/cat-eat-2.png',
  '/assets/cat-sniff.png',
  '/assets/cat-sleep-1.png',
  '/assets/cat-sleep-2.png',
  '/assets/cat-bowl-full.png',
  '/assets/cat-bowl-half.png',
  '/assets/cat-bowl-empty.png',
  '/assets/cat-peek-0.png',
  '/assets/cat-peek-1.png',
  '/assets/cat-peek-2.png',
  '/assets/cat-peek-3.png',
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

  // Peeking kittens happy expression index
  const [happyKittenIdx, setHappyKittenIdx] = useState<number | null>(null);

  // Distance-driven real-position painted cat actor state (NEVER walks in place!)
  const cardRef = useRef<HTMLDivElement | null>(null);
  const pocketRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const [catPos, setCatPos] = useState<{ x: number; y: number } | null>(null);
  const [catFacing, setCatFacing] = useState<'left' | 'right'>('left');
  const [catState, setCatState] = useState<CatActionState>('idle');
  const [walkFrameIdx, setWalkFrameIdx] = useState<number>(0);
  const [eatFrameIdx, setEatFrameIdx] = useState<0 | 1>(0);
  const [sleepBreathIdx, setSleepBreathIdx] = useState<0 | 1>(0);
  const [eatingBowlIndex, setEatingBowlIndex] = useState<number | null>(null);
  const [eatingBowlStage, setEatingBowlStage] = useState<BowlEatStage>('full');
  const [crumbBurstKey, setCrumbBurstKey] = useState(0);
  const [pawPrints, setPawPrints] = useState<PawPrint[]>([]);
  const [showCatTag, setShowCatTag] = useState(false);

  const catPosRef = useRef<{ x: number; y: number }>({ x: 160, y: 34 });
  const walkRafRef = useRef<number | null>(null);
  const actionTimersRef = useRef<number[]>([]);
  const roamTimersRef = useRef<number[]>([]);
  const roamStepRef = useRef<number>(0);
  const holdTimerRef = useRef<number | null>(null);
  const didHoldPopRef = useRef(false);

  // Preload all painted sprites for instant frame transitions
  useEffect(() => {
    PRELOAD_SPRITES.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  const stopWalkingMotion = () => {
    if (walkRafRef.current !== null) {
      window.cancelAnimationFrame(walkRafRef.current);
      walkRafRef.current = null;
    }
  };

  const clearActionTimers = () => {
    actionTimersRef.current.forEach((id) => window.clearTimeout(id));
    actionTimersRef.current = [];
  };

  const clearRoamTimers = () => {
    roamTimersRef.current.forEach((id) => window.clearTimeout(id));
    roamTimersRef.current = [];
  };

  useEffect(() => {
    if (catPos) catPosRef.current = catPos;
  }, [catPos]);

  useEffect(() => {
    return () => {
      stopWalkingMotion();
      clearActionTimers();
      clearRoamTimers();
    };
  }, []);

  useEffect(() => {
    if (isCatBowl && isBackView) setIsBackView(false);
  }, [isCatBowl, isBackView]);

  // Smooth eating frame swap ONLY while actively eating
  useEffect(() => {
    if (catState !== 'eating') {
      setEatFrameIdx(0);
      return;
    }
    const id = window.setInterval(() => {
      setEatFrameIdx((f) => (f === 0 ? 1 : 0));
    }, 260);
    return () => window.clearInterval(id);
  }, [catState]);

  // Peaceful breathing frame crossfade ONLY while sleeping (ZERO CSS scaling!)
  useEffect(() => {
    if (catState !== 'sleeping') {
      setSleepBreathIdx(0);
      return;
    }
    const id = window.setInterval(() => {
      setSleepBreathIdx((f) => (f === 0 ? 1 : 0));
    }, 1300);
    return () => window.clearInterval(id);
  }, [catState]);

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

  // Periodic natural happy smile/meow on a random popped kitten in Katzen-Versteck
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
      }, 1300);
    }, 3600);
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

  /**
   * TRUE DISTANCE-DRIVEN WALK ENGINE (requestAnimationFrame):
   * Moves (x, y) smoothly at constant real speed (px/sec).
   * Advances walk frames strictly every `stepPx` of ACTUAL distance traveled —
   * mathematically impossible to ever walk in place or slide!
   */
  const walkCatToPoint = (
    dest: { x: number; y: number },
    speedPxPerSec: number,
    onArrive: () => void
  ) => {
    stopWalkingMotion();
    const start = { ...catPosRef.current };
    const dx = dest.x - start.x;
    const dy = dest.y - start.y;
    const totalDist = Math.hypot(dx, dy);

    if (totalDist < 6) {
      onArrive();
      return;
    }

    setCatFacing(dx >= 0 ? 'right' : 'left');
    setCatState('walking');

    const moveAngle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    let lastNow = performance.now();
    let traveled = 0;
    let nextPawAt = 24;
    let pawStepSide = 1;

    const step = (now: number) => {
      const dt = Math.min(0.05, (now - lastNow) / 1000);
      lastNow = now;
      traveled = Math.min(totalDist, traveled + speedPxPerSec * dt);
      const frac = traveled / totalDist;

      const curX = start.x + dx * frac;
      const curY = start.y + dy * frac;
      catPosRef.current = { x: curX, y: curY };
      setCatPos({ x: curX, y: curY });

      // Advance 4-frame stride cycle ONLY as real pixels are covered!
      const frameIdx = Math.floor(traveled / 14) % WALK_FRAMES.length;
      setWalkFrameIdx(frameIdx);

      // Leave a gentle pawprint behind actual footsteps
      if (traveled >= nextPawAt && totalDist - traveled > 14) {
        const px = curX - (dx / totalDist) * 10 + (pawStepSide * 4);
        const py = curY + 14;
        const pid = Date.now() + Math.floor(traveled);
        setPawPrints((prev) => [...prev.slice(-6), { id: pid, x: px, y: py, angle: moveAngle }]);
        window.setTimeout(() => {
          setPawPrints((prev) => prev.filter((p) => p.id !== pid));
        }, 1600);
        nextPawAt += 28;
        pawStepSide = -pawStepSide;
      }

      if (traveled < totalDist) {
        walkRafRef.current = window.requestAnimationFrame(step);
      } else {
        walkRafRef.current = null;
        // Stop walk frames IMMEDIATELY upon arrival (never walks in place!)
        onArrive();
      }
    };

    walkRafRef.current = window.requestAnimationFrame(step);
  };

  // Initial cat placement when entering Cat Bowl mode
  useEffect(() => {
    if (!isCatBowl) return;
    stopWalkingMotion();
    clearActionTimers();
    clearRoamTimers();

    const raf = window.requestAnimationFrame(() => {
      const cardW = cardRef.current?.clientWidth || 320;
      const poppedPills = pills.filter(
        (p) => p.entry?.status === 'taken' || p.entry?.status === 'late'
      );
      if (poppedPills.length === 0) {
        const pt = { x: cardW / 2, y: 34 };
        catPosRef.current = pt;
        setCatPos(pt);
        setCatFacing('left');
        setCatState('idle');
        return;
      }
      const anchor = poppedPills[poppedPills.length - 1];
      const pt = getPocketCenter(anchor.dayIndex);
      if (pt) {
        const stand = { x: Math.min(cardW - 36, pt.x + 22), y: Math.max(38, pt.y - 6) };
        catPosRef.current = stand;
        setCatPos(stand);
        setCatState('idle');
      }
    });
    return () => window.cancelAnimationFrame(raf);
  }, [isCatBowl, config.columns, currentSheet, totalPhysicalPills]);

  // AUTONOMOUS COZY LIFE: After eating at least 1 bowl, stroll -> sniff -> stroll -> curl up & sleep!
  useEffect(() => {
    if (!isCatBowl || poppedCount === 0 || eatingBowlIndex !== null || catState !== 'idle') {
      return;
    }

    clearRoamTimers();
    const tNext = window.setTimeout(() => {
      const cardEl = cardRef.current;
      if (!cardEl) return;
      const cw = cardEl.clientWidth || 320;
      const ch = cardEl.clientHeight || 280;
      const start = catPosRef.current;

      roamStepRef.current += 1;
      const shouldSleep = roamStepRef.current % 2 === 0;

      // Pick a pleasant unobstructed destination inside the mat
      const padX = 38;
      const padTop = 44;
      const padBottom = 38;
      let destX = padX + Math.random() * Math.max(40, cw - padX * 2);
      let destY = padTop + Math.random() * Math.max(40, ch - padTop - padBottom);
      if (Math.hypot(destX - start.x, destY - start.y) < 60) {
        destX = start.x > cw / 2 ? padX + 20 : cw - padX - 20;
      }

      // Calm leisurely stroll (58 px/s, distance-driven frames!)
      walkCatToPoint({ x: destX, y: destY }, 58, () => {
        if (shouldSleep) {
          setCatState('sleeping');
          const tWake = window.setTimeout(() => {
            setCatState('idle');
          }, 7200);
          roamTimersRef.current.push(tWake);
        } else {
          setCatState('sniffing');
          const tDoneSniff = window.setTimeout(() => {
            setCatState('idle');
          }, 2800);
          roamTimersRef.current.push(tDoneSniff);
        }
      });
    }, 1600);

    roamTimersRef.current = [tNext];
    return () => clearRoamTimers();
  }, [isCatBowl, poppedCount, eatingBowlIndex, catState]);

  // Send painted cat walking cleanly to the clicked bowl, eat in 3 stages, then resume cozy life!
  const runCatToBowl = (dayIndex: number, date: string) => {
    stopWalkingMotion();
    clearActionTimers();
    clearRoamTimers();

    const target = getPocketCenter(dayIndex);
    if (!target) {
      playCatMunchSound(soundEnabled);
      onPopPill(dayIndex, date);
      return;
    }

    const cardW = cardRef.current?.clientWidth || 320;
    const standOnRight = target.x < cardW * 0.72;
    const dest = {
      x: standOnRight ? target.x + 24 : target.x - 24,
      y: Math.max(38, target.y - 6),
    };

    setEatingBowlIndex(dayIndex);
    setEatingBowlStage('full');
    triggerHaptic(hapticsEnabled, 'light');

    // Eager trot straight to the bowl (110 px/s, distance-driven 4-frame stride!)
    walkCatToPoint(dest, 110, () => {
      // Face the bowl directly and begin real 3-stage eating!
      setCatFacing(standOnRight ? 'left' : 'right');
      setCatState('eating');
      setCrumbBurstKey((k) => k + 1);
      playCatMunchSound(soundEnabled);
      triggerHaptic(hapticsEnabled, 'medium');

      const tHalf = window.setTimeout(() => {
        setEatingBowlStage('half');
        setCrumbBurstKey((k) => k + 1);
        triggerHaptic(hapticsEnabled, 'light');
      }, 520);

      const tEmpty = window.setTimeout(() => {
        setEatingBowlStage('empty');
        setCatState('happy');
        onPopPill(dayIndex, date);
        triggerHaptic(hapticsEnabled, 'heavy');
      }, 1100);

      const tIdle = window.setTimeout(() => {
        setEatingBowlIndex(null);
        setCatState('idle');
      }, 2000);

      actionTimersRef.current = [tHalf, tEmpty, tIdle];
    });
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
      }, 1600);
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

  // Active painted sprite URL for the bowl cat (ZERO CSS scaling/wobble!)
  const activeCatSprite =
    catState === 'walking'
      ? WALK_FRAMES[walkFrameIdx]
      : catState === 'eating'
      ? eatFrameIdx === 0
        ? '/assets/cat-eat-1.png'
        : '/assets/cat-eat-2.png'
      : catState === 'happy'
      ? '/assets/cat-eat-2.png'
      : catState === 'sniffing'
      ? '/assets/cat-sniff.png'
      : catState === 'sleeping'
      ? sleepBreathIdx === 0
        ? '/assets/cat-sleep-1.png'
        : '/assets/cat-sleep-2.png'
      : '/assets/cat-walker.png';

  const renderPocket = (pill: (typeof pills)[number]) => {
    const status = pill.entry?.status;
    const isPopped = status === 'taken' || status === 'late';
    const isMissed = status === 'missed' || (pill.isPast && !isPopped && !pill.isPlacebo);
    const isJustPopping = poppingAnim?.dayIndex === pill.dayIndex;
    const isActiveEatBowl = isCatBowl && eatingBowlIndex === pill.dayIndex;
    const isBeingEaten = isActiveEatBowl && catState === 'eating';
    const isPressing = pressingIndex === pill.dayIndex;
    const isKittenHappy = isCatPeek && happyKittenIdx === pill.dayIndex;
    const colorKey = pill.isPlacebo ? config.placeboColor : config.activeColor;
    const colorStyle = PILL_COLORS[colorKey];
    const rotation = ROTATION_SEEDS[pill.dayIndex % ROTATION_SEEDS.length];
    const catVariantIdx = pill.dayIndex % 4;

    const pocketDim =
      config.columns >= 7
        ? 'w-10 h-10 sm:w-11 sm:h-11'
        : config.columns >= 5
        ? 'w-12 h-12 sm:w-13 sm:h-13'
        : 'w-14 h-14 sm:w-15 sm:h-15';

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
          } ${isPressing ? 'scale-[0.90]' : 'active:scale-[0.92]'}`}
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
                className="w-[108%] h-[108%] max-w-none object-contain drop-shadow-sm pointer-events-none"
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

              {/* Crunchy kibble crumbs popping out during eating */}
              {isBeingEaten && (
                <div key={crumbBurstKey} className="absolute inset-0 pointer-events-none z-40">
                  {[
                    { cx: '-16px', cy: '-18px' },
                    { cx: '18px', cy: '-15px' },
                    { cx: '-12px', cy: '-24px' },
                    { cx: '10px', cy: '-22px' },
                  ].map((c, idx) => (
                    <span
                      key={idx}
                      className="absolute top-1/2 left-1/2 w-1.5 h-1.5 rounded-full bg-amber-800 shadow-xs animate-crumb-fly"
                      style={
                        {
                          '--cx': c.cx,
                          '--cy': c.cy,
                          animationDelay: `${idx * 55}ms`,
                        } as React.CSSProperties
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          ) : isPopped ? (
            isCatPeek ? (
              /* BELOVED PAINTED PEEKING KITTENS — smooth pop-out + crisp happy ^ ^ meow swap, ZERO wobbling! */
              <div
                className={`relative w-[118%] h-[118%] rounded-full flex items-center justify-center pointer-events-none ${
                  isJustPopping ? 'animate-cat-peek' : ''
                }`}
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
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-rose-500 text-[11px] font-bold animate-heart-float">
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
              className="relative w-full h-full rounded-full flex flex-col items-center justify-center border border-slate-400/60 shadow-inner"
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
            <div className="relative w-full h-full rounded-full flex items-center justify-center">
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

      {/* SERENE, UNCLUTTERED BLISTER CARD (design selection lives cleanly in Settings!) */}
      <div className="w-full perspective-1200">
        <div
          ref={cardRef}
          className={`relative w-full transition-all duration-500 ${surfaceClass} rounded-[28px] px-3.5 py-5 sm:px-5 sm:py-5 border overflow-hidden`}
        >
          {/* Minimal Clean Top Bar inside Card */}
          <div
            className={`relative z-10 flex items-center justify-between text-[11px] font-semibold opacity-80 px-0.5 select-none ${
              isCatBowl && poppedCount === 0 ? 'mb-9' : 'mb-3.5'
            }`}
          >
            <span
              className={
                isCatBowl ? 'text-amber-900' : isRoseGold ? 'text-rose-900' : 'text-slate-600'
              }
            >
              {config.brandName.trim() ? `${config.brandName.trim()} • ${schemaTag}` : schemaTag}
            </span>

            <div className="flex items-center gap-2">
              <span
                className={
                  isCatBowl ? 'text-amber-900' : isRoseGold ? 'text-rose-900' : 'text-slate-600'
                }
              >
                {poppedCount}/{totalPhysicalPills}
              </span>
              {!isCatBowl && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(hapticsEnabled, 'light');
                    setIsBackView((v) => !v);
                  }}
                  className="w-6 h-6 rounded-full bg-white/60 hover:bg-white/90 text-slate-600 flex items-center justify-center active:scale-95 transition"
                  title="Rückseite"
                  aria-label="Blister umdrehen"
                >
                  <RotateCw
                    className={`w-3 h-3 transition-transform duration-300 ${
                      isBackView ? 'rotate-180 app-accent-text' : ''
                    }`}
                  />
                </button>
              )}
            </div>
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

          {/* Pawprint trail overlay dropped by actual footsteps */}
          {isCatBowl &&
            pawPrints.map((pp) => (
              <svg
                key={pp.id}
                viewBox="0 0 24 24"
                className="absolute w-3.5 h-3.5 text-amber-800/35 fill-current pointer-events-none z-20"
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

          {/* CLEAN RESPONSIVE BLISTER GRID (ZERO OVERLAPPING!) */}
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
                        {renderPocket(pill)}

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

          {/* ORIGINAL BELOVED PAINTED STORYBOOK CAT — DISTANCE-DRIVEN 4-FRAME WALK, ZERO RUNNING IN PLACE, ZERO SCALING WOBBLE! */}
          {isCatBowl && catPos && (
            <button
              type="button"
              onClick={() => {
                stopWalkingMotion();
                clearRoamTimers();
                playCatPeekSound(soundEnabled);
                triggerHaptic(hapticsEnabled, 'light');
                setCatState('happy');
                setShowCatTag(true);
                window.setTimeout(() => {
                  setCatState((cur) => (cur === 'happy' ? 'idle' : cur));
                  setShowCatTag(false);
                }, 1500);
              }}
              aria-label={walkerName}
              className="absolute z-30 w-16 h-16 -translate-x-1/2 -translate-y-1/2 cursor-pointer focus:outline-none flex items-center justify-center"
              style={{
                left: `${catPos.x}px`,
                top: `${catPos.y}px`,
              }}
            >
              {/* Soft grounded shadow */}
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-10 h-2.5 rounded-full bg-amber-950/18 blur-[2px] pointer-events-none" />

              <div
                className="w-full h-full flex items-center justify-center"
                style={{
                  transform:
                    catState === 'sleeping'
                      ? 'scaleX(1)'
                      : catFacing === 'right'
                      ? 'scaleX(-1)'
                      : 'scaleX(1)',
                }}
              >
                <img
                  src={activeCatSprite}
                  alt={walkerName}
                  draggable={false}
                  className="w-full h-full object-contain drop-shadow-md pointer-events-none"
                />
              </div>

              {/* Gentle floating Zzz when curled up sleeping */}
              {catState === 'sleeping' && (
                <div className="absolute -top-1 right-1 pointer-events-none select-none">
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

              {/* Subtle sniff label */}
              {catState === 'sniffing' && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-white/92 border border-amber-200 text-[8px] font-bold text-amber-800 shadow-xs whitespace-nowrap pointer-events-none">
                  schnupper…
                </span>
              )}

              {(catState === 'eating' || catState === 'happy' || showCatTag) && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-white/95 border border-rose-200 text-[9px] font-extrabold text-rose-600 shadow-sm whitespace-nowrap pointer-events-none">
                  {catState === 'eating' ? `${walkerName} mampft!` : `${walkerName} ♥`}
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
                      className="w-11 h-11 rounded-full object-cover border border-rose-100"
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
