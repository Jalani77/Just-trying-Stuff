'use client';
import { useApexStore } from '@/store/apex-store';
import { ATHLETES } from '@/lib/game-engine';
import { motion } from 'framer-motion';

export default function PriceTicker() {
  const { athletes } = useApexStore();

  const items = ATHLETES.map(a => {
    const athlete = athletes[a.id];
    if (!athlete) return null;
    const delta    = athlete.currentPrice - athlete.openPrice;
    const pct      = (delta / athlete.openPrice * 100).toFixed(2);
    const isUp     = delta >= 0;
    return { ticker: a.ticker, price: athlete.currentPrice, delta, pct, isUp, color: a.color };
  }).filter(Boolean);

  const doubled = [...items, ...items, ...items]; // Loop seamlessly

  return (
    <div className="flex items-center h-8 bg-terminal-panel border-b border-terminal-border overflow-hidden">
      <div className="flex-shrink-0 px-3 text-xs font-bold text-terminal-accent border-r border-terminal-border h-full flex items-center">
        APEX EQUITY
      </div>
      <div className="flex-1 overflow-hidden">
        <div className="flex animate-ticker-scroll whitespace-nowrap">
          {doubled.map((item, i) => (
            <span key={i} className="inline-flex items-center gap-2 px-6 text-xs font-mono">
              <span style={{ color: item!.color }} className="font-bold">{item!.ticker}</span>
              <span className="text-terminal-text">${item!.price.toFixed(2)}</span>
              <span className={item!.isUp ? 'text-terminal-green' : 'text-terminal-red'}>
                {item!.isUp ? '▲' : '▼'}{item!.pct}%
              </span>
              <span className="text-terminal-border">│</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
