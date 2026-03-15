import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { EventType, GameStats, PriceCandle } from '@/lib/valuation-engine';
import type { GameEvent } from '@/lib/game-engine';
import { ValuationEngine } from '@/lib/valuation-engine';
import { ATHLETES } from '@/lib/game-engine';

export interface AthleteData {
  id: string;
  ticker: string;
  name: string;
  color: string;
  currentPrice: number;
  openPrice: number;
  lastClose: number;
  priceHistory: number[];         // Rolling 200-point window
  candles: PriceCandle[];
  stats: GameStats;
  historicalBaseline: number;     // Moving average — "T" in formula
  portfolioInsight: string;
  latestEvent: string;
  isCircuitBroken: boolean;
  flashState: 'green' | 'red' | null;
}

export interface OrderBookEntry {
  side: 'BUY' | 'SELL';
  price: number;
  size: number;
  participant: string;
  timestamp: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'EXECUTION' | 'SYSTEM' | 'ALERT' | 'INFO';
  color: string;
}

interface ApexStore {
  // ── Core State ──────────────────────────────────────────
  athletes: Record<string, AthleteData>;
  gameEvents: GameEvent[];
  gameClock: number;       // Seconds remaining (2880 = 48min)
  isLive: boolean;
  selectedAthlete: string;

  // ── Market Infrastructure ────────────────────────────────
  orderBook: OrderBookEntry[];
  systemLog: LogEntry[];
  latencies: number[];     // Rolling latency measurements (ms)
  tickCount: number;

  // ── Actions ──────────────────────────────────────────────
  processGameEvent: (event: GameEvent) => void;
  tickGameClock: (delta: number) => void;
  setSelectedAthlete: (id: string) => void;
  toggleLive: () => void;
  resetGame: () => void;
  addLogEntry: (msg: string, type: LogEntry['type']) => void;
  pushLatency: (ms: number) => void;
}

const buildInitialAthlete = (a: typeof ATHLETES[0]): AthleteData => ({
  id: a.id,
  ticker: a.ticker,
  name: a.name,
  color: a.color,
  currentPrice: a.startPrice,
  openPrice: a.startPrice,
  lastClose: a.startPrice,
  priceHistory: Array.from({ length: 60 }, (_, i) =>
    a.startPrice + (Math.random() - 0.5) * a.startPrice * 0.05
  ),
  candles: [],
  stats: {
    points: 0, assists: 0, rebounds: 0, turnovers: 0,
    steals: 0, blocks: 0, minutesPlayed: 0,
    trueShooting: 0.52, usageRate: 0.28,
    clutchMoments: 0, totalLeveragePlays: 0,
  },
  historicalBaseline: a.startPrice,
  portfolioInsight: 'Awaiting first performance event...',
  latestEvent: '—',
  isCircuitBroken: false,
  flashState: null,
});

const generateOrderBookEntry = (price: number): OrderBookEntry => {
  const participants = ['Quant-α', 'SentimentBot', 'AlgoHedge', 'MomoTrader', 'ValueArb'];
  return {
    side: Math.random() > 0.5 ? 'BUY' : 'SELL',
    price: price * (1 + (Math.random() - 0.5) * 0.03),
    size: Math.floor(Math.random() * 500) + 50,
    participant: participants[Math.floor(Math.random() * participants.length)],
    timestamp: Date.now(),
  };
};

