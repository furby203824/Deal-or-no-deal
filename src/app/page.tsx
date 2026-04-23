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

// ─── Animation Variants ────────────────────────────────────────────────────

const popVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: { scale: 1, opacity: 1 },
  exit: { scale: 0, opacity: 0 },
};

const bowingVariants = {
  hidden: { scale: 0.8, opacity: 0, y: 20 },
  visible: { scale: 1, opacity: 1, y: 0 },
  exit: { scale: 0.8, opacity: 0, y: 20 },
};

const briefcasePopVariants = {
  hidden: { scale: 0.6, opacity: 0, rotate: -15 },
  visible: { scale: 1, opacity: 1, rotate: 0 },
};

const modalBowingVariants = {
  hidden: { scale: 0.5, opacity: 0, y: 60 },
  visible: { scale: 1, opacity: 1, y: 0 },
  exit: { scale: 0.5, opacity: 0, y: 60 },
};
import {
  PRIZE_VALUES,
  CASES_PER_ROUND,
  BANKER_PERCENTAGES,
  DIFFICULTY_OPTIONS,
  type GamePhase,
  type CaseData,
  type LeaderboardEntry,
  type DifficultyLevel,
  type PlayerAvatar,
  type AvatarShape,
  type AvatarMetadata,
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
  generateDefaultAvatar,
  generateSimpleAvatar,
  isValidSVG,
  getPlayerAvatar,
  savePlayerAvatar,
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
        variants={{
          initial: { scale: 1, opacity: 1 },
          dimmed: { scale: 0.92, opacity: 0.15 },
        }}
        animate={dimmed ? "dimmed" : "initial"}
        transition={dimmed ? { type: "spring", stiffness: 200, damping: 20 } : { duration: 0.3 }}
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
      variants={briefcasePopVariants}
      initial="hidden"
      animate="visible"
      transition={{ type: "spring", stiffness: 200, damping: 15 }}
      whileHover={clickable ? { scale: 1.1, y: -4 } : {}}
      whileTap={clickable ? { scale: 0.88 } : {}}
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
          initial={{ opacity: 0, scale: 0, y: -5 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 250, damping: 15 }}
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
  onShowOffers,
  hasOffers,
}: {
  offer: number;
  round: number;
  onDeal: () => void;
  onNoDeal: () => void;
  onShowOffers: () => void;
  hasOffers: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
    >
      <motion.div
        variants={modalBowingVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={{ type: "spring", stiffness: 120, damping: 20, mass: 1.4 }}
        onClick={(e) => e.stopPropagation()}
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
        {hasOffers && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onShowOffers}
            className="w-full mb-3 bg-slate-800/50 hover:bg-slate-800 text-slate-300 font-semibold py-2 px-4 rounded-lg
              transition-all text-xs border border-slate-600/30 hover:border-gold/30"
          >
            📊 View Offer History
          </motion.button>
        )}
        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.06, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={onDeal}
            className="flex-1 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-black py-4 px-4 rounded-xl
              transition-all text-xl shadow-lg shadow-red-600/40 hover:shadow-red-500/50
              border border-red-500/30"
          >
            DEAL
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.06, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={onNoDeal}
            className="flex-1 bg-slate-700 hover:bg-slate-600 active:bg-slate-800 text-slate-200 font-bold py-4 px-4 rounded-xl
              transition-all text-base shadow-lg border border-slate-600/30"
          >
            NO DEAL
          </motion.button>
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
        variants={modalBowingVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={{ type: "spring", stiffness: 120, damping: 20, mass: 1.4 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-strong rounded-2xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl shadow-gold/10"
      >
        <Trophy className="mx-auto mb-3 text-gold" size={40} />
        <h2 className="text-xl font-bold text-slate-300 mb-2">Final Decision</h2>
        <p className="text-slate-400 text-sm mb-6">
          Keep your Case <span className="text-gold font-bold">#{playerCaseId}</span>, or swap
          with Case <span className="text-gold font-bold">#{lastCaseId}</span>?
        </p>
        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.06, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={onStay}
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl
              transition-all text-lg shadow-lg shadow-blue-600/30"
          >
            KEEP #{playerCaseId}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.06, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={onSwap}
            className="flex-1 bg-gold hover:bg-gold-light text-slate-900 font-bold py-3 px-4 rounded-xl
              transition-all text-lg shadow-lg shadow-gold/30"
          >
            SWAP #{lastCaseId}
          </motion.button>
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
        variants={modalBowingVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={{ type: "spring", stiffness: 120, damping: 20, mass: 1.4 }}
        onClick={(e) => e.stopPropagation()}
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
          <motion.button
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.95 }}
            onClick={onSkip}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold py-2.5 px-4 rounded-xl
              transition-colors text-sm"
          >
            Skip
          </motion.button>
          <motion.button
            whileHover={name.trim() ? { scale: 1.05, y: -1 } : {}}
            whileTap={name.trim() ? { scale: 0.95 } : {}}
            onClick={() => name.trim() && onSubmit(name.trim())}
            disabled={!name.trim()}
            className="flex-1 bg-gold hover:bg-gold-light disabled:bg-slate-700 disabled:text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed
              text-slate-900 font-bold py-2.5 px-4 rounded-xl transition-all text-sm"
          >
            Save Score
          </motion.button>
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
  avatar,
  onPlayAgain,
}: {
  winnings: number;
  playerCaseValue: number;
  accepted: "deal" | "stay" | "swap";
  avatar: PlayerAvatar | null;
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
        variants={modalBowingVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={{ type: "spring", stiffness: 120, damping: 20, mass: 1.4 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-strong rounded-2xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl shadow-gold/10"
      >
        {avatar && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 }}
            className="mb-4"
          >
            <AvatarPreview avatar={avatar} size="large" />
          </motion.div>
        )}

        <motion.div
          animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Trophy className="mx-auto mb-3 text-gold" size={48} />
        </motion.div>

        <h2 className="text-xl font-bold text-slate-300 mb-3">Game Over!</h2>

        <div className="shimmer-text text-5xl sm:text-6xl font-black mb-3">
          <AnimatedCounter target={winnings} duration={2000} />
        </div>

        <p className="text-slate-400 text-sm mb-6">{message}</p>
        <motion.button
          whileHover={{ scale: 1.06, y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={onPlayAgain}
          className="w-full bg-gold hover:bg-gold-light text-slate-900 font-bold py-3 px-6 rounded-xl
            transition-all text-lg flex items-center justify-center gap-2 shadow-lg shadow-gold/30"
        >
          <RotateCcw size={20} />
          Play Again
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

// ─── Previous Offers Modal ──────────────────────────────────────────────────

function PreviousOffersModal({
  offers,
  currentOffer,
  onClose,
}: {
  offers: Array<{ round: number; offer: number }>;
  currentOffer: number;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-51 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
    >
      <motion.div
        variants={popVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-strong rounded-2xl p-6 max-w-sm w-full shadow-2xl shadow-gold/10"
      >
        <h2 className="text-xl font-bold text-slate-200 mb-4">Banker Offers History</h2>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {offers.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-4">No offers yet</p>
          ) : (
            offers.map((offer, idx) => (
              <motion.div
                key={idx}
                variants={popVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: idx * 0.05 }}
                className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-slate-700/50 hover:border-gold/30 transition-all"
              >
                <span className="text-sm font-semibold text-slate-300">Round {offer.round}</span>
                <span className="text-lg font-black text-gold">{formatMoney(offer.offer)}</span>
              </motion.div>
            ))
          )}

          {currentOffer > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center justify-between p-3 bg-gold/20 rounded-lg border-2 border-gold/50 mt-3"
            >
              <span className="text-sm font-semibold text-gold">Current Offer</span>
              <span className="text-lg font-black text-gold-light">{formatMoney(currentOffer)}</span>
            </motion.div>
          )}
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className="w-full mt-4 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold py-2 rounded-lg transition-all"
        >
          Close
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

// ─── Avatar Preview ─────────────────────────────────────────────────────────

function AvatarPreview({
  avatar,
  size = "medium",
}: {
  avatar: PlayerAvatar;
  size?: "small" | "medium" | "large";
}) {
  const sizeMap = {
    small: "w-12 h-12",
    medium: "w-20 h-20",
    large: "w-32 h-32",
  };

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`${sizeMap[size]} rounded-full bg-slate-800/30 border border-gold/30 p-1 flex items-center justify-center`}
      dangerouslySetInnerHTML={{ __html: avatar.svgCode }}
    />
  );
}

// ─── Avatar Builder (Simple) ────────────────────────────────────────────────

function AvatarBuilder({
  onComplete,
}: {
  onComplete: (avatar: PlayerAvatar) => void;
}) {
  const shapes: AvatarShape[] = ["circle", "square", "triangle", "star", "heart"];
  const [shape, setShape] = useState<AvatarShape>("circle");
  const [mainColor, setMainColor] = useState("#6366F1");
  const [accentColor, setAccentColor] = useState("#FBBF24");
  const [features, setFeatures] = useState({ eyes: true, mouth: true, accessories: false });

  const currentAvatar = generateSimpleAvatar({
    shape,
    mainColor,
    accentColor,
    features,
  });

  const handleComplete = () => {
    savePlayerAvatar(currentAvatar);
    onComplete(currentAvatar);
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="text-sm font-bold text-slate-300 mb-3 block">Shape</label>
        <div className="grid grid-cols-5 gap-2">
          {shapes.map((s) => (
            <motion.button
              key={s}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShape(s)}
              className={`py-2 px-3 rounded-lg font-semibold text-xs transition-all ${
                shape === s
                  ? "bg-gold text-slate-900 shadow-lg shadow-gold/50"
                  : "bg-slate-700 hover:bg-slate-600 text-slate-200"
              }`}
            >
              {s}
            </motion.button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-bold text-slate-300 mb-3 block">Main Color</label>
        <input
          type="color"
          value={mainColor}
          onChange={(e) => setMainColor(e.target.value)}
          className="w-full h-12 rounded-lg cursor-pointer border border-slate-600"
        />
      </div>

      <div>
        <label className="text-sm font-bold text-slate-300 mb-3 block">Accent Color</label>
        <input
          type="color"
          value={accentColor}
          onChange={(e) => setAccentColor(e.target.value)}
          className="w-full h-12 rounded-lg cursor-pointer border border-slate-600"
        />
      </div>

      <div>
        <label className="text-sm font-bold text-slate-300 mb-3 block">Features</label>
        <div className="space-y-2">
          {(["eyes", "mouth", "accessories"] as const).map((feature) => (
            <label key={feature} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={features[feature]}
                onChange={(e) => setFeatures({ ...features, [feature]: e.target.checked })}
                className="w-4 h-4 cursor-pointer"
              />
              <span className="text-sm text-slate-300 capitalize">{feature}</span>
            </label>
          ))}
        </div>
      </div>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleComplete}
        className="w-full bg-gold hover:bg-gold-light text-slate-900 font-bold py-3 rounded-xl transition-all text-lg shadow-lg shadow-gold/30"
      >
        Use This Avatar
      </motion.button>
    </div>
  );
}

// ─── Avatar Advanced (Custom SVG) ───────────────────────────────────────────

function AvatarAdvanced({
  onComplete,
}: {
  onComplete: (avatar: PlayerAvatar) => void;
}) {
  const [svgCode, setSvgCode] = useState("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<PlayerAvatar | null>(null);

  const handleValidate = () => {
    if (!svgCode.trim()) {
      setError("Please paste SVG code");
      return;
    }

    if (!isValidSVG(svgCode)) {
      setError("Invalid SVG code. Please check and try again.");
      return;
    }

    const avatar: PlayerAvatar = {
      id: generateId(),
      type: "advanced",
      svgCode,
      createdAt: new Date().toISOString(),
    };

    setError("");
    setPreview(avatar);
  };

  const handleComplete = () => {
    if (preview) {
      savePlayerAvatar(preview);
      onComplete(preview);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-bold text-slate-300 mb-2 block">Paste SVG Code</label>
        <textarea
          value={svgCode}
          onChange={(e) => setSvgCode(e.target.value)}
          placeholder='<svg viewBox="0 0 200 200">...</svg>'
          className="w-full h-40 bg-slate-800 border border-slate-600 rounded-lg p-3 text-slate-300 placeholder-slate-600 focus:border-gold/50 focus:ring-1 focus:ring-gold/30 font-mono text-sm"
        />
      </div>

      {error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-red-500 text-sm font-semibold"
        >
          ⚠️ {error}
        </motion.p>
      )}

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleValidate}
        className="w-full bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold py-2 rounded-lg transition-all"
      >
        Preview
      </motion.button>

      {preview && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <p className="text-sm text-slate-400 mb-3">Preview:</p>
          <AvatarPreview avatar={preview} size="medium" />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleComplete}
            className="w-full mt-4 bg-gold hover:bg-gold-light text-slate-900 font-bold py-2 rounded-lg transition-all"
          >
            Use This Avatar
          </motion.button>
        </motion.div>
      )}
    </div>
  );
}

// ─── Avatar Creator Modal ───────────────────────────────────────────────────

function AvatarCreatorModal({
  onComplete,
  onSkip,
}: {
  onComplete: (avatar: PlayerAvatar) => void;
  onSkip: () => void;
}) {
  const [mode, setMode] = useState<"simple" | "advanced">("simple");
  const [preview, setPreview] = useState<PlayerAvatar | null>(null);

  const handleComplete = (avatar: PlayerAvatar) => {
    setPreview(avatar);
    setTimeout(() => {
      onComplete(avatar);
    }, 300);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
    >
      <motion.div
        variants={modalBowingVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={{ type: "spring", stiffness: 120, damping: 20, mass: 1.4 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-strong rounded-2xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl shadow-gold/10 max-h-[90vh] overflow-y-auto"
      >
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
          className="text-5xl mb-4"
        >
          🎨
        </motion.div>

        <h2 className="text-2xl font-black text-slate-200 mb-2">Create Your Avatar</h2>
        <p className="text-slate-400 text-sm mb-6">Design your character for the leaderboard</p>

        {preview ? (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center"
          >
            <p className="text-slate-400 text-sm mb-4">Avatar Created!</p>
            <AvatarPreview avatar={preview} size="large" />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onComplete(preview)}
              className="w-full mt-6 bg-gold hover:bg-gold-light text-slate-900 font-bold py-3 rounded-xl transition-all text-lg"
            >
              Let's Play!
            </motion.button>
          </motion.div>
        ) : (
          <>
            <div className="flex gap-2 mb-6">
              {(["simple", "advanced"] as const).map((m) => (
                <motion.button
                  key={m}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setMode(m)}
                  className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${
                    mode === m
                      ? "bg-gold text-slate-900 shadow-lg shadow-gold/50"
                      : "bg-slate-700 hover:bg-slate-600 text-slate-200"
                  }`}
                >
                  {m === "simple" ? "Build" : "Custom"}
                </motion.button>
              ))}
            </div>

            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {mode === "simple" ? (
                <AvatarBuilder onComplete={handleComplete} />
              ) : (
                <AvatarAdvanced onComplete={handleComplete} />
              )}
            </motion.div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onSkip}
              className="w-full mt-4 bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold py-2 rounded-lg transition-all text-sm"
            >
              Skip for Now
            </motion.button>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Case Reveal Modal ──────────────────────────────────────────────────────

function CaseRevealModal({
  caseId,
  value,
  onDismiss,
}: {
  caseId: number;
  value: number;
  onDismiss: () => void;
}) {
  const high = isHighValue(value);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onDismiss}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
    >
      <motion.div
        variants={modalBowingVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={{ type: "spring", stiffness: 120, damping: 20, mass: 1.4 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-strong rounded-2xl p-8 sm:p-10 max-w-sm w-full text-center shadow-2xl shadow-gold/10"
      >
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 150, damping: 15, delay: 0.1 }}
          className={`text-6xl sm:text-7xl font-black mb-4 ${high ? "text-gold" : "text-blue-400"}`}
        >
          <Briefcase size={80} className={high ? "text-gold mx-auto" : "text-blue-400 mx-auto"} />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-sm text-slate-300 mb-2"
        >
          Case #{caseId} Contains
        </motion.p>

        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.3 }}
          className={`text-5xl sm:text-6xl font-black mb-6 ${high ? "text-gold" : "text-blue-400"}`}
        >
          {formatMoney(value)}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-xs text-slate-500 mb-4"
        >
          Click anywhere to continue
        </motion.p>

        {high && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.4 }}
            className="inline-block bg-red-600/20 text-red-500 px-3 py-1 rounded-lg text-xs font-bold border border-red-500/30"
          >
            ⚡ High Value!
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

function LeaderboardPanel({
  onClose,
}: {
  onClose: () => void;
}) {
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel>("1M");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    const allEntries = getLeaderboard();
    setEntries(allEntries.filter((e) => e.difficulty === selectedDifficulty));
  }, [selectedDifficulty]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-51 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
    >
      <motion.div
        variants={popVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-strong rounded-2xl p-6 max-w-md w-full shadow-2xl shadow-gold/10 max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
            <Award size={20} className="text-gold" /> Leaderboard
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {DIFFICULTY_OPTIONS.map((opt) => (
            <motion.button
              key={opt.value}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedDifficulty(opt.value)}
              className={`py-2 px-3 rounded-lg font-semibold text-xs transition-all ${
                selectedDifficulty === opt.value
                  ? "bg-gold text-slate-900 shadow-lg shadow-gold/50"
                  : "bg-slate-700 hover:bg-slate-600 text-slate-200"
              }`}
            >
              {opt.label}
            </motion.button>
          ))}
        </div>

        {entries.length === 0 ? (
          <p className="text-slate-500 text-center py-8 text-sm">No scores yet. Play a game!</p>
        ) : (
          <div className="overflow-y-auto flex-1 -mx-2 px-2">
            {entries.slice(0, 20).map((entry, i) => (
              <motion.div
                key={entry.id}
                variants={popVariants}
                initial="hidden"
                animate="visible"
                transition={{ type: "spring", stiffness: 300, damping: 20, delay: i * 0.05 }}
                className={`flex items-center gap-3 py-2 px-3 rounded-lg mb-1
                  ${i === 0 ? "bg-gold/10 border border-gold/20" : ""}
                  ${i === 1 ? "bg-slate-400/5 border border-slate-400/10" : ""}
                  ${i === 2 ? "bg-gold-dark/10 border border-gold-dark/10" : ""}
                `}
              >
                <span className={`text-sm font-black w-6 text-center ${
                  i === 0 ? "text-gold" : i === 1 ? "text-slate-300" : i === 2 ? "text-gold-light" : "text-slate-500"
                }`}>
                  {i + 1}
                </span>

                {entry.avatarSvg && (
                  <div className="w-10 h-10 rounded-full bg-slate-800/30 border border-gold/20 p-0.5 flex items-center justify-center flex-shrink-0"
                    dangerouslySetInnerHTML={{ __html: entry.avatarSvg }}
                  />
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-200 truncate">{entry.name}</p>
                  <p className="text-xs text-slate-500">
                    {entry.dealTaken ? `Deal R${entry.finalRound}` : "Went all the way"}{" "}
                    &middot; {new Date(entry.timestamp).toLocaleDateString()}
                  </p>
                </div>

                <span className={`text-sm font-bold whitespace-nowrap ${
                  entry.amount >= 100000 ? "text-gold" : "text-slate-300"
                }`}>
                  {formatMoney(entry.amount)}
                </span>
              </motion.div>
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
  onShowLeaderboard,
}: {
  onSelect: (difficulty: DifficultyLevel) => void;
  onShowLeaderboard: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
    >
      <motion.div
        variants={modalBowingVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={{ type: "spring", stiffness: 120, damping: 20, mass: 1.4 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-strong rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl shadow-gold/10"
      >
        <h2 className="text-2xl font-black text-slate-200 mb-2">Choose Difficulty</h2>
        <p className="text-slate-400 text-sm mb-6">Select your maximum prize pool</p>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {DIFFICULTY_OPTIONS.map((option, idx) => (
            <motion.button
              key={option.value}
              variants={popVariants}
              initial="hidden"
              animate="visible"
              transition={{ type: "spring", stiffness: 300, damping: 20, delay: idx * 0.1 }}
              whileHover={{ scale: 1.08, y: -2 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => onSelect(option.value)}
              className="glass rounded-xl p-4 hover:bg-gold/20 transition-all border border-slate-600/30 hover:border-gold/50"
            >
              <div className="text-lg font-bold text-gold">{option.label}</div>
              <div className="text-xs text-slate-400 mt-1">{option.value}</div>
            </motion.button>
          ))}
        </div>
        <motion.button
          whileHover={{ scale: 1.05, y: -1 }}
          whileTap={{ scale: 0.95 }}
          onClick={onShowLeaderboard}
          className="w-full bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold py-2.5 px-4 rounded-xl
            transition-all text-sm flex items-center justify-center gap-2"
        >
          <Trophy size={16} /> View Leaderboards
        </motion.button>
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
  const [revealedCaseId, setRevealedCaseId] = useState<number | null>(null);
  const [revealedCaseValue, setRevealedCaseValue] = useState<number | null>(null);
  const [playerAvatar, setPlayerAvatar] = useState<PlayerAvatar | null>(null);
  const [showAvatarCreator, setShowAvatarCreator] = useState(false);
  const [bankerOffers, setBankerOffers] = useState<Array<{ round: number; offer: number }>>([]);
  const [showPreviousOffers, setShowPreviousOffers] = useState(false);

  const initGame = useCallback(() => {
    const valuesToUse = difficulty ? getPrizeValues(difficulty) : PRIZE_VALUES;
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
    setBankerOffers([]);
  }, [difficulty]);

  useEffect(() => {
    setCareerWinnings(getCareerWinnings());
    setGamesPlayed(getGamesPlayed());

    const savedAvatar = getPlayerAvatar();
    if (savedAvatar) {
      setPlayerAvatar(savedAvatar);
    } else {
      setShowAvatarCreator(true);
    }
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
    setRevealedCaseId(id);
    setRevealedCaseValue(caseToOpen.value);

    if (soundEnabled) playCaseOpenSound(isHighValue(caseToOpen.value));
    if (isHighValue(caseToOpen.value)) triggerHaptic([50, 30, 80]);

    const newOpenedCount = casesOpenedThisRound + 1;
    setCasesOpenedThisRound(newOpenedCount);
  };

  const handleRevealDismiss = () => {
    setRevealedCaseId(null);
    setRevealedCaseValue(null);

    const updatedCases = cases.map((c) =>
      revealedCaseId === c.id ? { ...c, isOpened: true } : c
    );
    const newOpenedCount = casesOpenedThisRound;

    if (newOpenedCount >= casesToOpenThisRound) {
      const stillRemaining = updatedCases.filter((c) => !c.isOpened && c.id !== playerCaseId);
      if (stillRemaining.length === 1) {
        setPhase("final_choice");
      } else {
        const avg = stillRemaining.reduce((sum, c) => sum + c.value, 0) / stillRemaining.length;
        const pctIndex = Math.min(round, BANKER_PERCENTAGES.length - 1);
        const offer = Math.round(avg * BANKER_PERCENTAGES[pctIndex]);
        setBankerOffer(offer);
        setBankerOffers((prev) => [...prev, { round: round + 1, offer }]);
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
      avatarSvg: playerAvatar?.svgCode,
      difficulty: difficulty || "1M",
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
            <DifficultySelector
              onSelect={setDifficulty}
              onShowLeaderboard={() => setShowLeaderboard(true)}
            />
          )}
          {showLeaderboard && (
            <LeaderboardPanel onClose={() => setShowLeaderboard(false)} />
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
        <div className="flex justify-center items-center gap-2 sm:gap-3 mt-2 text-[11px] sm:text-xs text-slate-400 flex-wrap">
          <span className="whitespace-nowrap">
            Career: <span className="text-gold font-bold text-[10px] sm:text-xs">{formatMoney(careerWinnings)}</span>
          </span>
          <span className="text-slate-600">|</span>
          <span className="whitespace-nowrap">Games: {gamesPlayed}</span>
          <span className="text-slate-600">|</span>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowLeaderboard(true)}
            className="text-gold/60 hover:text-gold transition-colors flex items-center gap-1 px-2 py-1 rounded hover:bg-gold/10"
          >
            <Award size={14} /> Board
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSoundEnabled((s) => !s)}
            className="text-slate-600 hover:text-slate-300 transition-colors text-[11px] sm:text-xs px-2 py-1 rounded hover:bg-slate-700/30"
          >
            {soundEnabled ? "🔊" : "🔇"}
          </motion.button>
        </div>
      </header>

      {/* Status Bar */}
      <motion.div
        key={statusMessage}
        variants={popVariants}
        initial="hidden"
        animate="visible"
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="glass rounded-xl px-4 py-2 mb-3 text-center"
      >
        <p className="text-sm sm:text-base font-semibold text-slate-200">{statusMessage}</p>
        {phase === "opening_cases" && playerCaseId && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-xs text-slate-400 mt-0.5"
          >
            Your case: <span className="text-gold font-bold">#{playerCaseId}</span>
          </motion.p>
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

      {/* Avatar Edit Button */}
      {playerAvatar && difficulty === null && !showAvatarCreator && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 z-40"
        >
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAvatarCreator(true)}
            title="Edit your avatar"
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gold/20 hover:bg-gold/30 border border-gold/50 flex items-center justify-center transition-all text-gold text-lg sm:text-xl"
          >
            ✏️
          </motion.button>
        </motion.div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showAvatarCreator && (
          <AvatarCreatorModal
            onComplete={(avatar) => {
              setPlayerAvatar(avatar);
              setShowAvatarCreator(false);
            }}
            onSkip={() => {
              setPlayerAvatar(generateDefaultAvatar());
              setShowAvatarCreator(false);
            }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {difficulty === null && !showAvatarCreator && (
          <DifficultySelector
            onSelect={setDifficulty}
            onShowLeaderboard={() => setShowLeaderboard(true)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {revealedCaseId !== null && revealedCaseValue !== null && (
          <CaseRevealModal
            caseId={revealedCaseId}
            value={revealedCaseValue}
            onDismiss={handleRevealDismiss}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {phase === "banker_offer" && (
          <BankerModal
            offer={bankerOffer}
            round={round + 1}
            onDeal={handleDeal}
            onNoDeal={handleNoDeal}
            onShowOffers={() => setShowPreviousOffers(true)}
            hasOffers={bankerOffers.length > 0}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showPreviousOffers && phase === "banker_offer" && (
          <PreviousOffersModal
            offers={bankerOffers}
            currentOffer={bankerOffer}
            onClose={() => setShowPreviousOffers(false)}
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
            avatar={playerAvatar}
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
