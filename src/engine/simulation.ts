/**
 * Real-time Digital Logic Simulation Engine
 * Supports 4-state logic (0, 1, 'Z', 'X'), multi-bit busses,
 * edge-triggered sequential logic, and complete CPU emulation.
 */
import { CircuitComponent, CircuitSchematic, LogicState, Pin, Wire } from '../types/circuit.ts';
import { CpuState, createInitialCpuState, stepCpuMicro } from './cpu8.ts';

// 7-segment display decoding table (segments a,b,c,d,e,f,g)
export const SEVEN_SEG_DECODE: Record<number, number[]> = {
  // [a, b, c, d, e, f, g]
  0x0: [1, 1, 1, 1, 1, 1, 0],
  0x1: [0, 1, 1, 0, 0, 0, 0],
  0x2: [1, 1, 0, 1, 1, 0, 1],
  0x3: [1, 1, 1, 1, 0, 0, 1],
  0x4: [0, 1, 1, 0, 0, 1, 1],
  0x5: [1, 0, 1, 1, 0, 1, 1],
  0x6: [1, 0, 1, 1, 1, 1, 1],
  0x7: [1, 1, 1, 0, 0, 0, 0],
  0x8: [1, 1, 1, 1, 1, 1, 1],
  0x9: [1, 1, 1, 1, 0, 1, 1],
  0xa: [1, 1, 1, 0, 1, 1, 1],
  0xb: [0, 0, 1, 1, 1, 1, 1],
  0xc: [1, 0, 0, 1, 1, 1, 0],
  0xd: [0, 1, 1, 1, 1, 0, 1],
  0xe: [1, 0, 0, 1, 1, 1, 1],
  0xf: [1, 0, 0, 0, 1, 1, 1],
};

export interface SimulationContext {
  currentTimeMs: number;
  cpuStates: Record<string, CpuState>; // keyed by component ID
  clockTicks: number;
}

export function createSimulationContext(): SimulationContext {
  return {
    currentTimeMs: 0,
    cpuStates: {},
    clockTicks: 0,
  };
}

function toBit(val: LogicState | number): number {
  if (val === 1) return 1;
  if (typeof val === 'number') return val !== 0 ? 1 : 0;
  return 0;
}

function toNum(val: LogicState | number): number {
  if (typeof val === 'number') return val;
  return 0;
}

/**
 * Evaluates the outputs of a single component based on its current inputs and internal state
 */