export const useApexStore = create<ApexStore>()(
  subscribeWithSelector((set, get) => ({
    athletes: Object.fromEntries(ATHLETES.map(a => [a.id, buildInitialAthlete(a)])),
    gameEvents: [],
    gameClock: 2880,
    isLive: false,
    selectedAthlete: 'jalani',
    orderBook: [],
    systemLog: [
      { id: '0', timestamp: '--:--:--', message: 'APEX EQUITY TERMINAL v2.4.1 — INITIALIZED', type: 'SYSTEM', color: '#00d4ff' },
      { id: '1', timestamp: '--:--:--', message: 'A-AVM Engine loaded. Circuit breaker: ±15%', type: 'SYSTEM', color: '#00d4ff' },
      { id: '2', timestamp: '--:--:--', message: 'Awaiting game start signal...', type: 'INFO', color: '#4a5568' },
    ],
    latencies: [],
    tickCount: 0,

    processGameEvent: (event) => {
      const t0 = performance.now();
      const state = get();
      const athlete = state.athletes[event.playerId];
      if (!athlete) return;

      // 1. Update stats
      const updatedStats = { ...athlete.stats };
      switch (event.eventType) {
        case 'DUNK':
        case 'MADE_2PT': updatedStats.points += 2; break;
        case 'MADE_3PT': updatedStats.points += 3; break;
        case 'MADE_FT':  updatedStats.points += 1; break;
        case 'ASSIST':   updatedStats.assists += 1; break;
        case 'REBOUND_DEF':
        case 'REBOUND_OFF': updatedStats.rebounds += 1; break;
        case 'TURNOVER': updatedStats.turnovers += 1; break;
        case 'STEAL':    updatedStats.steals += 1; break;
        case 'BLOCK':    updatedStats.blocks += 1; break;
      }
      updatedStats.minutesPlayed = Math.max(0.5, (2880 - event.gameClock) / 60);
      updatedStats.trueShooting = updatedStats.points > 0
        ? Math.min(0.95, 0.45 + updatedStats.points * 0.003)
        : 0.45;
      updatedStats.totalLeveragePlays += 1;
      if (event.gameClock <= 300) updatedStats.clutchMoments += 1;

      // 2. Calculate new price via A-AVM
      const { newPrice, reason, multiplierApplied } = ValuationEngine.processEvent(
        athlete.currentPrice, event.eventType, event.gameClock
      );
      const { price: finalPrice, wasTripped } = ValuationEngine.applyCircuitBreaker(
        newPrice, athlete.lastClose
      );

      const delta = finalPrice - athlete.currentPrice;
      const deltaPercent = (delta / athlete.currentPrice) * 100;
      const insight = ValuationEngine.generateInsight(
        athlete.currentPrice, finalPrice, event.eventType, updatedStats
      );

      // 3. Update price history
      const newHistory = [...athlete.priceHistory, finalPrice].slice(-200);

      // 4. Build/update current candle (1 candle per game minute)
      const candleMinute = Math.floor((2880 - event.gameClock) / 60);
      const existingCandles = [...athlete.candles];
      const lastCandle = existingCandles[existingCandles.length - 1];
      if (!lastCandle || lastCandle.time !== candleMinute) {
        existingCandles.push({ time: candleMinute, open: athlete.currentPrice, high: finalPrice, low: finalPrice, close: finalPrice });
      } else {
        lastCandle.high = Math.max(lastCandle.high, finalPrice);
        lastCandle.low  = Math.min(lastCandle.low,  finalPrice);
        lastCandle.close = finalPrice;
      }

      // 5. Update order book with market reaction
      const newOrders = Array.from({ length: 3 }, () => generateOrderBookEntry(finalPrice));

      // 6. Format log entry
      const clockStr = `${String(Math.floor(event.gameClock / 60)).padStart(2,'0')}:${String(event.gameClock % 60).padStart(2,'0')}`;
      const sign = delta >= 0 ? '+' : '';
      const logMsg = `[${clockStr}] EXECUTION: ${athlete.ticker} ${sign}$${Math.abs(delta).toFixed(2)} (${reason})`;

      // 7. Compute latency
      const latencyMs = Math.round(performance.now() - t0);

      set(s => ({
        athletes: {
          ...s.athletes,
          [event.playerId]: {
            ...athlete,
            currentPrice: finalPrice,
            lastClose: finalPrice,
            stats: updatedStats,
            priceHistory: newHistory,
            candles: existingCandles,
            portfolioInsight: insight,
            latestEvent: event.eventType,
            isCircuitBroken: wasTripped,
            flashState: delta >= 0 ? 'green' : 'red',
          },
        },
        gameEvents: [event, ...s.gameEvents].slice(0, 100),
        orderBook: [...newOrders, ...s.orderBook].slice(0, 20),
        tickCount: s.tickCount + 1,
        systemLog: [{
          id: event.id,
          timestamp: clockStr,
          message: logMsg,
          type: 'EXECUTION',
          color: delta >= 0 ? '#00ff88' : '#ff3b5c',
        }, ...s.systemLog].slice(0, 80),
        latencies: [latencyMs, ...s.latencies].slice(0, 60),
      }));

      // Clear flash after 800ms
      setTimeout(() => {
        set(s => ({
          athletes: { ...s.athletes, [event.playerId]: { ...s.athletes[event.playerId], flashState: null } }
        }));
      }, 800);
    },

    tickGameClock: (delta) => set(s => ({
      gameClock: Math.max(0, s.gameClock - delta),
    })),

    setSelectedAthlete: (id) => set({ selectedAthlete: id }),

    toggleLive: () => {
      const isLive = !get().isLive;
      set({ isLive });
      get().addLogEntry(
        isLive ? 'GAME SESSION STARTED — A-AVM processing events' : 'SESSION PAUSED',
        'SYSTEM'
      );
    },

    resetGame: () => set(s => ({
      athletes: Object.fromEntries(ATHLETES.map(a => [a.id, buildInitialAthlete(a)])),
      gameEvents: [], gameClock: 2880, orderBook: [], tickCount: 0,
      systemLog: [{ id: 'reset', timestamp: '--:--:--', message: 'GAME RESET — All positions cleared', type: 'SYSTEM', color: '#f5a623' }],
    })),

    addLogEntry: (msg, type) => {
      const now = new Date();
      const ts = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
      const colors = { EXECUTION: '#00ff88', SYSTEM: '#00d4ff', ALERT: '#f5a623', INFO: '#4a5568' };
      set(s => ({
        systemLog: [{ id: String(Date.now()), timestamp: ts, message: msg, type, color: colors[type] }, ...s.systemLog].slice(0, 80),
      }));
    },

    pushLatency: (ms) => set(s => ({ latencies: [ms, ...s.latencies].slice(0, 60) })),
  }))
);
