import React, { useState } from 'react';
import { ComponentCategory, ComponentType } from '../types/circuit.ts';
import {
  Cpu,
  Layers,
  Search,
  Zap,
  ToggleLeft,
  CircleDot,
  Clock,
  Radio,
  Sliders,
  Grid,
  ChevronRight,
  Database,
  Binary,
} from 'lucide-react';

interface ComponentDefinition {
  type: ComponentType;
  label: string;
  category: ComponentCategory;
  description: string;
  pins: string;
  symbol: string;
}

export const LIBRARY_COMPONENTS: ComponentDefinition[] = [
  // Basic Logic Gates
  {
    type: 'AND',
    label: 'AND Gate',
    category: 'gates',
    description: 'Outputs 1 only when all inputs A and B are 1.',
    pins: '2 In, 1 Out',
    symbol: '&',
  },
  {
    type: 'OR',
    label: 'OR Gate',
    category: 'gates',
    description: 'Outputs 1 when at least one input A or B is 1.',
    pins: '2 In, 1 Out',
    symbol: '≥1',
  },
  {
    type: 'NOT',
    label: 'NOT Inverter',
    category: 'gates',
    description: 'Inverts input logic level (0 → 1, 1 → 0).',
    pins: '1 In, 1 Out',
    symbol: '1',
  },
  {
    type: 'NAND',
    label: 'NAND Gate',
    category: 'gates',
    description: 'Universal gate: inverts AND output.',
    pins: '2 In, 1 Out',
    symbol: '!&',
  },
  {
    type: 'NOR',
    label: 'NOR Gate',
    category: 'gates',
    description: 'Universal gate: inverts OR output.',
    pins: '2 In, 1 Out',
    symbol: '!≥1',
  },
  {
    type: 'XOR',
    label: 'XOR Gate',
    category: 'gates',
    description: 'Exclusive OR: outputs 1 when inputs differ.',
    pins: '2 In, 1 Out',
    symbol: '=1',
  },
  {
    type: 'XNOR',
    label: 'XNOR Gate',
    category: 'gates',
    description: 'Equivalence gate: outputs 1 when inputs are equal.',
    pins: '2 In, 1 Out',
    symbol: '!=1',
  },
  {
    type: 'TRI_STATE',
    label: 'Tri-State Buffer',
    category: 'gates',
    description: 'Passes signal when EN is 1, else high-impedance Z.',
    pins: 'IN, EN, OUT',
    symbol: 'TRI',
  },

  // Sequential & Latches
  {
    type: 'D_FLIP_FLOP',
    label: 'D Flip-Flop',
    category: 'sequential',
    description: 'Edge-triggered data latch (D, CLK, RST, Q, ~Q).',
    pins: 'D, CLK, RST → Q, ~Q',
    symbol: 'D-FF',
  },
  {
    type: 'SR_LATCH',
    label: 'SR Latch',
    category: 'sequential',
    description: 'Bistable set-reset multivibrator latch.',
    pins: 'S, R → Q, ~Q',
    symbol: 'SR',
  },
  {
    type: 'JK_FLIP_FLOP',
    label: 'JK Flip-Flop',
    category: 'sequential',
    description: 'Universal toggle/set/reset edge-triggered FF.',
    pins: 'J, CLK, K → Q, ~Q',
    symbol: 'JK',
  },
  {
    type: 'T_FLIP_FLOP',
    label: 'T Flip-Flop',
    category: 'sequential',
    description: 'Toggle flip-flop for binary counters & dividers.',
    pins: 'T, CLK → Q, ~Q',
    symbol: 'T-FF',
  },
  {
    type: 'REGISTER_4BIT',
    label: '4-Bit Register',
    category: 'sequential',
    description: 'Parallel 4-bit data register with Load and OE enable.',
    pins: 'D[3:0], CLK, LD, OE → Q',
    symbol: 'REG-4',
  },
  {
    type: 'REGISTER_8BIT',
    label: '8-Bit Register',
    category: 'sequential',
    description: 'Parallel 8-bit CPU register with bus output.',
    pins: 'D[7:0], CLK, LD, OE → Q',
    symbol: 'REG-8',
  },
  {
    type: 'COUNTER_4BIT',
    label: '4-Bit Counter',
    category: 'sequential',
    description: 'Synchronous 4-bit binary counter with Terminal Count.',
    pins: 'CLK, RST → Q[3:0], TC',
    symbol: 'CNT-4',
  },

  // Combinational & Arithmetic
  {
    type: 'HALF_ADDER',
    label: 'Half Adder',
    category: 'arithmetic',
    description: 'Adds 2 single-bit inputs, outputs Sum and Carry.',
    pins: 'A, B → Sum, Carry',
    symbol: 'HA',
  },
  {
    type: 'FULL_ADDER',
    label: 'Full Adder',
    category: 'arithmetic',
    description: 'Adds 2 bits plus Carry-In, outputs Sum and Carry-Out.',
    pins: 'A, B, Cin → Sum, Cout',
    symbol: 'FA',
  },
  {
    type: 'ADDER_4BIT',
    label: '4-Bit Adder',
    category: 'arithmetic',
    description: '4-bit parallel ripple-carry binary adder.',
    pins: 'A[3:0], B[3:0], Cin → S[3:0], Cout',
    symbol: '+4',
  },
  {
    type: 'ALU_4BIT',
    label: '4-Bit ALU',
    category: 'arithmetic',
    description: 'Arithmetic Logic Unit: ADD, SUB, AND, OR, XOR, NOT.',
    pins: 'A[3:0], B[3:0], OP[2:0] → Res, Cout, Z',
    symbol: 'ALU',
  },
  {
    type: 'MUX_2TO1',
    label: '2:1 Multiplexer',
    category: 'arithmetic',
    description: 'Selects between 2 data inputs using 1 select bit.',
    pins: 'D0, D1, SEL → Y',
    symbol: 'MUX',
  },
  {
    type: 'COMPARATOR_4BIT',
    label: '4-Bit Comparator',
    category: 'arithmetic',
    description: 'Compares two 4-bit numbers (A=B, A>B, A<B).',
    pins: 'A[3:0], B[3:0] → EQ, GT, LT',
    symbol: 'CMP',
  },
  {
    type: 'DECODER_7SEG',
    label: '7-Segment Decoder',
    category: 'arithmetic',
    description: 'Decodes 4-bit hexadecimal number to 7 display segments.',
    pins: 'Hex[3:0] → a,b,c,d,e,f,g',
    symbol: '7DEC',
  },

  // I/O & Testing Pins
  {
    type: 'SWITCH',
    label: 'Toggle Switch',
    category: 'io',
    description: 'Interactive manual toggle switch (Logic 0 / Logic 1).',
    pins: 'Output Q',
    symbol: 'SW',
  },
  {
    type: 'PUSH_BUTTON',
    label: 'Push Button',
    category: 'io',
    description: 'Momentary contact tactile button (High when held).',
    pins: 'Output Q',
    symbol: 'BTN',
  },
  {
    type: 'CLOCK',
    label: 'Clock Generator',
    category: 'io',
    description: 'Oscillating square-wave clock pulse with adjustable Hz.',
    pins: 'Output CLK',
    symbol: 'CLK',
  },
  {
    type: 'LED',
    label: 'LED Indicator',
    category: 'io',
    description: 'Visual logic level indicator diode (lights up when 1).',
    pins: 'Input IN',
    symbol: 'LED',
  },
  {
    type: 'LED_BAR_8',
    label: '8-Bit LED Bar',
    category: 'io',
    description: 'Displays 8-bit bus values across 8 colored diodes.',
    pins: 'Input BUS[7:0]',
    symbol: 'BAR8',
  },
  {
    type: 'HEX_DISPLAY_7SEG',
    label: '7-Segment Display',
    category: 'io',
    description: 'Hexadecimal digital readout (0x0 to 0xF).',
    pins: 'Input HEX[3:0]',
    symbol: 'HEX',
  },
  {
    type: 'BUS_DISPLAY_8BIT',
    label: '8-Bit Bus Monitor',
    category: 'io',
    description: 'Monitors 8-bit bus with simultaneous Hex and Decimal.',
    pins: 'Input BUS[7:0]',
    symbol: 'BUS',
  },
  {
    type: 'VCC',
    label: 'VCC (+5V)',
    category: 'io',
    description: 'Constant Logic 1 / High voltage source.',
    pins: 'Output 1',
    symbol: 'VCC',
  },
  {
    type: 'GND',
    label: 'Ground (0V)',
    category: 'io',
    description: 'Constant Logic 0 / Low voltage ground reference.',
    pins: 'Output 0',
    symbol: 'GND',
  },

  // CPU & Memory
  {
    type: 'CPU_MICRO8',
    label: 'Micro-8 CPU Core',
    category: 'cpu',
    description: 'Complete 8-bit microprocessor with internal ALU, registers, and sequencer.',
    pins: 'CLK, RST, BUS_IN → BUS_OUT, ADDR, OUT, HLT',
    symbol: 'CPU8',
  },
  {
    type: 'RAM_16B',
    label: '16-Byte RAM',
    category: 'memory',
    description: 'Static random-access memory matrix with WE and OE control.',
    pins: 'ADDR[3:0], DIN[7:0], WE, OE → DOUT',
    symbol: 'RAM',
  },
];

