'use client';
import { useEffect, useState } from 'react';
import { useApexStore } from '@/store/apex-store';
import { ATHLETES } from '@/lib/game-engine';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface Biometrics { hr: number; fatigue: number; stress: number; }

export default function BiometricSidebar() {
  const { athletes, selectedAthlete, gameClock } = useApexStore();
  const athlete = athletes[selectedAthlete];
  const config  = ATHLETES.find(a => a.id === selectedAthlete);
  const [biometrics, setBiometrics] = useState<Biometrics>({ hr: 72, fatigue: 0.1, stress: 0.2 });
  const [hrHistory, setHrHistory] = useState<number[]>(Array(30).fill(72));

  useEffect(() => {
    if (!athlete) return;
    const minutesPlayed = athlete.stats.minutesPlayed;
    const baseHR  = 120 + minutesPlayed * 1.8;
    const fatigueScore = Math.min(0.95, minutesPlayed / 45);
    const stressScore  = Math.min(0.95, (athlete.stats.turnovers * 0.1) + (gameClock < 300 ? 0.3 : 0));
    const hr = baseHR + (Math.random() - 0.5) * 8;

    setBiometrics({ hr, fatigue: fatigueScore, stress: stressScore });
    setHrHistory(prev => [...prev.slice(1), hr]);
  }, [gameClock]);

  const getRiskLevel = () => {
    if (biometrics.fatigue > 0.75) return { label: 'HIGH RISK', color: '#ff3b5c' };
    if (biometrics.fatigue > 0.45) return { label: 'MOD RISK',  color: '#f5a623' };
    return { label: 'LOW RISK', color: '#00ff88' };
  };
  const risk = getRiskLevel();
  const hrData = hrHistory.map((v, i) => ({ i, v }));

  const Gauge = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-terminal-muted">{label}</span>
        <span style={{ color }}>{(value * 100).toFixed(0)}%</span>
      </div>
      <div className="h-1.5 bg-terminal-border rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500"
             style={{ width: `${value * 100}%`, backgroundColor: color }} />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full text-xs font-mono">
      <div className="flex items-center justify-between px-3 py-2 border-b border-terminal-border">
        <span className="text-xs font-bold text-terminal-accent">BIOMETRIC FEED</span>
        <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ color: risk.color, borderColor: risk.color, border: '1px solid' }}>
          {risk.label}
        </span>
      </div>

      <div className="p-3">
        {/* Heart Rate */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-terminal-muted">HEART RATE</span>
            <span className="text-terminal-red font-bold text-sm animate-pulse">
              ♥ {Math.round(biometrics.hr)} BPM
            </span>
          </div>
          <ResponsiveContainer width="100%" height={40}>
            <LineChart data={hrData}>
              <Line type="monotone" dataKey="v" stroke="#ff3b5c" strokeWidth={1.5} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <Gauge label="FATIGUE INDEX"    value={biometrics.fatigue} color="#f5a623" />
        <Gauge label="STRESS MARKER"    value={biometrics.stress}  color="#ff3b5c" />
        <Gauge label="PEAK PERFORMANCE" value={Math.max(0, 1 - biometrics.fatigue - biometrics.stress * 0.3)} color="#00ff88" />

        {/* Risk Factor Impact on Valuation */}
        <div className="mt-3 p-2 bg-terminal-bg border border-terminal-border rounded text-xs text-terminal-muted leading-relaxed">
          <span className="text-terminal-gold font-bold">⚠ RISK FACTOR: </span>
          Biometric data applying a <span style={{ color: risk.color }}>
            {(biometrics.fatigue * 0.08 * 100).toFixed(1)}%
          </span> downward pressure on valuation baseline.
          Fatigue compounds turnover probability at minute {Math.round(athlete?.stats.minutesPlayed ?? 0)}.
        </div>
      </div>
    </div>
  );
}
