'use client';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';
import { useApexStore } from '@/store/apex-store';
import { ATHLETES } from '@/lib/game-engine';

const normalize = (value: number, max: number) => Math.min(100, (value / max) * 100);

export default function PerformanceRadar() {
  const { athletes, selectedAthlete } = useApexStore();
  const athlete = athletes[selectedAthlete];
  const config  = ATHLETES.find(a => a.id === selectedAthlete);
  if (!athlete || !config) return null;

  const { stats } = athlete;
  const data = [
    { metric: 'SCORING',   value: normalize(stats.points,   35) },
    { metric: 'PLAYMAKING',value: normalize(stats.assists,  12) },
    { metric: 'REBOUNDING',value: normalize(stats.rebounds, 15) },
    { metric: 'DEFENSE',   value: normalize(stats.steals + stats.blocks, 8) },
    { metric: 'EFFICIENCY',value: normalize(stats.trueShooting * 100, 95) },
    { metric: 'CLUTCH',    value: normalize(stats.clutchMoments, 5) },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-terminal-border">
        <span className="text-xs font-bold text-terminal-accent">PERFORMANCE RADAR</span>
        <span className="text-xs text-terminal-muted">48-MIN SESSION</span>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
          <PolarGrid stroke="#1e2a3a" />
          <PolarAngleAxis
            dataKey="metric"
            tick={{ fill: '#4a5568', fontSize: 10, fontFamily: 'JetBrains Mono' }}
          />
          <Radar
            name={config.ticker}
            dataKey="value"
            stroke={config.color}
            fill={config.color}
            fillOpacity={0.2}
            strokeWidth={2}
          />
          <Tooltip
            contentStyle={{ background: '#0d1117', border: '1px solid #1e2a3a', fontSize: 11, fontFamily: 'monospace' }}
            formatter={(val: number) => [`${val.toFixed(0)}`, 'Score']}
          />
        </RadarChart>
      </ResponsiveContainer>
      {/* Stat bar */}
      <div className="grid grid-cols-3 gap-x-3 gap-y-1 px-3 pb-2 text-xs font-mono">
        {[
          { label: 'PTS', val: stats.points },
          { label: 'AST', val: stats.assists },
          { label: 'REB', val: stats.rebounds },
          { label: 'STL', val: stats.steals },
          { label: 'BLK', val: stats.blocks },
          { label: 'TO',  val: stats.turnovers },
        ].map(s => (
          <div key={s.label} className="flex justify-between">
            <span className="text-terminal-muted">{s.label}</span>
            <span className="text-terminal-text font-bold">{s.val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
