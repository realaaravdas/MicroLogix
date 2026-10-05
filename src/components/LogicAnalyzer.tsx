import React, { useRef, useEffect, useState } from 'react';
import { LogicAnalyzerChannel, LogicAnalyzerSample, LogicState } from '../types/circuit.ts';
import { Activity, Play, Pause, RotateCcw, ZoomIn, ZoomOut, CheckSquare, Square } from 'lucide-react';

interface LogicAnalyzerProps {
  samples: LogicAnalyzerSample[];
  channels: LogicAnalyzerChannel[];
  onToggleChannel?: (channelId: string) => void;
  onClearSamples: () => void;
  isSimulating: boolean;
  onToggleSimulation: () => void;
  onStepClock: () => void;
}

export const LogicAnalyzer: React.FC<LogicAnalyzerProps> = ({
  samples,
  channels,
  onClearSamples,
  isSimulating,
  onToggleSimulation,
  onStepClock,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoomX, setZoomX] = useState(1);
  const [hoverCycle, setHoverCycle] = useState<number | null>(null);
  const [activeChannels, setActiveChannels] = useState<Set<string>>(
    new Set(channels.map((c) => c.id))
  );

  const toggleChannel = (id: string) => {
    setActiveChannels((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;

    // Background
    ctx.fillStyle = '#090d14';
    ctx.fillRect(0, 0, w, h);

    const labelWidth = 100;
    const waveformWidth = w - labelWidth - 20;

    const visibleChannels = channels.filter((c) => activeChannels.has(c.id));
    if (visibleChannels.length === 0) {
      ctx.restore();
      return;
    }

    const channelHeight = Math.max(28, (h - 30) / visibleChannels.length);

    // Timeline Header
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, 24);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 24);
    ctx.lineTo(w, 24);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('SIGNAL', 12, 16);

    // Draw clock cycle division markers
    const totalSamples = samples.length;
    const stepX = Math.max(6, 14 * zoomX);

    // Offset to keep right edge in view
    const maxVisibleSamples = Math.floor(waveformWidth / stepX);
    const startIndex = Math.max(0, totalSamples - maxVisibleSamples);

    for (let i = startIndex; i < totalSamples; i++) {
      const x = labelWidth + (i - startIndex) * stepX;
      if (x > w) break;

      // Division vertical line
      ctx.strokeStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(x, 24);
      ctx.lineTo(x, h);
      ctx.stroke();

      // Cycle number
      if (i % 5 === 0) {
        ctx.fillStyle = '#94a3b8';
        ctx.textAlign = 'center';
        ctx.fillText(`T${i}`, x, 16);
      }
    }

    // Draw each Channel
    visibleChannels.forEach((chan, idx) => {
      const chanY = 24 + idx * channelHeight;

      // Channel background alternate striping
      if (idx % 2 === 1) {
        ctx.fillStyle = '#0b0f19';
        ctx.fillRect(0, chanY, w, channelHeight);
      }

      // Horizontal separator
      ctx.strokeStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(0, chanY + channelHeight);
      ctx.lineTo(w, chanY + channelHeight);
      ctx.stroke();

      // Label & Type
      ctx.fillStyle = chan.color || '#38bdf8';
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(chan.label, 12, chanY + channelHeight / 2 - 4);

      ctx.fillStyle = '#64748b';
      ctx.font = '8px "JetBrains Mono", monospace';
      ctx.fillText(chan.type === 'bus' ? `BUS [${chan.bits - 1}:0]` : 'BIT', 12, chanY + channelHeight / 2 + 7);

      // Waveform rendering
      const waveHigh = chanY + 6;
      const waveLow = chanY + channelHeight - 6;
      const waveMid = (waveHigh + waveLow) / 2;

      ctx.strokeStyle = chan.color || '#38bdf8';
      ctx.lineWidth = 1.8;
      ctx.beginPath();

      let lastX = labelWidth;
      let lastY = waveLow;

      for (let i = startIndex; i < totalSamples; i++) {
        const sample = samples[i];
        const val = sample.signals[chan.id] ?? 0;
        const x = labelWidth + (i - startIndex) * stepX;

        if (chan.type === 'bus') {
          // Bus Hex Badge Waveform
          const nextX = x + stepX;
          ctx.save();
          ctx.strokeStyle = chan.color;
          ctx.lineWidth = 1.2;

          // Hexagonal bus wire shape
          ctx.beginPath();
          ctx.moveTo(x + 2, waveMid);
          ctx.lineTo(x + 5, waveHigh);
          ctx.lineTo(nextX - 5, waveHigh);
          ctx.lineTo(nextX - 2, waveMid);
          ctx.lineTo(nextX - 5, waveLow);
          ctx.lineTo(x + 5, waveLow);
          ctx.closePath();
          ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
          ctx.fill();
          ctx.stroke();

          // Hex text inside
          ctx.fillStyle = '#e2e8f0';
          ctx.font = '8.5px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const hexStr = typeof val === 'number' ? `0x${val.toString(16).toUpperCase()}` : `${val}`;
          if (stepX >= 24) {
            ctx.fillText(hexStr, x + stepX / 2, waveMid);
          }
          ctx.restore();
        } else {
          // Single Bit Digital Waveform
          const isHigh = val === 1 || (typeof val === 'number' && val > 0);
          const currentY = isHigh ? waveHigh : waveLow;

          if (i === startIndex) {
            ctx.moveTo(x, currentY);
          } else {
            // Step transition
            ctx.lineTo(x, lastY);
            ctx.lineTo(x, currentY);
          }
          ctx.lineTo(x + stepX, currentY);

          lastX = x + stepX;
          lastY = currentY;
        }
      }

      if (chan.type !== 'bus') {
        ctx.stroke();
      }
    });

    // Vertical Cursor line at hover
    if (hoverCycle !== null && hoverCycle >= startIndex && hoverCycle < totalSamples) {
      const cursorX = labelWidth + (hoverCycle - startIndex) * stepX;
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(cursorX, 0);
      ctx.lineTo(cursorX, h);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }, [samples, channels, activeChannels, zoomX, hoverCycle]);

  return (
    <div className="w-full h-full bg-[#090d14] flex flex-col border-t border-slate-800">
      {/* Oscilloscope Control Bar */}
      <div className="h-9 px-3 bg-[#0f172a] border-b border-slate-800 flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 font-semibold text-sky-400">
            <Activity className="w-3.5 h-3.5" />
            <span>Logic Analyzer & Timing Diagram</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">({samples.length} cycles captured)</span>
        </div>

        {/* Play / Step / Zoom Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onToggleSimulation}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition ${
              isSimulating
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-emerald-600 text-white hover:bg-emerald-500'
            }`}
          >
            {isSimulating ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            {isSimulating ? 'Pause' : 'Run Clock'}
          </button>

          <button
            onClick={onStepClock}
            disabled={isSimulating}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700 rounded text-xs font-mono transition"
            title="Step Clock by 1 Tick"
          >
            Step ⇥
          </button>

          <button
            onClick={onClearSamples}
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition"
            title="Clear Waveform Buffer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-3.5 bg-slate-700 mx-1" />

          <button
            onClick={() => setZoomX((z) => Math.max(0.5, z / 1.3))}
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition"
            title="Zoom Out Timebase"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setZoomX((z) => Math.min(3, z * 1.3))}
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition"
            title="Zoom In Timebase"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Waveform Canvas */}
      <div className="flex-1 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-full block cursor-crosshair"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const sx = e.clientX - rect.left;
            const labelWidth = 100;
            const stepX = Math.max(6, 14 * zoomX);
            const cycle = Math.floor((sx - labelWidth) / stepX);
            setHoverCycle(cycle >= 0 ? cycle : null);
          }}
          onMouseLeave={() => setHoverCycle(null)}
        />
      </div>

      {/* Channel Toggles Bar */}
      <div className="px-3 py-1.5 bg-[#0f172a]/90 border-t border-slate-800 flex items-center gap-3 overflow-x-auto no-scrollbar text-[11px]">
        <span className="text-slate-500 font-mono text-[10px]">CHANNELS:</span>
        {channels.map((chan) => {
          const isChecked = activeChannels.has(chan.id);
          return (
            <button
              key={chan.id}
              onClick={() => toggleChannel(chan.id)}
              className="flex items-center gap-1 text-slate-300 hover:text-white transition whitespace-nowrap"
            >
              {isChecked ? (
                <CheckSquare className="w-3 h-3 text-sky-400" />
              ) : (
                <Square className="w-3 h-3 text-slate-600" />
              )}
              <span style={{ color: isChecked ? chan.color : '#64748b' }} className="font-mono">
                {chan.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
