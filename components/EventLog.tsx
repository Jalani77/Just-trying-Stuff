'use client';
import { useApexStore } from '@/store/apex-store';

export default function EventLog() {
  const { systemLog } = useApexStore();

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-terminal-border">
        <span className="text-xs font-bold text-terminal-accent">EXECUTION LOG</span>
        <span className="text-xs text-terminal-green animate-blink">● LIVE</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {systemLog.map(entry => (
          <div key={entry.id} className="flex gap-2 items-start text-[10px] font-mono py-0.5">
            <span className="text-terminal-muted flex-shrink-0">[{entry.timestamp}]</span>
            <span style={{ color: entry.color }} className="leading-relaxed">{entry.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
