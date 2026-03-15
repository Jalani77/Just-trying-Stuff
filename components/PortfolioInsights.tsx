'use client';
import { useApexStore } from '@/store/apex-store';
import { ATHLETES } from '@/lib/game-engine';

export default function PortfolioInsights() {
  const { athletes } = useApexStore();

  const sorted = ATHLETES.map(a => {
    const athlete = athletes[a.id];
    const delta = athlete ? athlete.currentPrice - athlete.openPrice : 0;
    const pct   = athlete ? (delta / athlete.openPrice * 100) : 0;
    return { ...a, athlete, delta, pct };
  }).sort((a, b) => b.pct - a.pct);

  return (
    <div className="flex flex-col h-full text-xs font-mono">
      <div className="flex items-center justify-between px-3 py-2 border-b border-terminal-border">
        <span className="text-xs font-bold text-terminal-accent">PORTFOLIO IMPACT</span>
        <span className="text-terminal-muted">GAINERS / LOSERS</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {sorted.map(({ id, ticker, color, athlete, delta, pct }) => (
          <div key={id} className={`p-2 rounded border ${delta >= 0 ? 'border-green-900/50 bg-green-950/20' : 'border-red-900/50 bg-red-950/20'}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold" style={{ color }}>{ticker}</span>
              <span className={`font-bold ${delta >= 0 ? 'text-terminal-green' : 'text-terminal-red'}`}>
                {delta >= 0 ? '+' : ''}{pct.toFixed(2)}%
              </span>
            </div>
            <p className="text-terminal-muted leading-relaxed text-[10px]">
              {athlete?.portfolioInsight ?? 'Awaiting event...'}
            </p>
            {athlete?.isCircuitBroken && (
              <span className="text-terminal-gold text-[10px]">⚡ Circuit breaker engaged this session</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
