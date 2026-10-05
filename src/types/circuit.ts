/**
 * Types and interfaces for MicroLogic CAD & Logic Emulator
 */

export type LogicState = 0 | 1 | 'Z' | 'X';

export type ComponentCategory =
  | 'gates'
  | 'arithmetic'
  | 'sequential'
  | 'memory'
  | 'cpu'
  | 'io';

export type ComponentType =
  // Basic Gates
  | 'AND'
  | 'OR'
  | 'NOT'
  | 'NAND'
  | 'NOR'
  | 'XOR'
  | 'XNOR'
  | 'BUFFER'
  | 'TRI_STATE'
  // Combinational / Arithmetic
  | 'HALF_ADDER'
  | 'FULL_ADDER'
  | 'ADDER_4BIT'
  | 'ALU_4BIT'
  | 'MUX_2TO1'
  | 'MUX_4TO1'
  | 'DEMUX_1TO4'
  | 'COMPARATOR_4BIT'
  | 'DECODER_7SEG'
  // Sequential
  | 'D_FLIP_FLOP'
  | 'JK_FLIP_FLOP'
  | 'T_FLIP_FLOP'
  | 'SR_LATCH'
  | 'REGISTER_4BIT'
  | 'REGISTER_8BIT'
  | 'COUNTER_4BIT'
  // Memory
  | 'RAM_16B'
  | 'ROM_16B'
  // Microprocessor
  | 'CPU_MICRO8'
  // I/O & Indicators
  | 'SWITCH'
  | 'PUSH_BUTTON'
  | 'CLOCK'
  | 'VCC'
  | 'GND'
  | 'LED'
  | 'LED_BAR_8'
  | 'HEX_DISPLAY_7SEG'
  | 'PROBE'
  | 'BUS_DISPLAY_8BIT';

export interface Pin {
  id: string;
  label: string;
  type: 'input' | 'output' | 'bidir';
  // Position relative to component origin
  x: number;
  y: number;
  bits: number; // 1 for single wire, 4, 8, or 16 for bus
  state: LogicState | number;
}

export interface ComponentData {
  // Configurable options
  frequencyHz?: number; // for Clock
  switchState?: boolean; // for Switch
  buttonPressed?: boolean; // for Push Button
  memory?: number[]; // for RAM/ROM
  ramAddress?: number;
  hexValue?: number; // for displays
  bits?: number;
  label?: string;
  color?: string;
  // Internal state for sequential logic
  qState?: number;
  lastClock?: LogicState | number;
  counterValue?: number;
  registerValue?: number;
  // Sub-circuit ID if drillable
  subCircuitId?: string;
}

export interface CircuitComponent {
  id: string;
  type: ComponentType;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pins: Pin[];
  data: ComponentData;
  isHierarchical?: boolean;
}

export interface WirePoint {
  x: number;
  y: number;
}

export interface Wire {
  id: string;
  fromComponentId: string;
  fromPinId: string;
  toComponentId: string;
  toPinId: string;
  points?: WirePoint[];
  bits?: number;
  state: LogicState | number;
}

export interface CircuitSchematic {
  id: string;
  name: string;
  description: string;
  components: CircuitComponent[];
  wires: Wire[];
  createdAt?: string;
  updatedAt?: string;
}

export interface LogicAnalyzerSample {
  cycle: number;
  timestamp: number;
  signals: Record<string, number | LogicState>;
}

export interface LogicAnalyzerChannel {
  id: string;
  label: string;
  color: string;
  type: 'bit' | 'bus';
  bits: number;
  componentId?: string;
  pinId?: string;
}
