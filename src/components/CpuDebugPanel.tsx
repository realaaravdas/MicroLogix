import React from 'react';
import {
  CpuState,
  getControlSignalNames,
  OPCODE_NAMES,
  stepCpuInstruction,
  stepCpuMicro,
} from '../engine/cpu8.ts';
import { Cpu, Play, FastForward, RotateCcw, Code, ArrowRight } from 'lucide-react';

interface CpuDebugPanelProps {
  cpuState: CpuState;
  memory: number[];
  onUpdateCpu: (nextState: CpuState, nextMemory: number[]) => void;
  onOpenAssemblyEditor: () => void;
  onResetCpu: () => void;
}

export const CpuDebugPanel: React.FC<CpuDebugPanelProps> = ({
  cpuState,
  memory,
  onUpdateCpu,
  onOpenAssemblyEditor,
  onResetCpu,
}) => {
  const activeSignals = getControlSignalNames(cpuState.controlWord);
  const currentOpcode = (cpuState.ir >> 4) & 0x0f;
  const currentOperand = cpuState.ir & 0x0f;
  const currentMnemonic = OPCODE_NAMES[currentOpcode] || '???';

  const handleStepMicro = () => {
    const res = stepCpuMicro(cpuState, memory);
    onUpdateCpu(res.state, res.memory);
  };

  const handleStepInstruction = () => {
    const res = stepCpuInstruction(cpuState, memory);
    onUpdateCpu(res.state, res.memory);
  };

  return (
    <div className="w-80 bg-[#0f172a]/95 backdrop-blur-md border-l border-slate-700/80 flex flex-col h-full text-xs text-slate-300 font-sans shadow-2xl">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-700/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Micro-8 CPU Monitor</h2>
            <p className="text-[10px] text-slate-400 font-mono">Cycle: {cpuState.cycleCount}</p>
          </div>
        </div>

        <button
          onClick={onOpenAssemblyEditor}
          className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[11px] font-medium transition shadow-sm"
        >
          <Code className="w-3 h-3" />
          Assembly IDE
        </button>
      </div>

      {/* Stepping Toolbar */}
      <div className="p-2.5 bg-slate-900/60 border-b border-slate-800 flex items-center gap-1.5 justify-between">
        <button
          onClick={handleStepMicro}
          disabled={cpuState.halted}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 border border-slate-700 text-slate-200 rounded font-mono text-[11px] transition"
          title="Step one microcode cycle (T-state)"
        >
          <Play className="w-3 h-3 text-sky-400" />
          Step Micro
        </button>

        <button
          onClick={handleStepInstruction}
          disabled={cpuState.halted}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white rounded font-medium text-[11px] transition"
          title="Step full machine instruction (all T-states)"
        >
          <FastForward className="w-3 h-3" />
          Step Inst
        </button>

        <button
          onClick={onResetCpu}
          className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/60 rounded transition"
          title="Reset CPU to initial state"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Sequencer Micro-Steps (T0 - T5) */}
      <div className="p-3 border-b border-slate-800">
        <div className="flex items-center justify-between text-[11px] mb-1.5">
          <span className="text-slate-400 font-semibold">T-State Sequencer:</span>
          <span className="font-mono text-sky-400 font-bold">T{cpuState.tState}</span>
        </div>
        <div className="grid grid-cols-6 gap-1">
          {[0, 1, 2, 3, 4, 5].map((t) => {
            const isActive = cpuState.tState === t;
            return (
              <div
                key={t}
                className={`py-1 text-center font-mono rounded text-[11px] font-bold transition ${
                  isActive
                    ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                    : 'bg-slate-900 border border-slate-800 text-slate-500'
                }`}
              >
                T{t}
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Control Bus Lines */}
      <div className="p-3 border-b border-slate-800 bg-slate-950/40">
        <span className="text-[10px] text-slate-400 font-mono block mb-1">
          ACTIVE CONTROL LINES (Word: 0x{cpuState.controlWord.toString(16).toUpperCase().padStart(4, '0')}):
        </span>
        <div className="flex flex-wrap gap-1 min-h-[26px]">
          {activeSignals.length === 0 ? (
            <span className="text-slate-600 text-[11px] italic">No active control lines</span>
          ) : (
            activeSignals.map((sig) => (
              <span
                key={sig}
                className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono text-[10px] font-bold"
              >
                {sig}
              </span>
            ))
          )}
        </div>
      </div>

      {/* CPU Registers Matrix */}
      <div className="p-3 border-b border-slate-800 flex-1 overflow-y-auto">
        <h3 className="text-xs font-semibold text-slate-200 mb-2">Registers & Buses</h3>
        <div className="grid grid-cols-2 gap-2">
          {/* Accumulator A */}
          <div className="p-2 rounded bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 font-mono">ACCUMULATOR (A)</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="font-mono text-emerald-400 font-bold text-sm">
                0x{cpuState.a.toString(16).toUpperCase().padStart(2, '0')}
              </span>
              <span className="font-mono text-slate-500 text-[11px]">{cpuState.a}</span>
            </div>
          </div>

          {/* Temp Register B */}
          <div className="p-2 rounded bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 font-mono">B REGISTER</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="font-mono text-sky-400 font-bold text-sm">
                0x{cpuState.b.toString(16).toUpperCase().padStart(2, '0')}
              </span>
              <span className="font-mono text-slate-500 text-[11px]">{cpuState.b}</span>
            </div>
          </div>

          {/* Program Counter */}
          <div className="p-2 rounded bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 font-mono">PROGRAM COUNTER</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="font-mono text-amber-400 font-bold text-sm">
                0x{cpuState.pc.toString(16).toUpperCase()}
              </span>
              <span className="font-mono text-slate-500 text-[11px]">PC: {cpuState.pc}</span>
            </div>
          </div>

          {/* Memory Address Register */}
          <div className="p-2 rounded bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 font-mono">MAR (ADDR)</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="font-mono text-purple-400 font-bold text-sm">
                0x{cpuState.mar.toString(16).toUpperCase()}
              </span>
              <span className="font-mono text-slate-500 text-[11px]">RAM[{cpuState.mar}]</span>
            </div>
          </div>

          {/* Instruction Register */}
          <div className="p-2 rounded bg-slate-900 border border-slate-800 col-span-2">
            <span className="text-[10px] text-slate-400 font-mono">INSTRUCTION REGISTER (IR)</span>
            <div className="flex items-center justify-between mt-1">
              <span className="font-mono text-sky-300 font-bold">
                0x{cpuState.ir.toString(16).toUpperCase().padStart(2, '0')}
              </span>
              <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 font-mono text-[11px] font-bold">
                {currentMnemonic} {currentOperand}
              </span>
            </div>
          </div>

          {/* System Bus */}
          <div className="p-2 rounded bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 font-mono">MAIN DATA BUS</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="font-mono text-cyan-300 font-bold text-sm">
                0x{cpuState.bus.toString(16).toUpperCase().padStart(2, '0')}
              </span>
              <span className="font-mono text-slate-500 text-[10px]">{cpuState.bus}</span>
            </div>
          </div>

          {/* Output Register */}
          <div className="p-2 rounded bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 font-mono">OUTPUT PORT</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="font-mono text-emerald-400 font-bold text-sm">
                0x{cpuState.out.toString(16).toUpperCase().padStart(2, '0')}
              </span>
              <span className="font-mono text-slate-500 text-[10px]">{cpuState.out}</span>
            </div>
          </div>
        </div>

        {/* CPU Status Flags */}
        <div className="mt-3 p-2.5 rounded bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] text-slate-400 font-mono block mb-1.5">CONDITION FLAGS:</span>
          <div className="grid grid-cols-3 gap-2">
            <div
              className={`p-1 text-center font-mono rounded text-[11px] font-bold ${
                cpuState.flags.carry
                  ? 'bg-amber-500/30 text-amber-300 border border-amber-500/60'
                  : 'bg-slate-950 text-slate-600 border border-slate-800'
              }`}
            >
              CARRY: {cpuState.flags.carry ? '1' : '0'}
            </div>
            <div
              className={`p-1 text-center font-mono rounded text-[11px] font-bold ${
                cpuState.flags.zero
                  ? 'bg-sky-500/30 text-sky-300 border border-sky-500/60'
                  : 'bg-slate-950 text-slate-600 border border-slate-800'
              }`}
            >
              ZERO: {cpuState.flags.zero ? '1' : '0'}
            </div>
            <div
              className={`p-1 text-center font-mono rounded text-[11px] font-bold ${
                cpuState.halted
                  ? 'bg-red-500/30 text-red-300 border border-red-500/60'
                  : 'bg-slate-950 text-slate-600 border border-slate-800'
              }`}
            >
              {cpuState.halted ? 'HALTED' : 'RUNNING'}
            </div>
          </div>
        </div>

        {/* Live RAM Matrix View */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-200">RAM Contents (16 Bytes)</span>
            <span className="text-[10px] font-mono text-slate-500">0x0 to 0xF</span>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden divide-y divide-slate-800/60 max-h-48 overflow-y-auto">
            {memory.slice(0, 16).map((val, addr) => {
              const isPc = cpuState.pc === addr;
              const isMar = cpuState.mar === addr;
              const op = (val >> 4) & 0x0f;
              const operand = val & 0x0f;
              const mnemonic = OPCODE_NAMES[op] || '???';

              return (
                <div
                  key={addr}
                  className={`px-2.5 py-1 flex items-center justify-between text-[11px] font-mono transition ${
                    isPc
                      ? 'bg-amber-500/20 text-amber-200 font-bold'
                      : isMar
                      ? 'bg-purple-500/15 text-purple-200'
                      : 'hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">0x{addr.toString(16).toUpperCase()}:</span>
                    <span className="text-slate-300 font-bold">
                      0x{val.toString(16).toUpperCase().padStart(2, '0')}
                    </span>
                    <span className="text-slate-400">
                      {mnemonic} {operand}
                    </span>
                  </div>
                  {isPc && (
                    <span className="text-[10px] text-amber-400 flex items-center gap-0.5">
                      <ArrowRight className="w-3 h-3" /> PC
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
