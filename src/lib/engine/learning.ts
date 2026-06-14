// P3 · LearningLoop — record recovery OUTCOMES per avenue and expose a win-rate.
// PURE over an injectable store: the default store is in-memory (no I/O), so the
// loop is deterministic and testable; a Supabase-backed store can implement the
// same interface later without touching the engine. No clock, no randomness.

import { type AvenueKey } from "@/lib/compliance/avenues";

export interface AvenueStat {
  readonly wins: number;
  readonly losses: number;
}

const ZERO: AvenueStat = Object.freeze({ wins: 0, losses: 0 });

/** Pluggable persistence for win/loss tallies. */
export interface WinRateStore {
  get(avenue: AvenueKey): AvenueStat;
  record(avenue: AvenueKey, won: boolean): void;
  entries(): ReadonlyArray<readonly [AvenueKey, AvenueStat]>;
}

/** Deterministic in-memory store (default). */
export class InMemoryWinRateStore implements WinRateStore {
  private readonly map = new Map<AvenueKey, AvenueStat>();

  get(avenue: AvenueKey): AvenueStat {
    return this.map.get(avenue) ?? ZERO;
  }

  record(avenue: AvenueKey, won: boolean): void {
    const cur = this.get(avenue);
    this.map.set(avenue, {
      wins: cur.wins + (won ? 1 : 0),
      losses: cur.losses + (won ? 0 : 1),
    });
  }

  entries(): ReadonlyArray<readonly [AvenueKey, AvenueStat]> {
    return [...this.map.entries()];
  }
}

export interface OutcomeReport {
  readonly avenue: AvenueKey;
  readonly stat: AvenueStat;
  readonly winRate: number;
}

/** Records outcomes and reports win-rates. Holds no state beyond its store. */
export class LearningLoop {
  constructor(private readonly store: WinRateStore = new InMemoryWinRateStore()) {}

  /** Record one settled outcome for an avenue. Returns the updated report. */
  recordOutcome(avenue: AvenueKey, won: boolean): OutcomeReport {
    this.store.record(avenue, won);
    return this.report(avenue);
  }

  /** Win-rate in [0,1]; 0 when there is no data yet (no division by zero). */
  winRate(avenue: AvenueKey): number {
    const { wins, losses } = this.store.get(avenue);
    const total = wins + losses;
    return total === 0 ? 0 : wins / total;
  }

  report(avenue: AvenueKey): OutcomeReport {
    return { avenue, stat: this.store.get(avenue), winRate: this.winRate(avenue) };
  }

  /** All avenues with recorded outcomes, best win-rate first. */
  rankings(): OutcomeReport[] {
    return this.store
      .entries()
      .map(([avenue, stat]) => ({ avenue, stat, winRate: stat.wins + stat.losses === 0 ? 0 : stat.wins / (stat.wins + stat.losses) }))
      .sort((a, b) => b.winRate - a.winRate);
  }
}
