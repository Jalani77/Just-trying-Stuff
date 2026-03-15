'use client';
import { useEffect, useRef } from 'react';
import { createChart, CandlestickSeries, HistogramSeries } from 'lightweight-charts';
import { useApexStore } from '@/store/apex-store';

export default function CandlestickChart() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef     = useRef<ReturnType<typeof createChart> | null>(null);
  const seriesRef    = useRef<any>(null);
  const volSeriesRef = useRef<any>(null);
  const { athletes, selectedAthlete } = useApexStore();
  const athlete = athletes[selectedAthlete];

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width:  chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: {
        background: { color: '#0d1117' },
        textColor:  '#c9d1d9',
      },
      grid: {
        vertLines: { color: '#1e2a3a' },
        horzLines: { color: '#1e2a3a' },
      },
      crosshair: {
        mode: 1,
        vertLine: { color: '#00d4ff', width: 1, style: 3 },
        horzLine: { color: '#00d4ff', width: 1, style: 3 },
      },
      rightPriceScale: {
        borderColor: '#1e2a3a',
        scaleMargins: { top: 0.1, bottom: 0.2 },
      },
      timeScale: {
        borderColor: '#1e2a3a',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    seriesRef.current = chart.addSeries(CandlestickSeries, {
      upColor:   '#00ff88',
      downColor: '#ff3b5c',
      borderUpColor:   '#00ff88',
      borderDownColor: '#ff3b5c',
      wickUpColor:   '#00ff88',
      wickDownColor: '#ff3b5c',
    });

    volSeriesRef.current = chart.addSeries(HistogramSeries, {
      color: '#26a69a',
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    });
    volSeriesRef.current.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    chartRef.current = chart;

    const handleResize = () => {
      if (!chartContainerRef.current) return;
      chart.applyOptions({ width: chartContainerRef.current.clientWidth, height: chartContainerRef.current.clientHeight });
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // Update data when candles change
  useEffect(() => {
    if (!seriesRef.current || !athlete?.candles?.length) return;

    const data = athlete.candles.map(c => ({ ...c }));
    seriesRef.current.setData(data);

    const volData = athlete.candles.map(c => ({
      time: c.time,
      value: Math.abs(c.close - c.open) * 1000,
      color: c.close >= c.open ? 'rgba(0,255,136,0.3)' : 'rgba(255,59,92,0.3)',
    }));
    volSeriesRef.current?.setData(volData);
    chartRef.current?.timeScale().fitContent();
  }, [athlete?.candles]);

  const priceDelta = athlete ? athlete.currentPrice - athlete.openPrice : 0;
  const pctChange  = athlete ? (priceDelta / athlete.openPrice * 100) : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Chart Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-terminal-border">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold" style={{ color: athlete?.color }}>
            {athlete?.ticker}
          </span>
          <span className="text-lg font-bold text-terminal-text">
            ${athlete?.currentPrice.toFixed(2)}
          </span>
          <span className={`text-sm font-mono ${priceDelta >= 0 ? 'text-terminal-green' : 'text-terminal-red'}`}>
            {priceDelta >= 0 ? '▲' : '▼'} {Math.abs(priceDelta).toFixed(2)} ({pctChange >= 0 ? '+' : ''}{pctChange.toFixed(2)}%)
          </span>
        </div>
        <div className="flex gap-4 text-xs text-terminal-muted">
          <span>O: <span className="text-terminal-text">${athlete?.openPrice.toFixed(2)}</span></span>
          <span>H: <span className="text-terminal-green">${athlete?.candles.length ? Math.max(...athlete.candles.map(c => c.high)).toFixed(2) : '—'}</span></span>
          <span>L: <span className="text-terminal-red">${athlete?.candles.length ? Math.min(...athlete.candles.map(c => c.low)).toFixed(2) : '—'}</span></span>
        </div>
        {athlete?.isCircuitBroken && (
          <span className="text-xs px-2 py-0.5 bg-yellow-900/40 text-terminal-gold border border-terminal-gold rounded animate-pulse">
            ⚡ CIRCUIT BREAKER
          </span>
        )}
      </div>
      <div ref={chartContainerRef} className="flex-1 min-h-0" />
    </div>
  );
}
