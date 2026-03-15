// ============================================================
// BASKETBALL STATE MACHINE — Physics-Based Data Generator
// Drives the 3D court simulation and emits performance events
// ============================================================

import type { EventType } from './valuation-engine';

export interface PlayerConfig {
  id: string;
  ticker: string;        // e.g. "$JALANI"
  name: string;
  skillRating: number;   // 0–1
  speed: number;         // pixels/second
  startPrice: number;
  color: string;
  teamColor: string;
  jerseyNumber: number;
}

export interface PlayerState {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  state: 'OFFENSE' | 'DEFENSE' | 'IDLE' | 'CELEBRATING' | 'FOULING';
  hasBall: boolean;
  celebrationTimer: number;
}

export interface GameEvent {
  id: string;
  timestamp: number;
  playerId: string;
  eventType: EventType;
  gameClock: number;
  x: number;
  y: number;
  description: string;
  dollarImpact?: number;
}

// Court dimensions (normalized 0–1, scaled on render)
const COURT = { width: 1, height: 0.53, hoopLeft: 0.08, hoopRight: 0.92, hoopY: 0.5 };

export const ATHLETES: PlayerConfig[] = [
  { id: 'jalani', ticker: '$JALANI', name: 'J. OSEI', skillRating: 0.88, speed: 0.28, startPrice: 142.50, color: '#00d4ff', teamColor: '#003366', jerseyNumber: 23 },
  { id: 'apex',   ticker: '$APEX',   name: 'A. CROSS', skillRating: 0.81, speed: 0.32, startPrice: 118.75, color: '#00ff88', teamColor: '#004d26', jerseyNumber: 7  },
  { id: 'kyrie',  ticker: '$KYRIE',  name: 'K. DRAKE', skillRating: 0.92, speed: 0.30, startPrice: 187.20, color: '#f5a623', teamColor: '#4a2c00', jerseyNumber: 11 },
  { id: 'pharaoh',ticker: '$PHAROH', name: 'P. STONE', skillRating: 0.76, speed: 0.25, startPrice: 95.40,  color: '#ff3b5c', teamColor: '#4a0010', jerseyNumber: 3  },
];

const MATCHUPS = [
  ['jalani', 'kyrie'],    // Team A vs Team B
  ['apex',   'pharaoh'],
];

export class GameEngine {
  private players: Map<string, PlayerState> = new Map();
  private ballCarrierId: string = 'jalani';
  private possession: 'A' | 'B' = 'A';
  private eventQueue: GameEvent[] = [];
  private lastEventTime: number = 0;
  private eventCooldown: number = 1200; // ms between events

  constructor() {
    this.initPlayers();
  }

  private initPlayers() {
    ATHLETES.forEach((config, i) => {
      this.players.set(config.id, {
        id: config.id,
        x: 0.2 + (i % 2) * 0.6,
        y: 0.3 + Math.floor(i / 2) * 0.4,
        vx: 0, vy: 0,
        state: i < 2 ? 'OFFENSE' : 'DEFENSE',
        hasBall: config.id === 'jalani',
        celebrationTimer: 0,
      });
    });
  }

  update(deltaMs: number, gameClock: number): GameEvent[] {
    const emitted: GameEvent[] = [];
    const now = Date.now();

    this.players.forEach((player, id) => {
      const config = ATHLETES.find(a => a.id === id)!;
      this.updatePlayerPhysics(player, config, deltaMs);

      if (player.celebrationTimer > 0) {
        player.celebrationTimer = Math.max(0, player.celebrationTimer - deltaMs);
        return;
      }
    });

    // Emit event based on cooldown and probability
    if (now - this.lastEventTime > this.eventCooldown) {
      const event = this.tryGenerateEvent(gameClock);
      if (event) {
        emitted.push(event);
        this.eventQueue.push(event);
        this.lastEventTime = now;
        this.eventCooldown = 800 + Math.random() * 1600; // Random 0.8–2.4s cadence
      }
    }

    return emitted;
  }

