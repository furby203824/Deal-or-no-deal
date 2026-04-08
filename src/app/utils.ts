// ─── Constants ───────────────────────────────────────────────────────────────

export const PRIZE_VALUES = [
  0.01, 1, 5, 10, 25, 50, 75, 100, 200, 300, 400, 500, 750, 1_000, 5_000,
  10_000, 25_000, 50_000, 75_000, 100_000, 200_000, 300_000, 400_000, 500_000,
  750_000, 1_000_000,
];

export const CASES_PER_ROUND = [6, 5, 4, 3, 2, 1, 1, 1, 1, 1];

export const BANKER_PERCENTAGES = [
  0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.92, 0.97,
];

// ─── Types ───────────────────────────────────────────────────────────────────

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

export function getLeaderboard(): LeaderboardEntry[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem("dond_leaderboard");
  return stored ? JSON.parse(stored) : [];
}

export function saveLeaderboardEntry(entry: LeaderboardEntry): void {
  if (typeof window === "undefined") return;
  const existing = getLeaderboard();
  existing.push(entry);
  existing.sort((a, b) => b.amount - a.amount);
  localStorage.setItem("dond_leaderboard", JSON.stringify(existing.slice(0, 50)));
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

// ─── Haptic Feedback ─────────────────────────────────────────────────────────

export function triggerHaptic(pattern: number | number[]): void {
  if (typeof window === "undefined") return;
  if ("vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}
