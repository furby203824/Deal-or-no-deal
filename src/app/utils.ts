// ─── Constants ───────────────────────────────────────────────────────────────

export type DifficultyLevel = "1M" | "3M" | "5M" | "10M";

export const DIFFICULTY_OPTIONS: { label: string; value: DifficultyLevel; max: number }[] = [
  { label: "Insane", value: "1M", max: 1_000_000 },
  { label: "Hard", value: "3M", max: 3_000_000 },
  { label: "Medium", value: "5M", max: 5_000_000 },
  { label: "Easy", value: "10M", max: 10_000_000 },
];

export const BASE_PRIZE_VALUES = [
  0.01, 1, 5, 10, 25, 50, 75, 100, 200, 300, 400, 500, 750, 1_000, 5_000,
  10_000, 25_000, 50_000, 75_000, 100_000, 200_000, 300_000, 400_000, 500_000,
  750_000, 1_000_000,
];

export function getPrizeValues(difficulty: DifficultyLevel): number[] {
  const maxPrize = DIFFICULTY_OPTIONS.find((d) => d.value === difficulty)?.max || 1_000_000;
  return BASE_PRIZE_VALUES.map((val) => val * (maxPrize / 1_000_000));
}

export const PRIZE_VALUES = BASE_PRIZE_VALUES;

export const CASES_PER_ROUND = [6, 5, 4, 3, 2, 1, 1, 1, 1, 1];

export const BANKER_PERCENTAGES = [
  0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.92, 0.97,
];

// ─── Avatar Types ─────────────────────────────────────────────────────────

export type AvatarShape = "circle" | "square" | "triangle" | "star" | "heart";
export type AvatarType = "simple" | "advanced" | "default";

export interface AvatarMetadata {
  shape: AvatarShape;
  mainColor: string;
  accentColor: string;
  features: {
    eyes: boolean;
    mouth: boolean;
    accessories: boolean;
  };
}

export interface PlayerAvatar {
  id: string;
  type: AvatarType;
  svgCode: string;
  metadata?: AvatarMetadata;
  createdAt: string;
}

export type GamePhase =
  | "pick_own_case"
  | "opening_cases"
  | "banker_offer"
  | "final_choice"
  | "enter_name"
  | "game_over";

export interface CaseData {
  id: number;
  value: number;
  isOpened: boolean;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  amount: number;
  timestamp: string;
  dealTaken: boolean;
  finalRound: number;
  synced: boolean;
  avatarSvg?: string;
  difficulty: DifficultyLevel;
}

// ─── Utility Functions ───────────────────────────────────────────────────────

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function formatMoney(value: number): string {
  if (value < 1) return "$0.01";
  if (value >= 1_000_000) return "$1,000,000";
  return "$" + value.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export function isHighValue(value: number): boolean {
  return value >= 10_000;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ─── LocalStorage Helpers ────────────────────────────────────────────────────

export function getCareerWinnings(): number {
  if (typeof window === "undefined") return 0;
  const stored = localStorage.getItem("dond_career_winnings");
  return stored ? parseFloat(stored) : 0;
}

export function saveCareerWinnings(total: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("dond_career_winnings", total.toString());
}

export function getGamesPlayed(): number {
  if (typeof window === "undefined") return 0;
  const stored = localStorage.getItem("dond_games_played");
  return stored ? parseInt(stored, 10) : 0;
}

export function saveGamesPlayed(count: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("dond_games_played", count.toString());
}

export function getLeaderboard(difficulty?: DifficultyLevel): LeaderboardEntry[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem("dond_leaderboard");
  const entries = stored ? JSON.parse(stored) : [];

  if (difficulty) {
    return entries.filter((e: LeaderboardEntry) => e.difficulty === difficulty);
  }
  return entries;
}

export function saveLeaderboardEntry(entry: LeaderboardEntry): void {
  if (typeof window === "undefined") return;
  const stored = localStorage.getItem("dond_leaderboard");
  const existing = stored ? JSON.parse(stored) : [];
  existing.push(entry);
  existing.sort((a: LeaderboardEntry, b: LeaderboardEntry) => {
    if (a.difficulty !== b.difficulty) {
      return a.difficulty.localeCompare(b.difficulty);
    }
    return b.amount - a.amount;
  });
  localStorage.setItem("dond_leaderboard", JSON.stringify(existing.slice(0, 200)));
}

export function clearLeaderboard(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("dond_leaderboard");
}

// ─── Sound Effects (Web Audio API, no external files) ────────────────────────

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as unknown as Record<string, unknown>).webkitAudioContext as typeof AudioContext)();
  }
  return audioCtx;
}