interface ComponentLibraryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onAddComponent: (type: ComponentType) => void;
}

export const ComponentLibraryDrawer: React.FC<ComponentLibraryDrawerProps> = ({
  isOpen,
  onClose,
  onAddComponent,
}) => {
  const [activeCategory, setActiveCategory] = useState<ComponentCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const categories: { id: ComponentCategory | 'all'; label: string; icon: any }[] = [
    { id: 'all', label: 'All', icon: Grid },
    { id: 'gates', label: 'Logic Gates', icon: Zap },
    { id: 'sequential', label: 'Flip-Flops & Latches', icon: Layers },
    { id: 'arithmetic', label: 'Adders & ALU', icon: Binary },
    { id: 'io', label: 'I/O & Test Pins', icon: ToggleLeft },
    { id: 'cpu', label: 'Microprocessor', icon: Cpu },
    { id: 'memory', label: 'Memory', icon: Database },
  ];

  const filteredComponents = LIBRARY_COMPONENTS.filter((comp) => {
    const matchesCategory = activeCategory === 'all' || comp.category === activeCategory;
    const matchesSearch =
      comp.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comp.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comp.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="absolute top-14 left-0 bottom-0 w-80 bg-[#0f172a]/95 backdrop-blur-md border-r border-slate-700/80 z-20 flex flex-col shadow-2xl transition-all">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-700/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Component Library</h2>
            <p className="text-[10px] text-slate-400">Click or drag onto canvas</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-200 text-xs px-2 py-1 rounded hover:bg-slate-800 transition"
        >
          ✕
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-3 border-b border-slate-800">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search gates, flip-flops, ALU..."
            className="w-full bg-slate-900 border border-slate-700/70 rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="px-2 py-2 flex items-center gap-1 overflow-x-auto border-b border-slate-800 no-scrollbar">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] whitespace-nowrap font-medium transition ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3 h-3" />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Components List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {filteredComponents.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            No components match &quot;{searchQuery}&quot;
          </div>
        ) : (
          filteredComponents.map((comp) => (
            <div
              key={comp.type}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', comp.type);
              }}
              onClick={() => onAddComponent(comp.type)}
              className="group p-2.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 hover:border-indigo-500/50 cursor-pointer transition flex items-center justify-between select-none shadow-sm"
            >
              <div className="flex items-center gap-3">
                {/* Circuit Badge / Symbol */}
                <div className="w-9 h-9 rounded bg-[#1e293b] border border-slate-700/80 flex items-center justify-center font-mono font-bold text-xs text-indigo-400 group-hover:text-indigo-300 group-hover:border-indigo-400 transition shadow-inner">
                  {comp.symbol}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-200 group-hover:text-white transition">
                      {comp.label}
                    </span>
                    <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700/50">
                      {comp.type}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{comp.description}</p>
                  <p className="text-[9px] font-mono text-emerald-400/80 mt-0.5">{comp.pins}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition" />
            </div>
          ))
        )}
      </div>

      {/* Footer Info */}
      <div className="p-2.5 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between bg-slate-900/40">
        <span>{filteredComponents.length} components available</span>
        <span className="font-mono text-indigo-400">MicroLogic CAD</span>
      </div>
    </div>
  );
};
