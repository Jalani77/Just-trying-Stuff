'use client';
import { useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useApexStore } from '@/store/apex-store';
import { useValuationEngine } from '@/hooks/useValuationEngine';
import { ATHLETES, GameEngine } from '@/lib/game-engine';
import PriceTicker      from '@/components/PriceTicker';
import CandlestickChart from '@/components/CandlestickChart';
import PerformanceRadar from '@/components/PerformanceRadar';
import OrderBook        from '@/components/OrderBook';
import BiometricSidebar from '@/components/BiometricSidebar';
import PortfolioInsights from '@/components/PortfolioInsights';
import SystemHealthLog  from '@/components/SystemHealthLog';
import EventLog         from '@/components/EventLog';

// Dynamic import for Three.js — prevents SSR issues
const GameCourt = dynamic(() => import('@/components/GameCourt'), { ssr: false });

export default function ApexEquityTerminal() {
  const { isLive, gameClock, toggleLive, resetGame, selectedAthlete, setSelectedAthlete, athletes } = useApexStore();
  const engineRef = useRef<GameEngine | null>(null);
  const { engine } = useValuationEngine();
  engineRef.current = engine;

  const clockMins = Math.floor(gameClock / 60);
  const clockSecs = gameClock % 60;
  const period    = gameClock > 2160 ? 'Q1' : gameClock > 1440 ? 'Q2' : gameClock > 720 ? 'Q3' : 'Q4';
  const isClutch  = gameClock <= 120;

  return (
    <div className="flex flex-col h-screen bg-terminal-bg overflow-hidden">
      {/* Scanline overlay */}
      <div className="scanline" />

      {/* ── Top Bar ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 h-10 border-b border-terminal-border bg-terminal-panel flex-shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-terminal-accent font-bold tracking-widest text-sm">APEX EQUITY</span>
          <span className="text-terminal-muted text-xs">HUMAN CAPITAL EXCHANGE</span>
          <span className="text-xs px-2 py-0.5 border border-terminal-border text-terminal-muted">{period}</span>
          <span className={`text-sm font-bold font-mono ${isClutch ? 'text-terminal-red animate-pulse' : 'text-terminal-text'}`}>
            {isClutch && '🔴 '}
            {String(clockMins).padStart(2, '0')}:{String(clockSecs).padStart(2, '0')}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {ATHLETES.map(a => (
            <button key={a.id} onClick={() => setSelectedAthlete(a.id)}
              className={`px-3 py-1 text-xs font-bold rounded transition-all font-mono
                ${selectedAthlete === a.id
                  ? 'border text-terminal-bg'
                  : 'border border-terminal-border text-terminal-muted hover:text-terminal-text'}`}
              style={selectedAthlete === a.id ? { backgroundColor: a.color, borderColor: a.color } : {}}>
              {a.ticker}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={resetGame} className="px-3 py-1.5 text-xs font-mono border border-terminal-border text-terminal-muted hover:text-terminal-text rounded transition-colors">
            ↺ RESET
          </button>
          <button onClick={toggleLive}
            className={`px-4 py-1.5 text-xs font-bold font-mono rounded transition-all ${
              isLive ? 'bg-terminal-red text-white border border-terminal-red' : 'bg-terminal-green text-black border border-terminal-green'
            }`}>
            {isLive ? '■ HALT' : '▶ LIVE'}
          </button>
        </div>
      </div>

      {/* ── Ticker Tape ───────────────────────────────────────── */}
      <PriceTicker />

      {/* ── Main Content ──────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 gap-0">

        {/* LEFT: 3D Court */}
        <div className="w-[38%] flex flex-col border-r border-terminal-border">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-terminal-border bg-terminal-panel">
            <span className="text-xs font-bold text-terminal-accent">LIVE COURT · A-AVM DATA FEED</span>
            <span className={`text-xs ${isLive ? 'text-terminal-green animate-blink' : 'text-terminal-muted'}`}>
              ● {isLive ? 'STREAMING' : 'PAUSED'}
            </span>
          </div>
          <div className="flex-1 min-h-0">
            <GameCourt engineRef={engineRef} />
          </div>

          {/* Event Log below court */}
          <div className="h-40 border-t border-terminal-border bg-terminal-panel overflow-hidden">
            <EventLog />
          </div>
        </div>

        {/* CENTER: Financial Terminal */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Candle chart */}
          <div className="flex-1 min-h-0 border-b border-terminal-border">
            <CandlestickChart />
          </div>

          {/* Bottom row */}
          <div className="h-52 flex border-t border-terminal-border">
            <div className="flex-1 border-r border-terminal-border overflow-hidden">
              <PerformanceRadar />
            </div>
            <div className="w-56 border-r border-terminal-border overflow-hidden">
              <OrderBook />
            </div>
            <div className="w-72 overflow-hidden">
              <PortfolioInsights />
            </div>
          </div>
        </div>

        {/* RIGHT: Biometric Sidebar */}
        <div className="w-56 border-l border-terminal-border flex flex-col">
          <BiometricSidebar />
        </div>
      </div>

      {/* ── System Health Footer ───────────────────────────────── */}
      <SystemHealthLog />
    </div>
  );
}