export function evaluateComponent(
  comp: CircuitComponent,
  context: SimulationContext,
  dtMs: number
): { modified: boolean; comp: CircuitComponent } {
  const pinMap = new Map<string, Pin>();
  for (const pin of comp.pins) {
    pinMap.set(pin.id, pin);
  }

  const getIn = (id: string): LogicState | number => {
    return pinMap.get(id)?.state ?? 0;
  };

  const setOut = (id: string, state: LogicState | number) => {
    const pin = pinMap.get(id);
    if (pin && pin.state !== state) {
      pin.state = state;
    }
  };

  switch (comp.type) {
    // Basic Gates
    case 'AND': {
      const a = toBit(getIn('in_a'));
      const b = toBit(getIn('in_b'));
      setOut('out_y', (a & b) as LogicState);
      break;
    }

    case 'OR': {
      const a = toBit(getIn('in_a'));
      const b = toBit(getIn('in_b'));
      setOut('out_y', (a | b) as LogicState);
      break;
    }

    case 'NOT': {
      const a = toBit(getIn('in_a'));
      setOut('out_y', (a === 1 ? 0 : 1) as LogicState);
      break;
    }

    case 'NAND': {
      const a = toBit(getIn('in_a'));
      const b = toBit(getIn('in_b'));
      setOut('out_y', ((a & b) === 1 ? 0 : 1) as LogicState);
      break;
    }

    case 'NOR': {
      const a = toBit(getIn('in_a'));
      const b = toBit(getIn('in_b'));
      setOut('out_y', ((a | b) === 1 ? 0 : 1) as LogicState);
      break;
    }

    case 'XOR': {
      const a = toBit(getIn('in_a'));
      const b = toBit(getIn('in_b'));
      setOut('out_y', (a ^ b) as LogicState);
      break;
    }

    case 'XNOR': {
      const a = toBit(getIn('in_a'));
      const b = toBit(getIn('in_b'));
      setOut('out_y', ((a ^ b) === 1 ? 0 : 1) as LogicState);
      break;
    }

    case 'BUFFER': {
      setOut('out_y', getIn('in_a'));
      break;
    }

    case 'TRI_STATE': {
      const en = toBit(getIn('in_en'));
      if (en === 1) {
        setOut('out_y', getIn('in_a'));
      } else {
        setOut('out_y', 'Z');
      }
      break;
    }

    // Arithmetic
    case 'HALF_ADDER': {
      const a = toBit(getIn('in_a'));
      const b = toBit(getIn('in_b'));
      setOut('out_sum', (a ^ b) as LogicState);
      setOut('out_carry', (a & b) as LogicState);
      break;
    }

    case 'FULL_ADDER': {
      const a = toBit(getIn('in_a'));
      const b = toBit(getIn('in_b'));
      const cin = toBit(getIn('in_cin'));
      const sum = a ^ b ^ cin;
      const cout = (a & b) | (cin & (a ^ b));
      setOut('out_sum', sum as LogicState);
      setOut('out_cout', cout as LogicState);
      break;
    }

    case 'ADDER_4BIT': {
      const a = toNum(getIn('in_a')) & 0x0f;
      const b = toNum(getIn('in_b')) & 0x0f;
      const cin = toBit(getIn('in_cin'));
      const total = a + b + cin;
      setOut('out_sum', total & 0x0f);
      setOut('out_cout', (total > 0x0f ? 1 : 0) as LogicState);
      break;
    }

    case 'ALU_4BIT': {
      const a = toNum(getIn('in_a')) & 0x0f;
      const b = toNum(getIn('in_b')) & 0x0f;
      const op = toNum(getIn('in_op')) & 0x07;
      const cin = toBit(getIn('in_cin'));

      let res = 0;
      let cout = 0;

      switch (op) {
        case 0: // ADD
          res = a + b + cin;
          cout = res > 15 ? 1 : 0;
          res = res & 15;
          break;
        case 1: // SUB
          res = a - b - cin;
          cout = res >= 0 ? 1 : 0;
          res = (res + 16) & 15;
          break;
        case 2: // AND
          res = a & b;
          break;
        case 3: // OR
          res = a | b;
          break;
        case 4: // XOR
          res = a ^ b;
          break;
        case 5: // NOT A
          res = (~a) & 15;
          break;
        case 6: // PASS A
          res = a;
          break;
        case 7: // ZERO
          res = 0;
          break;
      }

      setOut('out_res', res);
      setOut('out_cout', cout as LogicState);
      setOut('out_zero', (res === 0 ? 1 : 0) as LogicState);
      break;
    }

    case 'MUX_2TO1': {
      const sel = toBit(getIn('in_sel'));
      const val = sel === 1 ? getIn('in_d1') : getIn('in_d0');
      setOut('out_y', val);
      break;
    }

    case 'MUX_4TO1': {
      const sel = toNum(getIn('in_sel')) & 0x03;
      const d = [getIn('in_d0'), getIn('in_d1'), getIn('in_d2'), getIn('in_d3')];
      setOut('out_y', d[sel] ?? 0);
      break;
    }

    case 'DEMUX_1TO4': {
      const val = getIn('in_d');
      const sel = toNum(getIn('in_sel')) & 0x03;
      setOut('out_y0', sel === 0 ? val : 0);
      setOut('out_y1', sel === 1 ? val : 0);
      setOut('out_y2', sel === 2 ? val : 0);
      setOut('out_y3', sel === 3 ? val : 0);
      break;
    }

    case 'COMPARATOR_4BIT': {
      const a = toNum(getIn('in_a')) & 0x0f;
      const b = toNum(getIn('in_b')) & 0x0f;
      setOut('out_eq', (a === b ? 1 : 0) as LogicState);
      setOut('out_gt', (a > b ? 1 : 0) as LogicState);
      setOut('out_lt', (a < b ? 1 : 0) as LogicState);
      break;
    }

    case 'DECODER_7SEG': {
      const hex = toNum(getIn('in_hex')) & 0x0f;
      const segments = SEVEN_SEG_DECODE[hex] || [0, 0, 0, 0, 0, 0, 0];
      setOut('out_a', segments[0] as LogicState);
      setOut('out_b', segments[1] as LogicState);
      setOut('out_c', segments[2] as LogicState);
      setOut('out_d', segments[3] as LogicState);
      setOut('out_e', segments[4] as LogicState);
      setOut('out_f', segments[5] as LogicState);
      setOut('out_g', segments[6] as LogicState);
      break;
    }

    // Sequential Components (Flip-Flops & Registers)
    case 'D_FLIP_FLOP': {
      const clk = toBit(getIn('in_clk'));
      const rst = toBit(getIn('in_rst'));
      const d = toBit(getIn('in_d'));
      const lastClk = comp.data.lastClock ?? 0;

      if (rst === 1) {
        comp.data.qState = 0;
      } else if (lastClk === 0 && clk === 1) {
        // Positive edge
        comp.data.qState = d;
      }
      comp.data.lastClock = clk;

      const q = comp.data.qState ?? 0;
      setOut('out_q', q as LogicState);
      setOut('out_qbar', (q === 1 ? 0 : 1) as LogicState);
      break;
    }

    case 'JK_FLIP_FLOP': {
      const clk = toBit(getIn('in_clk'));
      const j = toBit(getIn('in_j'));
      const k = toBit(getIn('in_k'));
      const lastClk = comp.data.lastClock ?? 0;
      let q = comp.data.qState ?? 0;

      if (lastClk === 0 && clk === 1) {
        if (j === 1 && k === 1) {
          q = q === 1 ? 0 : 1;
        } else if (j === 1) {
          q = 1;
        } else if (k === 1) {
          q = 0;
        }
        comp.data.qState = q;
      }
      comp.data.lastClock = clk;

      setOut('out_q', q as LogicState);
      setOut('out_qbar', (q === 1 ? 0 : 1) as LogicState);
      break;
    }

    case 'T_FLIP_FLOP': {
      const clk = toBit(getIn('in_clk'));
      const t = toBit(getIn('in_t'));
      const lastClk = comp.data.lastClock ?? 0;
      let q = comp.data.qState ?? 0;

      if (lastClk === 0 && clk === 1) {
        if (t === 1) {
          q = q === 1 ? 0 : 1;
        }
        comp.data.qState = q;
      }
      comp.data.lastClock = clk;

      setOut('out_q', q as LogicState);
      setOut('out_qbar', (q === 1 ? 0 : 1) as LogicState);
      break;
    }

    case 'SR_LATCH': {
      const s = toBit(getIn('in_s'));
      const r = toBit(getIn('in_r'));
      let q = comp.data.qState ?? 0;

      if (s === 1 && r === 1) {
        setOut('out_q', 'X');
        setOut('out_qbar', 'X');
      } else if (s === 1) {
        comp.data.qState = 1;
        setOut('out_q', 1);
        setOut('out_qbar', 0);
      } else if (r === 1) {
        comp.data.qState = 0;
        setOut('out_q', 0);
        setOut('out_qbar', 1);
      } else {
        setOut('out_q', q as LogicState);
        setOut('out_qbar', (q === 1 ? 0 : 1) as LogicState);
      }
      break;
    }

    case 'REGISTER_4BIT': {
      const clk = toBit(getIn('in_clk'));
      const load = toBit(getIn('in_load'));
      const oe = toBit(getIn('in_oe'));
      const d = toNum(getIn('in_d')) & 0x0f;
      const lastClk = comp.data.lastClock ?? 0;

      if (lastClk === 0 && clk === 1 && load === 1) {
        comp.data.registerValue = d;
      }
      comp.data.lastClock = clk;

      const q = comp.data.registerValue ?? 0;
      setOut('out_q', oe === 1 ? q : 'Z');
      break;
    }

    case 'REGISTER_8BIT': {
      const clk = toBit(getIn('in_clk'));
      const load = toBit(getIn('in_load'));
      const oe = toBit(getIn('in_oe'));
      const d = toNum(getIn('in_d')) & 0xff;
      const lastClk = comp.data.lastClock ?? 0;

      if (lastClk === 0 && clk === 1 && load === 1) {
        comp.data.registerValue = d;
      }
      comp.data.lastClock = clk;

      const q = comp.data.registerValue ?? 0;
      setOut('out_q', oe === 1 ? q : 'Z');
      break;
    }

    case 'COUNTER_4BIT': {
      const clk = toBit(getIn('in_clk'));
      const rst = toBit(getIn('in_rst'));
      const lastClk = comp.data.lastClock ?? 0;
      let count = comp.data.counterValue ?? 0;

      if (rst === 1) {
        count = 0;
      } else if (lastClk === 0 && clk === 1) {
        count = (count + 1) & 0x0f;
      }
      comp.data.counterValue = count;
      comp.data.lastClock = clk;

      setOut('out_q', count);
      setOut('out_tc', (count === 15 ? 1 : 0) as LogicState);
      break;
    }

    // Memory
    case 'RAM_16B': {
      const addr = toNum(getIn('in_addr')) & 0x0f;
      const din = toNum(getIn('in_din')) & 0xff;
      const we = toBit(getIn('in_we'));
      const oe = toBit(getIn('in_oe'));

      if (!comp.data.memory) {
        comp.data.memory = new Array(16).fill(0);
      }

      if (we === 1) {
        comp.data.memory[addr] = din;
      }

      comp.data.ramAddress = addr;
      const val = comp.data.memory[addr] ?? 0;
      setOut('out_dout', oe === 1 ? val : 'Z');
      break;
    }

    case 'ROM_16B': {
      const addr = toNum(getIn('in_addr')) & 0x0f;
      const oe = toBit(getIn('in_oe'));
      if (!comp.data.memory) {
        comp.data.memory = new Array(16).fill(0);
      }
      const val = comp.data.memory[addr] ?? 0;
      setOut('out_dout', oe === 1 ? val : 'Z');
      break;
    }

    // Complete Micro-8 CPU
    case 'CPU_MICRO8': {
      let cpuState = context.cpuStates[comp.id];
      if (!cpuState) {
        cpuState = createInitialCpuState();
        context.cpuStates[comp.id] = cpuState;
      }

      if (!comp.data.memory) {
        comp.data.memory = new Array(16).fill(0);
      }

      const clk = toBit(getIn('in_clk'));
      const rst = toBit(getIn('in_rst'));
      const lastClk = comp.data.lastClock ?? 0;

      if (rst === 1) {
        context.cpuStates[comp.id] = createInitialCpuState();
        cpuState = context.cpuStates[comp.id];
      } else if (lastClk === 0 && clk === 1 && !cpuState.halted) {
        // Step one micro-op on rising edge
        const res = stepCpuMicro(cpuState, comp.data.memory);
        cpuState = res.state;
        comp.data.memory = res.memory;
        context.cpuStates[comp.id] = cpuState;
      }

      comp.data.lastClock = clk;
      comp.data.registerValue = cpuState.a;

      setOut('out_bus', cpuState.bus);
      setOut('out_addr', cpuState.mar);
      setOut('out_out', cpuState.out);
      setOut('out_hlt', (cpuState.halted ? 1 : 0) as LogicState);
      setOut('out_ctrl', cpuState.controlWord);
      break;
    }

    // Input / Clock / Constant generators
    case 'SWITCH': {
      const val = comp.data.switchState ? 1 : 0;
      setOut('out_y', val as LogicState);
      break;
    }

    case 'PUSH_BUTTON': {
      const val = comp.data.buttonPressed ? 1 : 0;
      setOut('out_y', val as LogicState);
      break;
    }

    case 'CLOCK': {
      const freq = comp.data.frequencyHz ?? 2;
      // Period in ms = 1000 / freq. High for half period, low for half
      const periodMs = 1000 / Math.max(0.1, freq);
      const phase = (context.currentTimeMs % periodMs) / periodMs;
      const clkVal = phase < 0.5 ? 1 : 0;
      setOut('out_clk', clkVal as LogicState);
      break;
    }

    case 'VCC': {
      setOut('out_vcc', 1);
      break;
    }

    case 'GND': {
      setOut('out_gnd', 0);
      break;
    }

    // Sinks & Displays
    case 'LED': {
      const val = toBit(getIn('in_d'));
      comp.data.hexValue = val;
      break;
    }

    case 'LED_BAR_8': {
      const val = toNum(getIn('in_bus')) & 0xff;
      comp.data.hexValue = val;
      break;
    }

    case 'HEX_DISPLAY_7SEG': {
      const val = toNum(getIn('in_hex')) & 0x0f;
      comp.data.hexValue = val;
      break;
    }

    case 'BUS_DISPLAY_8BIT': {
      const val = toNum(getIn('in_bus')) & 0xff;
      comp.data.hexValue = val;
      break;
    }

    case 'PROBE': {
      comp.data.hexValue = toNum(getIn('in_d'));
      break;
    }
  }

  return { modified: true, comp };
}

