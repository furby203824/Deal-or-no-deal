"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase,
  Phone,
  Trophy,
  RotateCcw,
  Award,
  X,
} from "lucide-react";
import {
  PRIZE_VALUES,
  CASES_PER_ROUND,
  BANKER_PERCENTAGES,
  DIFFICULTY_OPTIONS,
  type GamePhase,
  type CaseData,
  type LeaderboardEntry,
  type DifficultyLevel,
  shuffleArray,
  formatMoney,
  isHighValue,
  generateId,
  getCareerWinnings,
  saveCareerWinnings,
  getGamesPlayed,
  saveGamesPlayed,
  getLeaderboard,
  saveLeaderboardEntry,
  playCaseOpenSound,
  playPhoneRing,
  playDealSound,
  triggerHaptic,
  getPrizeValues,
} from "./utils";

// ─── Animated Counter Component ─────────────────────────────────────────────

function AnimatedCounter({
  target,
  duration = 1200,
  className,
}: {
  target: number;
  duration?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const startTime = performance.now();
    const startValue = 0;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(startValue + (target - startValue) * eased));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return <span className={className}>{formatMoney(display)}</span>;
}

// ─── Money Board ─────────────────────────────────────────────────────────────

function MoneyBoard({
  values,
  openedValues,
  totalRemaining,
}: {
  values: number[];
  openedValues: Set<number>;
  totalRemaining: number;
}) {
  const sorted = [...values].sort((a, b) => a - b);
  const left = sorted.slice(0, 13);
  const right = sorted.slice(13);

  // Scale font size as fewer cases remain
  const scaleFactor = totalRemaining <= 4 ? "text-sm sm:text-base" : "text-xs sm:text-sm";

  const renderValue = (value: number) => {
    const dimmed = openedValues.has(value);
    const high = isHighValue(value);
    return (
      <motion.div
        key={value}
        layout
        animate={{
          opacity: dimmed ? 0.15 : 1,
          scale: dimmed ? 0.92 : 1,
        }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={`
          px-2 py-1 rounded font-bold text-center transition-all
          ${scaleFactor}
          ${dimmed ? "line-through decoration-2" : ""}
          ${high
            ? dimmed
              ? "bg-gold-dark/10 text-gold-dark/40"
              : "bg-gold/20 text-gold-light"
            : dimmed
              ? "bg-blue-600/5 text-blue-500/30"
              : "bg-blue-600/20 text-blue-500"
          }
        `}
      >
        {formatMoney(value)}
      </motion.div>
    );
  };

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-1 w-full max-w-xs mx-auto">
      <div className="flex flex-col gap-1">{left.map(renderValue)}</div>
      <div className="flex flex-col gap-1">{right.map(renderValue)}</div>
    </div>
  );
}

// ─── Briefcase Component ─────────────────────────────────────────────────────

function BriefcaseButton({
  caseData,
  isPlayerCase,
  canOpen,
  onOpen,
}: {
  caseData: CaseData;
  isPlayerCase: boolean;
  canOpen: boolean;
  onOpen: (id: number) => void;
}) {
  const { id, value, isOpened } = caseData;
  const clickable = canOpen && !isOpened;

  return (
    <motion.button
      whileHover={clickable ? { scale: 1.08 } : {}}
      whileTap={clickable ? { scale: 0.93 } : {}}
      onClick={() => clickable && onOpen(id)}
      disabled={isOpened || !canOpen}
      className={`
        relative flex flex-col items-center justify-center gap-0.5
        w-full aspect-square rounded-lg transition-all duration-200
        ${isOpened ? "opacity-15 cursor-default" : ""}
        ${isPlayerCase && !isOpened ? "ring-2 ring-gold animate-pulse-gold" : ""}
        ${clickable ? "cursor-pointer case-shake hover:bg-slate-700/80" : "cursor-default"}
        ${!isOpened ? "glass" : "bg-slate-800/20"}
      `}
    >
      <Briefcase
        size={20}
        className={
          isPlayerCase
            ? "text-gold"
            : isOpened
              ? "text-slate-700"
              : "text-slate-300"
        }
      />
      <span
        className={`text-xs font-bold ${
          isPlayerCase
            ? "text-gold"
            : isOpened
              ? "text-slate-700"
              : "text-slate-300"
        }`}
      >
        {id}
      </span>
      {isOpened && (
        <motion.span
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className={`absolute -bottom-1 text-[9px] font-bold ${
            isHighValue(value) ? "text-gold-dark" : "text-blue-500/60"
          }`}
        >
          {formatMoney(value)}
        </motion.span>
      )}
    </motion.button>
  );
}