export function playCaseOpenSound(isHigh: boolean): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  if (isHigh) {
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } else {
    osc.type = "sine";
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(900, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  }
}

export function playPhoneRing(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const playTone = (startTime: number) => {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    osc1.type = "sine";
    osc1.frequency.value = 440;
    osc2.type = "sine";
    osc2.frequency.value = 480;
    gain.gain.setValueAtTime(0.08, startTime);
    gain.gain.linearRampToValueAtTime(0, startTime + 0.4);
    osc1.start(startTime);
    osc1.stop(startTime + 0.4);
    osc2.start(startTime);
    osc2.stop(startTime + 0.4);
  };
  playTone(ctx.currentTime);
  playTone(ctx.currentTime + 0.5);
}

export function playDealSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(523, ctx.currentTime);
  osc.frequency.setValueAtTime(659, ctx.currentTime + 0.15);
  osc.frequency.setValueAtTime(784, ctx.currentTime + 0.3);
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.5);
}

// ─── Avatar Utilities ───────────────────────────────────────────────────────

export function generateDefaultAvatar(): PlayerAvatar {
  const svgCode = `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    <circle cx="100" cy="100" r="100" fill="#4F46E5"/>
    <circle cx="100" cy="100" r="80" fill="#6366F1"/>
    <circle cx="75" cy="80" r="8" fill="white"/>
    <circle cx="125" cy="80" r="8" fill="white"/>
    <path d="M 80 120 Q 100 130 120 120" stroke="white" stroke-width="3" fill="none" stroke-linecap="round"/>
  </svg>`;

  return {
    id: generateId(),
    type: "default",
    svgCode,
    createdAt: new Date().toISOString(),
  };
}

export function generateSimpleAvatar(metadata: AvatarMetadata): PlayerAvatar {
  const shapes: Record<AvatarShape, string> = {
    circle: `<circle cx="100" cy="100" r="80" fill="${metadata.mainColor}"/>`,
    square: `<rect x="20" y="20" width="160" height="160" fill="${metadata.mainColor}"/>`,
    triangle: `<polygon points="100,20 180,180 20,180" fill="${metadata.mainColor}"/>`,
    star: `<polygon points="100,10 135,90 220,90 160,145 190,225 100,170 10,225 40,145 -20,90 65,90" fill="${metadata.mainColor}"/>`,
    heart: `<path d="M100,170 C50,130 20,100 20,70 C20,45 35,30 55,30 C75,30 100,50 100,50 C100,50 125,30 145,30 C165,30 180,45 180,70 C180,100 150,130 100,170 Z" fill="${metadata.mainColor}"/>`,
  };

  let svgContent = shapes[metadata.shape];

  if (metadata.features.eyes) {
    svgContent += `
    <circle cx="70" cy="80" r="6" fill="${metadata.accentColor}"/>
    <circle cx="130" cy="80" r="6" fill="${metadata.accentColor}"/>`;
  }

  if (metadata.features.mouth) {
    svgContent += `
    <path d="M 80 120 Q 100 135 120 120" stroke="${metadata.accentColor}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  }

  if (metadata.features.accessories) {
    svgContent += `
    <circle cx="40" cy="50" r="8" fill="${metadata.accentColor}"/>
    <circle cx="160" cy="50" r="8" fill="${metadata.accentColor}"/>`;
  }

  const svgCode = `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    ${svgContent}
  </svg>`;

  return {
    id: generateId(),
    type: "simple",
    svgCode,
    metadata,
    createdAt: new Date().toISOString(),
  };
}

export function isValidSVG(code: string): boolean {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(code, "image/svg+xml");
    return !doc.querySelector("parsererror");
  } catch {
    return false;
  }
}

export function getPlayerAvatar(): PlayerAvatar | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem("dond_player_avatar");
  return stored ? JSON.parse(stored) : null;
}

export function savePlayerAvatar(avatar: PlayerAvatar): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("dond_player_avatar", JSON.stringify(avatar));
}

export function deletePlayerAvatar(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("dond_player_avatar");
}

// ─── Haptic Feedback ─────────────────────────────────────────────────────────

export function triggerHaptic(pattern: number | number[]): void {
  if (typeof window === "undefined") return;
  if ("vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}