/**
 * Propagate wires: transfer output pin states to connected input pin states
 */
export function propagateWires(schematic: CircuitSchematic): boolean {
  let anyChanged = false;

  const compMap = new Map<string, CircuitComponent>();
  for (const comp of schematic.components) {
    compMap.set(comp.id, comp);
  }

  for (const wire of schematic.wires) {
    const fromComp = compMap.get(wire.fromComponentId);
    const toComp = compMap.get(wire.toComponentId);
    if (!fromComp || !toComp) continue;

    const fromPin = fromComp.pins.find((p) => p.id === wire.fromPinId);
    const toPin = toComp.pins.find((p) => p.id === wire.toPinId);
    if (!fromPin || !toPin) continue;

    // Update wire state
    wire.state = fromPin.state;

    // If source is High-Z ('Z'), do not overwrite if other driver exists, or default to 0
    if (fromPin.state !== toPin.state) {
      toPin.state = fromPin.state;
      anyChanged = true;
    }
  }

  return anyChanged;
}

/**
 * Full Simulation Tick:
 * Updates time, evaluates components, propagates wires until convergence or max iterations
 */
export function tickSimulation(
  schematic: CircuitSchematic,
  context: SimulationContext,
  dtMs: number
): { schematic: CircuitSchematic; context: SimulationContext } {
  context.currentTimeMs += dtMs;
  context.clockTicks++;

  const maxIterations = 8;
  for (let iter = 0; iter < maxIterations; iter++) {
    for (const comp of schematic.components) {
      evaluateComponent(comp, context, dtMs);
    }
    const changed = propagateWires(schematic);
    if (!changed) break;
  }

  return { schematic, context };
}
