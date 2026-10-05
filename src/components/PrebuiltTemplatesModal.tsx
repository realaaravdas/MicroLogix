import React from 'react';
import { TEMPLATES, TemplateDefinition } from '../engine/templates.ts';
import { CircuitSchematic } from '../types/circuit.ts';
import { Cpu, Layers, Binary, Zap, ArrowRight } from 'lucide-react';

interface PrebuiltTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (schematic: CircuitSchematic) => void;
}

export const PrebuiltTemplatesModal: React.FC<PrebuiltTemplatesModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
}) => {
  if (!isOpen) return null;

  const getCategoryIcon = (category: TemplateDefinition['category']) => {
    switch (category) {
      case 'microprocessor':
        return <Cpu className="w-4 h-4 text-sky-400" />;
      case 'arithmetic':
        return <Binary className="w-4 h-4 text-emerald-400" />;
      case 'sequential':
        return <Layers className="w-4 h-4 text-purple-400" />;
      case 'gate-level':
        return <Zap className="w-4 h-4 text-amber-400" />;
    }
  };

  const getComplexityBadge = (complexity: TemplateDefinition['complexity']) => {
    switch (complexity) {
      case 'Beginner':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'Intermediate':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'Advanced':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#0f172a] border border-slate-700 rounded-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between bg-slate-900/60">
          <div>
            <h2 className="text-base font-semibold text-slate-100">Hardware Schematic Templates</h2>
            <p className="text-xs text-slate-400">Step down from gate-level logic to complete microprocessor architectures</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white px-2 py-1 rounded text-sm hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Template Cards List */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {TEMPLATES.map((tmpl) => (
            <div
              key={tmpl.id}
              onClick={() => {
                onSelectTemplate(tmpl.create());
                onClose();
              }}
              className="group p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 hover:border-indigo-500/50 cursor-pointer transition flex items-center justify-between"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700/80 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition">
                  {getCategoryIcon(tmpl.category)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-200 group-hover:text-white transition">
                      {tmpl.name}
                    </h3>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${getComplexityBadge(
                        tmpl.complexity
                      )}`}
                    >
                      {tmpl.complexity}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{tmpl.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-1 text-slate-500 group-hover:text-indigo-400 font-medium text-xs ml-4 shrink-0 transition">
                <span>Load</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
