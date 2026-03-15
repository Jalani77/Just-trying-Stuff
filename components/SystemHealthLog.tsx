'use client';
import { useApexStore } from '@/store/apex-store';

export default function SystemHealthLog() {
  const { systemLog, latencies, tickCount } = useApexStore();
  const avgLatency = latencies.length
    ? (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(1)
    : '—';
  const maxLatency = latencies.length ? Math.max(...latencies) : 0;
  const p99        = latencies.length > 10
    ? [...latencies].sort((a, b) => a - b)[Math.floor(latencies.length * 0.99)]
    : 0;
  const latencyColor = parseFloat(avgLatency as string) < 16 ? '#00ff88'
    : parseFloat(avgLatency as string) < 50 ? '#f5a623' : '#ff3b5c';

  return (
    <div className="flex items-center gap-6 px-4 py-1.5 text-[10px] font-mono border-t border-terminal-border bg-terminal-panel">
      <span className="text-terminal-muted">SYSTEM HEALTH</span>
      <span>ENGINE LATENCY: <span style={{ color: latencyColor }}>{avgLatency}ms avg</span></span>
      <span>P99: <span className="text-terminal-text">{p99}ms</span></span>
      <span>PEAK: <span className="text-terminal-text">{maxLatency}ms</span></span>
      <span>TICKS: <span className="text-terminal-accent">{tickCount.toLocaleString()}</span></span>
      <div className="flex-1 overflow-hidden">
        <div className="flex gap-0.5 items-end h-4">
          {latencies.slice(0, 40).reverse().map((l, i) => (
            <div key={i} className="flex-1 rounded-sm"
                 style={{
                   height: `${Math.min(100, (l / 100) * 100)}%`,
                   backgroundColor: l < 16 ? '#00ff88' : l < 50 ? '#f5a623' : '#ff3b5c',
                   opacity: 0.6,
                 }} />
          ))}
        </div>
      </div>
      <span className="text-terminal-green animate-blink">● LIVE</span>
    </div>
  );
}
