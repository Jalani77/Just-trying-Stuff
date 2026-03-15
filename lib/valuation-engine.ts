// ============================================================
// ALPHA-ATHLETE VALUATION MODEL (A-AVM)
// A quantitative framework mapping human performance to equity
// ============================================================

export type EventType =
  | 'MADE_3PT' | 'MADE_2PT' | 'MADE_FT'
  | 'TURNOVER' | 'STEAL' | 'BLOCK'
  | 'REBOUND_OFF' | 'REBOUND_DEF'
  | 'ASSIST' | 'FOUL' | 'DUNK';

export interface GameStats {
  points: number;
  assists: number;
  rebounds: number;
  turnovers: number;
  steals: number;
  blocks: number;
  minutesPlayed: number;
  trueShooting: number;    // 0–1
  usageRate: number;       // 0–1
  clutchMoments: number;
  totalLeveragePlays: number;
}

export interface PriceCandle {
  time: number;            // Unix timestamp
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface ValuationResult {
  price: number;
  delta: number;
  deltaPercent: number;
  efficiency: number;
  sentiment: number;
  wasCircuitBroken: boolean;
  reason: string;
}

// Event multipliers — the "tick" impact of a single performance event
const EVENT_MULTIPLIERS: Record<EventType, number> = {
  DUNK:        1.12,   // High-visual impact, crowd/media sentiment spike
  MADE_3PT:    1.05,
  BLOCK:       1.08,
  STEAL:       1.07,
  ASSIST:      1.03,
  REBOUND_OFF: 1.025,
  REBOUND_DEF: 1.015,
  MADE_2PT:    1.02,
  MADE_FT:     1.01,
  FOUL:        0.97,
  TURNOVER:    0.90,
};

const EVENT_REASONS: Record<EventType, string> = {
  DUNK:        'Viral-impact dunk triggers media sentiment multiplier',
  MADE_3PT:    'Three-pointer increases True Shooting efficiency',
  BLOCK:       'Defensive anchor event reduces opponent EV',
  STEAL:       'Possession recovery — negative opponent alpha captured',
  ASSIST:      'High-IQ play contributes to court-vision premium',
  REBOUND_OFF: 'Second-chance possession drives offensive EV',
  REBOUND_DEF: 'Defensive glass secured — transition risk reduced',
  MADE_2PT:    'Mid-range efficiency maintains base valuation',
  MADE_FT:     'Free-throw execution preserves expected value',
  FOUL:        'Foul risk increases liability discount on valuation',
  TURNOVER:    'Possession loss triggers negative sentiment cascade',
};

export class ValuationEngine {
  /**
   * 1.1 PERFORMANCE-TO-EQUITY FORMULA
   * P_t = (E_t * w1) + (T * w2) + (S_t * w3)
   */
  static calculateSharePrice(
    stats: GameStats,
    historicalBaseline: number,  // T — moving average of last 10 games
    weights = { w1: 0.45, w2: 0.35, w3: 0.20 }
  ): number {
    const E = this.calculateEfficiency(stats);
    const T = historicalBaseline;
    const S = this.calculateSentiment(stats);

    return (E * weights.w1) + (T * weights.w2) + (S * weights.w3);
  }

  /**
   * E_t = (Points + Assists + Rebounds - Turnovers) / Minutes Played
   * Scaled to a $0–$300 range for price representation
   */
  static calculateEfficiency(stats: GameStats): number {
    if (stats.minutesPlayed === 0) return 100;
    const raw = (stats.points + stats.assists + stats.rebounds - stats.turnovers * 2) / stats.minutesPlayed;
    return Math.max(10, Math.min(300, raw * 35 + 85));  // Scale to price range
  }

  /**
   * S_t = Sentiment multiplier from clutch moments (high-leverage plays)
   * Uses a sigmoid to prevent extreme values
   */
  static calculateSentiment(stats: GameStats): number {
    const clutchRatio = stats.totalLeveragePlays > 0
      ? stats.clutchMoments / stats.totalLeveragePlays
      : 0.5;
    // Sigmoid: maps 0–1 to 80–160 price range
    const sigmoid = 1 / (1 + Math.exp(-10 * (clutchRatio - 0.5)));
    return 80 + sigmoid * 80;
  }

  /**
   * 1.2 EVENT PROCESSOR — processes a single game event
   * Applies leverage factor for clutch-time plays (final 2 min = 2x)
   */
  static processEvent(
    basePrice: number,
    eventType: EventType,
    gameClock: number  // Seconds remaining
  ): { newPrice: number; reason: string; multiplierApplied: number } {
    const baseMultiplier = EVENT_MULTIPLIERS[eventType] ?? 1.0;
    
    // Clutch-time leverage: final 120 seconds = 2x impact
    const leverageFactor = gameClock <= 120 ? 2.0 : gameClock <= 300 ? 1.5 : 1.0;
    
    // Combine: distance from 1.0 is amplified by leverage
    const delta = baseMultiplier - 1.0;
    const leveragedMultiplier = 1.0 + (delta * leverageFactor);
    
    const newPrice = basePrice * leveragedMultiplier;
    const reason = `${EVENT_REASONS[eventType]}${leverageFactor > 1 ? ` [CLUTCH x${leverageFactor}]` : ''}`;

    return { newPrice, reason, multiplierApplied: leveragedMultiplier };
  }

  /**
   * Circuit Breaker — prevents flash crashes / irrational exuberance
   * Max swing: ±15% from last close (mirrors NYSE Rule 48)
   */
  static applyCircuitBreaker(
    proposedPrice: number,
    lastClose: number
  ): { price: number; wasTripped: boolean } {
    const change = (proposedPrice - lastClose) / lastClose;
    const MAX_SWING = 0.15;

    if (Math.abs(change) > MAX_SWING) {
      return {
        price: lastClose * (1 + MAX_SWING * Math.sign(change)),
        wasTripped: true,
      };
    }
    return { price: proposedPrice, wasTripped: false };
  }

  /**
   * Generates a OHLC candle from a sequence of intra-second prices
   */
  static buildCandle(timestamp: number, prices: number[]): PriceCandle {
    if (prices.length === 0) return { time: timestamp, open: 100, high: 100, low: 100, close: 100 };
    return {
      time: timestamp,
      open: prices[0],
      high: Math.max(...prices),
      low: Math.min(...prices),
      close: prices[prices.length - 1],
    };
  }

  /**
   * Portfolio impact explanation — human-readable BI summary
   */
  static generateInsight(
    oldPrice: number,
    newPrice: number,
    eventType: EventType,
    stats: GameStats
  ): string {
    const pctChange = ((newPrice - oldPrice) / oldPrice * 100).toFixed(2);
    const direction = newPrice > oldPrice ? 'increased' : 'decreased';
    const tsPct = (stats.trueShooting * 100).toFixed(1);
    const reason = EVENT_REASONS[eventType];
    return `Price ${direction} ${Math.abs(parseFloat(pctChange))}% — ${reason}. ` +
           `Current TS%: ${tsPct}. Usage rate: ${(stats.usageRate * 100).toFixed(0)}%.`;
  }
}
