import React, { useState } from 'react';
import { assemble, PRESET_PROGRAMS, AssembledLine } from '../engine/cpu8.ts';
import { Code, Play, CheckCircle2, AlertTriangle, BookOpen, Download } from 'lucide-react';

interface AssemblyEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadProgramToMemory: (bytes: number[]) => void;
  initialCode?: string;
}

export const AssemblyEditorModal: React.FC<AssemblyEditorModalProps> = ({
  isOpen,
  onClose,
  onLoadProgramToMemory,
  initialCode = PRESET_PROGRAMS[0].code,
}) => {
  const [sourceCode, setSourceCode] = useState(initialCode);
  const [selectedPresetId, setSelectedPresetId] = useState(PRESET_PROGRAMS[0].id);

  if (!isOpen) return null;

  // Run assembler on source
  const { bytes, listing, errors } = assemble(sourceCode);

  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const found = PRESET_PROGRAMS.find((p) => p.id === presetId);
    if (found) {
      setSourceCode(found.code);
    }
  };

  const handleAssembleAndBurn = () => {
    if (errors.length === 0) {
      onLoadProgramToMemory(bytes);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-[#0f172a] border border-slate-700 rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-700/80 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
              <Code className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100">Micro-8 Assembly IDE & Machine Code Compiler</h2>
              <p className="text-xs text-slate-400">16-Byte RISC Architecture with conditional jumps & ALU logic</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAssembleAndBurn}
              disabled={errors.length > 0}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-lg text-xs font-semibold transition shadow-md"
            >
              <Play className="w-3.5 h-3.5" />
              Assemble & Burn to RAM
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white px-2 py-1 rounded text-sm hover:bg-slate-800 transition"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Preset Programs Bar */}
        <div className="px-5 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5 text-indigo-400" /> Presets:
          </span>
          {PRESET_PROGRAMS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleSelectPreset(preset.id)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition whitespace-nowrap ${
                selectedPresetId === preset.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {preset.name}
            </button>
          ))}
        </div>

        {/* Main Editor & Memory Map Split */}
        <div className="flex-1 grid grid-cols-2 divide-x divide-slate-800 overflow-hidden min-h-[380px]">
          {/* Left: Code Editor */}
          <div className="flex flex-col p-4 bg-[#090d14]">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold text-slate-300">Assembly Source (Micro-8 ISA)</span>
              <span className="font-mono text-[11px] text-slate-500">
                {sourceCode.split('\n').length} lines
              </span>
            </div>
            <textarea
              value={sourceCode}
              onChange={(e) => setSourceCode(e.target.value)}
              className="flex-1 w-full bg-transparent text-slate-200 font-mono text-xs leading-relaxed focus:outline-none resize-none no-scrollbar selection:bg-indigo-600 selection:text-white"
              spellCheck={false}
              placeholder="; Type Micro-8 assembly code here..."
            />
          </div>

          {/* Right: Compiled Memory Listing & ISA Reference */}
          <div className="flex flex-col p-4 bg-slate-900/50 overflow-y-auto">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold text-slate-300">Assembled Machine Code (Hex / Binary)</span>
              <span className="font-mono text-emerald-400 text-[11px]">
                {listing.length} / 16 bytes
              </span>
            </div>

            {/* Error notifications */}
            {errors.length > 0 && (
              <div className="mb-3 p-2.5 rounded-lg bg-red-950/60 border border-red-800/80 text-red-300 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Assembly Errors:</span>
                  <ul className="list-disc list-inside mt-1 space-y-0.5 font-mono text-[11px]">
                    {errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Listing Table */}
            <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/70 mb-4">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-900/80 border-b border-slate-800 text-[10px] text-slate-400">
                  <tr>
                    <th className="py-1.5 px-2.5">ADDR</th>
                    <th className="py-1.5 px-2.5">HEX</th>
                    <th className="py-1.5 px-2.5">BINARY</th>
                    <th className="py-1.5 px-2.5">SOURCE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-slate-300">
                  {listing.map((line) => (
                    <tr key={line.address} className="hover:bg-slate-900/50 transition">
                      <td className="py-1 px-2.5 text-amber-400 font-bold">0x{line.address.toString(16).toUpperCase()}</td>
                      <td className="py-1 px-2.5 text-sky-400 font-bold">0x{line.hex}</td>
                      <td className="py-1 px-2.5 text-slate-400 text-[10px]">{line.binary}</td>
                      <td className="py-1 px-2.5 text-emerald-300 text-[11px] truncate max-w-[140px]">{line.source}</td>
                    </tr>
                  ))}
                  {listing.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-500 text-xs italic">
                        No valid instructions assembled.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Micro-8 Opcode Reference Card */}
            <div className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800 text-[11px] text-slate-400">
              <span className="font-semibold text-slate-300 block mb-1">Instruction Set Architecture (ISA):</span>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 font-mono text-[10px]">
                <div><span className="text-sky-400">NOP (0x0)</span>: No operation</div>
                <div><span className="text-sky-400">LDA [m] (0x1)</span>: A = RAM[m]</div>
                <div><span className="text-sky-400">ADD [m] (0x2)</span>: A = A + RAM[m]</div>
                <div><span className="text-sky-400">SUB [m] (0x3)</span>: A = A - RAM[m]</div>
                <div><span className="text-sky-400">STA [m] (0x4)</span>: RAM[m] = A</div>
                <div><span className="text-sky-400">LDI imm (0x5)</span>: A = imm</div>
                <div><span className="text-sky-400">JMP [m] (0x6)</span>: PC = m</div>
                <div><span className="text-sky-400">JC [m] (0x7)</span>: Jump if Carry=1</div>
                <div><span className="text-sky-400">JZ [m] (0x8)</span>: Jump if Zero=1</div>
                <div><span className="text-sky-400">OUT (0x9)</span>: OUT = A</div>
                <div><span className="text-sky-400">AND [m] (0xA)</span>: A = A & RAM[m]</div>
                <div><span className="text-sky-400">OR [m] (0xB)</span>: A = A | RAM[m]</div>
                <div><span className="text-sky-400">XOR [m] (0xC)</span>: A = A ^ RAM[m]</div>
                <div><span className="text-sky-400">INC (0xD)</span>: A = A + 1</div>
                <div><span className="text-sky-400">DEC (0xE)</span>: A = A - 1</div>
                <div><span className="text-sky-400">HLT (0xF)</span>: Halt execution</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            {errors.length === 0 ? (
              <span className="text-emerald-400 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Ready to burn ({listing.length} instructions)
              </span>
            ) : (
              <span className="text-red-400 font-medium">Please fix syntax errors above</span>
            )}
          </div>
          <button
            onClick={handleAssembleAndBurn}
            disabled={errors.length > 0}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded font-medium transition"
          >
            Burn to Memory & Start CPU
          </button>
        </div>
      </div>
    </div>
  );
};