  private updatePlayerPhysics(player: PlayerState, config: PlayerConfig, deltaMs: number) {
    const hoopX = this.possession === 'A' ? COURT.hoopRight : COURT.hoopLeft;
    const speed = config.speed * (deltaMs / 1000);

    if (player.state === 'OFFENSE' && player.hasBall) {
      // Move toward the hoop
      const dx = hoopX - player.x;
      const dy = COURT.hoopY - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0.02) {
        player.x += (dx / dist) * speed;
        player.y += (dy / dist) * speed;
      }
    } else if (player.state === 'DEFENSE') {
      // Track the ball carrier
      const ballCarrier = this.players.get(this.ballCarrierId);
      if (ballCarrier) {
        const dx = ballCarrier.x - player.x;
        const dy = ballCarrier.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0.05) {
          player.x += (dx / dist) * speed * 0.9;
          player.y += (dy / dist) * speed * 0.9;
        }
      }
    } else if (player.state === 'OFFENSE' && !player.hasBall) {
      // Cut toward open space
      player.x += (Math.random() - 0.5) * speed * 0.6;
      player.y += (Math.random() - 0.5) * speed * 0.6;
    }

    // Clamp to court bounds
    player.x = Math.max(0.05, Math.min(0.95, player.x));
    player.y = Math.max(0.05, Math.min(0.95, player.y));
  }

  private tryGenerateEvent(gameClock: number): GameEvent | null {
    const carrier = this.players.get(this.ballCarrierId);
    const carrierConfig = ATHLETES.find(a => a.id === this.ballCarrierId)!;
    if (!carrier) return null;

    const hoopX = this.possession === 'A' ? COURT.hoopRight : COURT.hoopLeft;
    const distToHoop = Math.sqrt(Math.pow(carrier.x - hoopX, 2) + Math.pow(carrier.y - COURT.hoopY, 2));

    // Find nearest defender
    let defenderDist = 1.0;
    this.players.forEach((p) => {
      if (p.id !== this.ballCarrierId && p.state === 'DEFENSE') {
        const d = Math.sqrt(Math.pow(p.x - carrier.x, 2) + Math.pow(p.y - carrier.y, 2));
        defenderDist = Math.min(defenderDist, d);
      }
    });

    // Roll for shot attempt when close enough to hoop
    if (distToHoop < 0.25 && Math.random() < 0.45) {
      return this.resolveShot(carrier, carrierConfig, distToHoop, defenderDist, gameClock);
    }

    // Roll for non-shooting events
    const roll = Math.random();
    if (roll < 0.08) return this.emitEvent(carrier, 'TURNOVER', gameClock, 'Ball stripped — possession lost');
    if (roll < 0.14) return this.emitEvent(carrier, 'STEAL',   gameClock, 'Anticipatory steal — transition opportunity');
    if (roll < 0.19) return this.emitEvent(carrier, 'BLOCK',   gameClock, 'Shot rejection at the rim');
    if (roll < 0.26) return this.emitEvent(carrier, 'REBOUND_DEF', gameClock, 'Defensive board secured');
    if (roll < 0.30) return this.emitEvent(carrier, 'FOUL',    gameClock, 'Defensive foul — sends to the line');

    return null;
  }

  private resolveShot(
    carrier: PlayerState, config: PlayerConfig,
    distToHoop: number, defenderDist: number, gameClock: number
  ): GameEvent {
    // Shot probability: skill - distance penalty - contest penalty
    const distPenalty = distToHoop * 0.6;
    const contestPenalty = Math.max(0, (0.2 - defenderDist) * 1.5);
    const shotPct = Math.max(0.15, config.skillRating - distPenalty - contestPenalty);
    const made = Math.random() < shotPct;

    const is3pt = distToHoop > 0.35;
    const isDunk = distToHoop < 0.08 && made && Math.random() < 0.4;

    if (!made) {
      // After miss, switch possession
      this.switchPossession();
      return this.emitEvent(carrier, 'REBOUND_DEF', gameClock, 'Miss — defensive board triggers transition');
    }

    // Trigger celebration
    carrier.celebrationTimer = 1500;

    if (isDunk) {
      this.switchPossession();
      return this.emitEvent(carrier, 'DUNK', gameClock, `DUNK — ${config.name} rises above the defense!`);
    }
    if (is3pt) {
      this.switchPossession();
      return this.emitEvent(carrier, 'MADE_3PT', gameClock, `Three-pointer — ${config.name} from deep range`);
    }
    this.switchPossession();
    return this.emitEvent(carrier, 'MADE_2PT', gameClock, `Mid-range conversion — efficiency play`);
  }

  private switchPossession() {
    this.possession = this.possession === 'A' ? 'B' : 'A';
    // Rotate ball carrier to opposite team
    const teamA = ['jalani', 'apex'];
    const teamB = ['kyrie', 'pharaoh'];
    const newCarrierPool = this.possession === 'A' ? teamA : teamB;
    this.ballCarrierId = newCarrierPool[Math.floor(Math.random() * newCarrierPool.length)];
    
    this.players.forEach((p, id) => {
      const isOnPossessionTeam = (this.possession === 'A' && teamA.includes(id)) ||
                                  (this.possession === 'B' && teamB.includes(id));
      p.hasBall = id === this.ballCarrierId;
      p.state = isOnPossessionTeam ? 'OFFENSE' : 'DEFENSE';
    });
  }

  private emitEvent(
    player: PlayerState, eventType: EventType, gameClock: number, description: string
  ): GameEvent {
    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      playerId: player.id,
      eventType,
      gameClock,
      x: player.x,
      y: player.y,
      description,
    };
  }

  getPlayerStates(): Map<string, PlayerState> { return this.players; }
  getBallCarrierId(): string { return this.ballCarrierId; }
}