// ─── Banker Modal ────────────────────────────────────────────────────────────

function BankerModal({
  offer,
  round,
  onDeal,
  onNoDeal,
}: {
  offer: number;
  round: number;
  onDeal: () => void;
  onNoDeal: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.7, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.7, y: 40 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="glass-strong rounded-2xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl shadow-gold/10"
      >
        <motion.div
          animate={{ rotate: [0, -15, 15, -10, 10, 0] }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Phone className="mx-auto mb-3 text-gold" size={44} />
        </motion.div>
        <h2 className="text-lg sm:text-xl font-bold text-slate-300 mb-1">
          The Banker is calling...
        </h2>
        <p className="text-slate-500 text-sm mb-5">Round {round} Offer</p>
        <div className="shimmer-text text-4xl sm:text-5xl font-black mb-6">
          <AnimatedCounter target={offer} duration={1500} />
        </div>
        <div className="flex gap-3">
          <button
            onClick={onDeal}
            className="flex-1 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-black py-4 px-4 rounded-xl
              transition-all text-xl shadow-lg shadow-red-600/40 hover:shadow-red-500/50 hover:scale-[1.02]
              border border-red-500/30"
          >
            DEAL
          </button>
          <button
            onClick={onNoDeal}
            className="flex-1 bg-slate-700 hover:bg-slate-600 active:bg-slate-800 text-slate-200 font-bold py-4 px-4 rounded-xl
              transition-all text-base shadow-lg border border-slate-600/30"
          >
            NO DEAL
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Final Choice Modal ──────────────────────────────────────────────────────

function FinalChoiceModal({
  playerCaseId,
  lastCaseId,
  onSwap,
  onStay,
}: {
  playerCaseId: number;
  lastCaseId: number;
  onSwap: () => void;
  onStay: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.7, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.7, y: 40 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="glass-strong rounded-2xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl shadow-gold/10"
      >
        <Trophy className="mx-auto mb-3 text-gold" size={40} />
        <h2 className="text-xl font-bold text-slate-300 mb-2">Final Decision</h2>
        <p className="text-slate-400 text-sm mb-6">
          Keep your Case <span className="text-gold font-bold">#{playerCaseId}</span>, or swap
          with Case <span className="text-gold font-bold">#{lastCaseId}</span>?
        </p>
        <div className="flex gap-3">
          <button
            onClick={onStay}
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl
              transition-all text-lg shadow-lg shadow-blue-600/30 hover:scale-[1.02]"
          >
            KEEP #{playerCaseId}
          </button>
          <button
            onClick={onSwap}
            className="flex-1 bg-gold hover:bg-gold-light text-slate-900 font-bold py-3 px-4 rounded-xl
              transition-all text-lg shadow-lg shadow-gold/30 hover:scale-[1.02]"
          >
            SWAP #{lastCaseId}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Name Entry Modal ────────────────────────────────────────────────────────

function NameEntryModal({
  winnings,
  onSubmit,
  onSkip,
}: {
  winnings: number;
  onSubmit: (name: string) => void;
  onSkip: () => void;
}) {
  const [name, setName] = useState("");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.7, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.7, y: 40 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="glass-strong rounded-2xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl shadow-gold/10"
      >
        <Award className="mx-auto mb-3 text-gold" size={40} />
        <h2 className="text-lg font-bold text-slate-300 mb-1">You won {formatMoney(winnings)}!</h2>
        <p className="text-slate-500 text-sm mb-4">Enter your name for the leaderboard</p>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && name.trim() && onSubmit(name.trim())}
          placeholder="Your name..."
          maxLength={30}
          className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-slate-200
            placeholder:text-slate-600 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30
            text-center text-lg font-semibold mb-4"
          autoFocus
        />
        <div className="flex gap-3">
          <button
            onClick={onSkip}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold py-2.5 px-4 rounded-xl
              transition-colors text-sm"
          >
            Skip
          </button>
          <button
            onClick={() => name.trim() && onSubmit(name.trim())}
            disabled={!name.trim()}
            className="flex-1 bg-gold hover:bg-gold-light disabled:bg-slate-700 disabled:text-slate-500
              text-slate-900 font-bold py-2.5 px-4 rounded-xl transition-colors text-sm"
          >
            Save Score
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Game Over Modal ─────────────────────────────────────────────────────────

function GameOverModal({
  winnings,
  playerCaseValue,
  accepted,
  onPlayAgain,
}: {
  winnings: number;
  playerCaseValue: number;
  accepted: "deal" | "stay" | "swap";
  onPlayAgain: () => void;
}) {
  let message = "";
  if (accepted === "deal") {
    message = `Your case held ${formatMoney(playerCaseValue)}.`;
    if (playerCaseValue > winnings) {
      message += " The banker got you!";
    } else {
      message += " Great deal!";
    }
  } else if (accepted === "stay") {
    message = "You kept your case!";
  } else {
    message = "You swapped cases!";
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.7, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.7, y: 40 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="glass-strong rounded-2xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl shadow-gold/10"
      >
        <motion.div
          animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Trophy className="mx-auto mb-3 text-gold" size={48} />
        </motion.div>
        <h2 className="text-xl font-bold text-slate-300 mb-2">Game Over!</h2>
        <div className="shimmer-text text-4xl sm:text-5xl font-black mb-2">
          <AnimatedCounter target={winnings} duration={2000} />
        </div>
        <p className="text-slate-400 text-sm mb-6">{message}</p>
        <button
          onClick={onPlayAgain}
          className="w-full bg-gold hover:bg-gold-light text-slate-900 font-bold py-3 px-6 rounded-xl
            transition-all text-lg flex items-center justify-center gap-2 shadow-lg shadow-gold/30
            hover:scale-[1.02]"
        >
          <RotateCcw size={20} />
          Play Again
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── Leaderboard Panel ───────────────────────────────────────────────────────

function LeaderboardPanel({
  onClose,
}: {
  onClose: () => void;
}) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    setEntries(getLeaderboard());
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.7, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.7, y: 40 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="glass-strong rounded-2xl p-6 max-w-md w-full shadow-2xl shadow-gold/10 max-h-[80vh] flex flex-col"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
            <Award size={20} className="text-gold" /> Leaderboard
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        {entries.length === 0 ? (
          <p className="text-slate-500 text-center py-8 text-sm">No scores yet. Play a game!</p>
        ) : (
          <div className="overflow-y-auto flex-1 -mx-2 px-2">
            {entries.slice(0, 20).map((entry, i) => (
              <div
                key={entry.id}
                className={`flex items-center gap-3 py-2 px-3 rounded-lg mb-1
                  ${i === 0 ? "bg-gold/10 border border-gold/20" : ""}
                  ${i === 1 ? "bg-slate-400/5 border border-slate-400/10" : ""}
                  ${i === 2 ? "bg-gold-dark/10 border border-gold-dark/10" : ""}
                `}
              >
                <span className={`text-sm font-black w-6 text-center ${
                  i === 0 ? "text-gold" : i === 1 ? "text-slate-300" : i === 2 ? "text-gold-dark" : "text-slate-500"
                }`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-200 truncate">{entry.name}</p>
                  <p className="text-xs text-slate-500">
                    {entry.dealTaken ? `Deal R${entry.finalRound}` : "Went all the way"}{" "}
                    &middot; {new Date(entry.timestamp).toLocaleDateString()}
                  </p>
                </div>
                <span className={`text-sm font-bold ${
                  entry.amount >= 100000 ? "text-gold" : "text-slate-300"
                }`}>
                  {formatMoney(entry.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Difficulty Selector Modal ──────────────────────────────────────────────

function DifficultySelector({
  onSelect,
}: {
  onSelect: (difficulty: DifficultyLevel) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.7, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.7, y: 40 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="glass-strong rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl shadow-gold/10"
      >
        <h2 className="text-2xl font-black text-slate-200 mb-2">Choose Difficulty</h2>
        <p className="text-slate-400 text-sm mb-6">Select your maximum prize pool</p>
        <div className="grid grid-cols-2 gap-3">
          {DIFFICULTY_OPTIONS.map((option) => (
            <motion.button
              key={option.value}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onSelect(option.value)}
              className="glass rounded-xl p-4 hover:bg-gold/20 transition-all border border-slate-600/30 hover:border-gold/50"
            >
              <div className="text-lg font-bold text-gold">{option.label}</div>
              <div className="text-xs text-slate-400 mt-1">{option.value}</div>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Game ───────────────────────────────────────────────────────────────

export default function DealOrNoDeal() {
  const [cases, setCases] = useState<CaseData[]>([]);
  const [playerCaseId, setPlayerCaseId] = useState<number | null>(null);
  const [phase, setPhase] = useState<GamePhase>("pick_own_case");
  const [round, setRound] = useState(0);
  const [casesOpenedThisRound, setCasesOpenedThisRound] = useState(0);
  const [bankerOffer, setBankerOffer] = useState(0);
  const [finalWinnings, setFinalWinnings] = useState(0);
  const [acceptedType, setAcceptedType] = useState<"deal" | "stay" | "swap">("deal");
  const [careerWinnings, setCareerWinnings] = useState(0);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [lastOpenedValue, setLastOpenedValue] = useState<number | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [difficulty, setDifficulty] = useState<DifficultyLevel | null>(null);
  const [prizeValues, setPrizeValues] = useState<number[]>(PRIZE_VALUES);

  const initGame = useCallback(() => {
    const valuesToUse = difficulty ? getPrizeValues(difficulty) : prizeValues;
    const shuffled = shuffleArray(valuesToUse);
    const newCases: CaseData[] = shuffled.map((value, i) => ({
      id: i + 1,
      value,
      isOpened: false,
    }));
    setCases(newCases);
    setPlayerCaseId(null);
    setPhase("pick_own_case");
    setRound(0);
    setCasesOpenedThisRound(0);
    setBankerOffer(0);
    setFinalWinnings(0);
    setLastOpenedValue(null);
  }, [difficulty, prizeValues]);

  useEffect(() => {
    setCareerWinnings(getCareerWinnings());
    setGamesPlayed(getGamesPlayed());
  }, []);

  useEffect(() => {
    if (difficulty) {
      setPrizeValues(getPrizeValues(difficulty));
      initGame();
    }
  }, [difficulty, initGame]);

  // Derived state
  const openedValues = new Set(cases.filter((c) => c.isOpened).map((c) => c.value));
  const remainingCases = cases.filter((c) => !c.isOpened && c.id !== playerCaseId);
  const casesToOpenThisRound = CASES_PER_ROUND[Math.min(round, CASES_PER_ROUND.length - 1)];
  const casesLeftToOpen = casesToOpenThisRound - casesOpenedThisRound;
  const playerCase = cases.find((c) => c.id === playerCaseId);

  const handlePickOwnCase = (id: number) => {
    if (phase !== "pick_own_case") return;
    setPlayerCaseId(id);
    setPhase("opening_cases");
    setRound(0);
    setCasesOpenedThisRound(0);
    if (soundEnabled) playCaseOpenSound(false);
  };

  const handleOpenCase = (id: number) => {
    if (phase !== "opening_cases") return;
    if (id === playerCaseId) return;
    const caseToOpen = cases.find((c) => c.id === id);
    if (!caseToOpen || caseToOpen.isOpened) return;

    const updatedCases = cases.map((c) => (c.id === id ? { ...c, isOpened: true } : c));
    setCases(updatedCases);
    setLastOpenedValue(caseToOpen.value);

    if (soundEnabled) playCaseOpenSound(isHighValue(caseToOpen.value));
    if (isHighValue(caseToOpen.value)) triggerHaptic([50, 30, 80]);

    const newOpenedCount = casesOpenedThisRound + 1;
    setCasesOpenedThisRound(newOpenedCount);

    if (newOpenedCount >= casesToOpenThisRound) {
      const stillRemaining = updatedCases.filter((c) => !c.isOpened && c.id !== playerCaseId);
      if (stillRemaining.length === 1) {
        setPhase("final_choice");
      } else {
        const avg = stillRemaining.reduce((sum, c) => sum + c.value, 0) / stillRemaining.length;
        const pctIndex = Math.min(round, BANKER_PERCENTAGES.length - 1);
        const offer = Math.round(avg * BANKER_PERCENTAGES[pctIndex]);
        setBankerOffer(offer);
        setPhase("banker_offer");
        if (soundEnabled) setTimeout(() => playPhoneRing(), 300);
      }
    }
  };

  const finishGame = (winnings: number, type: "deal" | "stay" | "swap") => {
    setFinalWinnings(winnings);
    setAcceptedType(type);
    setPhase("enter_name");
    if (soundEnabled) playDealSound();
    triggerHaptic(100);
    const newCareer = careerWinnings + winnings;
    const newGames = gamesPlayed + 1;
    setCareerWinnings(newCareer);
    setGamesPlayed(newGames);
    saveCareerWinnings(newCareer);
    saveGamesPlayed(newGames);
  };

  const handleDeal = () => finishGame(bankerOffer, "deal");

  const handleNoDeal = () => {
    setRound((r) => r + 1);
    setCasesOpenedThisRound(0);
    setPhase("opening_cases");
    setLastOpenedValue(null);
  };

  const handleStay = () => finishGame(playerCase?.value ?? 0, "stay");
  const handleSwap = () => finishGame(remainingCases[0]?.value ?? 0, "swap");

  const handleNameSubmit = (name: string) => {
    saveLeaderboardEntry({
      id: generateId(),
      name,
      amount: finalWinnings,
      timestamp: new Date().toISOString(),
      dealTaken: acceptedType === "deal",
      finalRound: round + 1,
      synced: false,
    });
    setPhase("game_over");
  };

  const handleNameSkip = () => setPhase("game_over");
  const handlePlayAgain = () => {
    setDifficulty(null);
  };

  // Status message
  let statusMessage = "";
  if (phase === "pick_own_case") {
    statusMessage = "Choose your briefcase to keep!";
  } else if (phase === "opening_cases") {
    statusMessage = `Round ${round + 1} \u2014 Open ${casesLeftToOpen} more case${casesLeftToOpen !== 1 ? "s" : ""}`;
  } else if (phase === "banker_offer") {
    statusMessage = "The Banker is making an offer...";
  } else if (phase === "final_choice") {
    statusMessage = "Final decision time!";
  }

  if (cases.length === 0 || difficulty === null) {
    return (
      <div className="flex-1 flex flex-col items-center p-3 sm:p-4 max-w-5xl mx-auto w-full justify-center">
        <AnimatePresence>
          {difficulty === null && (
            <DifficultySelector onSelect={setDifficulty} />
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center p-3 sm:p-4 max-w-5xl mx-auto w-full">
      {/* Header */}
      <header className="w-full text-center mb-3">
        <h1 className="shimmer-text text-3xl sm:text-4xl font-black tracking-tight">
          DEAL OR NO DEAL
        </h1>
        <div className="flex justify-center items-center gap-3 mt-1 text-xs text-slate-400 flex-wrap">
          <span>
            Career: <span className="text-gold font-bold">{formatMoney(careerWinnings)}</span>
          </span>
          <span className="text-slate-600">|</span>
          <span>Games: {gamesPlayed}</span>
          <span className="text-slate-600">|</span>
          <button
            onClick={() => setShowLeaderboard(true)}
            className="text-gold/60 hover:text-gold transition-colors flex items-center gap-1"
          >
            <Award size={12} /> Board
          </button>
          <button
            onClick={() => setSoundEnabled((s) => !s)}
            className="text-slate-600 hover:text-slate-400 transition-colors text-[10px]"
          >
            {soundEnabled ? "SFX ON" : "SFX OFF"}
          </button>
        </div>
      </header>

      {/* Status Bar */}
      <motion.div
        key={statusMessage}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-xl px-4 py-2 mb-3 text-center"
      >
        <p className="text-sm sm:text-base font-semibold text-slate-200">{statusMessage}</p>
        {phase === "opening_cases" && playerCaseId && (
          <p className="text-xs text-slate-400 mt-0.5">
            Your case: <span className="text-gold font-bold">#{playerCaseId}</span>
          </p>
        )}
      </motion.div>

      {/* Last Opened Value Toast */}
      <AnimatePresence>
        {lastOpenedValue !== null && phase === "opening_cases" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -10 }}
            className={`mb-3 px-4 py-1.5 rounded-lg text-sm font-bold ${
              isHighValue(lastOpenedValue)
                ? "bg-red-600/20 text-red-500 border border-red-500/30"
                : "bg-blue-600/20 text-blue-500 border border-blue-500/30"
            }`}
          >
            {formatMoney(lastOpenedValue)} removed
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Layout */}
      <div className="flex flex-col lg:flex-row gap-4 w-full flex-1">
        <div className="lg:w-56 shrink-0">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 text-center">
            Prize Board
          </h3>
          <MoneyBoard
            values={prizeValues}
            openedValues={openedValues}
            totalRemaining={remainingCases.length + 1}
          />
        </div>
        <div className="flex-1">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 text-center">
            Briefcases
          </h3>
          <div className="grid grid-cols-5 sm:grid-cols-7 lg:grid-cols-9 gap-2">
            {cases.map((c) => (
              <BriefcaseButton
                key={c.id}
                caseData={c}
                isPlayerCase={c.id === playerCaseId}
                canOpen={
                  phase === "pick_own_case" ||
                  (phase === "opening_cases" && c.id !== playerCaseId && !c.isOpened)
                }
                onOpen={phase === "pick_own_case" ? handlePickOwnCase : handleOpenCase}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {difficulty === null && (
          <DifficultySelector onSelect={setDifficulty} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {phase === "banker_offer" && (
          <BankerModal
            offer={bankerOffer}
            round={round + 1}
            onDeal={handleDeal}
            onNoDeal={handleNoDeal}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {phase === "final_choice" && playerCaseId && remainingCases.length === 1 && (
          <FinalChoiceModal
            playerCaseId={playerCaseId}
            lastCaseId={remainingCases[0].id}
            onSwap={handleSwap}
            onStay={handleStay}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {phase === "enter_name" && (
          <NameEntryModal
            winnings={finalWinnings}
            onSubmit={handleNameSubmit}
            onSkip={handleNameSkip}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {phase === "game_over" && playerCase && (
          <GameOverModal
            winnings={finalWinnings}
            playerCaseValue={playerCase.value}
            accepted={acceptedType}
            onPlayAgain={handlePlayAgain}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showLeaderboard && (
          <LeaderboardPanel onClose={() => setShowLeaderboard(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
