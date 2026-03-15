'use client';
import { useApexStore } from '@/store/apex-store';

export default function OrderBook() {
  const { orderBook, athletes, selectedAthlete } = useApexStore();
  const athlete = athletes[selectedAthlete];
  const currentPrice = athlete?.currentPrice ?? 100;

  const buys  = orderBook.filter(o => o.side === 'BUY').slice(0, 6);
  const sells = orderBook.filter(o => o.side === 'SELL').slice(0, 6);
  const maxSize = Math.max(...orderBook.map(o => o.size), 1);

  return (
    <div className="flex flex-col h-full text-xs font-mono">
      <div className="flex items-center justify-between px-3 py-2 border-b border-terminal-border">
        <span className="text-xs font-bold text-terminal-accent">ORDER BOOK</span>
        <span className="text-terminal-muted">AI PARTICIPANTS</span>
      </div>

      {/* Sells (asks) */}
      <div className="flex-1 overflow-hidden px-2 pt-1">
        <div className="flex justify-between text-terminal-muted mb-1 px-1">
          <span>PARTICIPANT</span><span>PRICE</span><span>SIZE</span>
        </div>
        {sells.map((o, i) => (
          <div key={i} className="relative flex justify-between items-center py-0.5 px-1 rounded overflow-hidden">
            <div className="absolute right-0 top-0 h-full bg-red-950/40"
                 style={{ width: `${(o.size / maxSize) * 100}%` }} />
            <span className="z-10 text-terminal-muted">{o.participant}</span>
            <span className="z-10 text-terminal-red">${o.price.toFixed(2)}</span>
            <span className="z-10 text-terminal-text">{o.size}</span>
          </div>
        ))}

        {/* Spread */}
        <div className="flex items-center justify-center my-1.5 gap-2">
          <div className="flex-1 h-px bg-terminal-border" />
          <span className="text-terminal-accent font-bold text-sm">${currentPrice.toFixed(2)}</span>
          <div className="flex-1 h-px bg-terminal-border" />
        </div>

        {buys.map((o, i) => (
          <div key={i} className="relative flex justify-between items-center py-0.5 px-1 rounded overflow-hidden">
            <div className="absolute right-0 top-0 h-full bg-green-950/40"
                 style={{ width: `${(o.size / maxSize) * 100}%` }} />
            <span className="z-10 text-terminal-muted">{o.participant}</span>
            <span className="z-10 text-terminal-green">${o.price.toFixed(2)}</span>
            <span className="z-10 text-terminal-text">{o.size}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
