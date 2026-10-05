/**
 * Default pin configurations, dimensions, and definitions for all circuit components
 */
import { ComponentType, Pin, CircuitComponent, ComponentData } from '../types/circuit.ts';

export function createComponentPins(type: ComponentType): { width: number; height: number; pins: Pin[] } {
  switch (type) {
    // 2-Input Gates
    case 'AND':
    case 'OR':
    case 'NAND':
    case 'NOR':
    case 'XOR':
    case 'XNOR': {
      const width = 80;
      const height = 50;
      return {
        width,
        height,
        pins: [
          { id: 'in_a', label: 'A', type: 'input', x: 0, y: 15, bits: 1, state: 0 },
          { id: 'in_b', label: 'B', type: 'input', x: 0, y: 35, bits: 1, state: 0 },
          { id: 'out_y', label: 'Y', type: 'output', x: width, y: 25, bits: 1, state: 0 },
        ],
      };
    }

    // 1-Input Gates
    case 'NOT':
    case 'BUFFER': {
      const width = 70;
      const height = 40;
      return {
        width,
        height,
        pins: [
          { id: 'in_a', label: 'A', type: 'input', x: 0, y: 20, bits: 1, state: 0 },
          { id: 'out_y', label: 'Y', type: 'output', x: width, y: 20, bits: 1, state: 0 },
        ],
      };
    }

    case 'TRI_STATE': {
      const width = 70;
      const height = 40;
      return {
        width,
        height,
        pins: [
          { id: 'in_a', label: 'IN', type: 'input', x: 0, y: 20, bits: 1, state: 0 },
          { id: 'in_en', label: 'EN', type: 'input', x: 35, y: 0, bits: 1, state: 0 },
          { id: 'out_y', label: 'OUT', type: 'output', x: width, y: 20, bits: 1, state: 'Z' },
        ],
      };
    }

    // Arithmetic
    case 'HALF_ADDER': {
      const width = 80;
      const height = 60;
      return {
        width,
        height,
        pins: [
          { id: 'in_a', label: 'A', type: 'input', x: 0, y: 20, bits: 1, state: 0 },
          { id: 'in_b', label: 'B', type: 'input', x: 0, y: 40, bits: 1, state: 0 },
          { id: 'out_sum', label: 'S', type: 'output', x: width, y: 20, bits: 1, state: 0 },
          { id: 'out_carry', label: 'C', type: 'output', x: width, y: 40, bits: 1, state: 0 },
        ],
      };
    }

    case 'FULL_ADDER': {
      const width = 90;
      const height = 70;
      return {
        width,
        height,
        pins: [
          { id: 'in_a', label: 'A', type: 'input', x: 0, y: 18, bits: 1, state: 0 },
          { id: 'in_b', label: 'B', type: 'input', x: 0, y: 35, bits: 1, state: 0 },
          { id: 'in_cin', label: 'Cin', type: 'input', x: 0, y: 52, bits: 1, state: 0 },
          { id: 'out_sum', label: 'S', type: 'output', x: width, y: 24, bits: 1, state: 0 },
          { id: 'out_cout', label: 'Cout', type: 'output', x: width, y: 46, bits: 1, state: 0 },
        ],
      };
    }

    case 'ADDER_4BIT': {
      const width = 110;
      const height = 80;
      return {
        width,
        height,
        pins: [
          { id: 'in_a', label: 'A[3:0]', type: 'input', x: 0, y: 20, bits: 4, state: 0 },
          { id: 'in_b', label: 'B[3:0]', type: 'input', x: 0, y: 45, bits: 4, state: 0 },
          { id: 'in_cin', label: 'Cin', type: 'input', x: 0, y: 65, bits: 1, state: 0 },
          { id: 'out_sum', label: 'S[3:0]', type: 'output', x: width, y: 25, bits: 4, state: 0 },
          { id: 'out_cout', label: 'Cout', type: 'output', x: width, y: 55, bits: 1, state: 0 },
        ],
      };
    }

    case 'ALU_4BIT': {
      const width = 120;
      const height = 100;
      return {
        width,
        height,
        pins: [
          { id: 'in_a', label: 'A[3:0]', type: 'input', x: 0, y: 20, bits: 4, state: 0 },
          { id: 'in_b', label: 'B[3:0]', type: 'input', x: 0, y: 45, bits: 4, state: 0 },
          { id: 'in_op', label: 'OP[2:0]', type: 'input', x: 0, y: 70, bits: 4, state: 0 },
          { id: 'in_cin', label: 'Cin', type: 'input', x: 0, y: 88, bits: 1, state: 0 },
          { id: 'out_res', label: 'RES[3:0]', type: 'output', x: width, y: 25, bits: 4, state: 0 },
          { id: 'out_cout', label: 'Cout', type: 'output', x: width, y: 50, bits: 1, state: 0 },
          { id: 'out_zero', label: 'Zero', type: 'output', x: width, y: 75, bits: 1, state: 0 },
        ],
      };
    }

    case 'MUX_2TO1': {
      const width = 80;
      const height = 60;
      return {
        width,
        height,
        pins: [
          { id: 'in_d0', label: '0', type: 'input', x: 0, y: 18, bits: 1, state: 0 },
          { id: 'in_d1', label: '1', type: 'input', x: 0, y: 42, bits: 1, state: 0 },
          { id: 'in_sel', label: 'SEL', type: 'input', x: 40, y: height, bits: 1, state: 0 },
          { id: 'out_y', label: 'Y', type: 'output', x: width, y: 30, bits: 1, state: 0 },
        ],
      };
    }

    case 'MUX_4TO1': {
      const width = 90;
      const height = 80;
      return {
        width,
        height,
        pins: [
          { id: 'in_d0', label: 'D0', type: 'input', x: 0, y: 15, bits: 1, state: 0 },
          { id: 'in_d1', label: 'D1', type: 'input', x: 0, y: 32, bits: 1, state: 0 },
          { id: 'in_d2', label: 'D2', type: 'input', x: 0, y: 49, bits: 1, state: 0 },
          { id: 'in_d3', label: 'D3', type: 'input', x: 0, y: 66, bits: 1, state: 0 },
          { id: 'in_sel', label: 'S[1:0]', type: 'input', x: 45, y: height, bits: 4, state: 0 },
          { id: 'out_y', label: 'Y', type: 'output', x: width, y: 40, bits: 1, state: 0 },
        ],
      };
    }

    case 'DEMUX_1TO4': {
      const width = 90;
      const height = 80;
      return {
        width,
        height,
        pins: [
          { id: 'in_d', label: 'IN', type: 'input', x: 0, y: 40, bits: 1, state: 0 },
          { id: 'in_sel', label: 'S[1:0]', type: 'input', x: 45, y: height, bits: 4, state: 0 },
          { id: 'out_y0', label: 'Y0', type: 'output', x: width, y: 15, bits: 1, state: 0 },
          { id: 'out_y1', label: 'Y1', type: 'output', x: width, y: 32, bits: 1, state: 0 },
          { id: 'out_y2', label: 'Y2', type: 'output', x: width, y: 49, bits: 1, state: 0 },
          { id: 'out_y3', label: 'Y3', type: 'output', x: width, y: 66, bits: 1, state: 0 },
        ],
      };
    }

    case 'COMPARATOR_4BIT': {
      const width = 100;
      const height = 70;
      return {
        width,
        height,
        pins: [
          { id: 'in_a', label: 'A[3:0]', type: 'input', x: 0, y: 22, bits: 4, state: 0 },
          { id: 'in_b', label: 'B[3:0]', type: 'input', x: 0, y: 48, bits: 4, state: 0 },
          { id: 'out_eq', label: 'A=B', type: 'output', x: width, y: 18, bits: 1, state: 0 },
          { id: 'out_gt', label: 'A>B', type: 'output', x: width, y: 35, bits: 1, state: 0 },
          { id: 'out_lt', label: 'A<B', type: 'output', x: width, y: 52, bits: 1, state: 0 },
        ],
      };
    }

    case 'DECODER_7SEG': {
      const width = 90;
      const height = 80;
      return {
        width,
        height,
        pins: [
          { id: 'in_hex', label: 'D[3:0]', type: 'input', x: 0, y: 40, bits: 4, state: 0 },
          { id: 'out_a', label: 'a', type: 'output', x: width, y: 10, bits: 1, state: 0 },
          { id: 'out_b', label: 'b', type: 'output', x: width, y: 20, bits: 1, state: 0 },
          { id: 'out_c', label: 'c', type: 'output', x: width, y: 30, bits: 1, state: 0 },
          { id: 'out_d', label: 'd', type: 'output', x: width, y: 40, bits: 1, state: 0 },
          { id: 'out_e', label: 'e', type: 'output', x: width, y: 50, bits: 1, state: 0 },
          { id: 'out_f', label: 'f', type: 'output', x: width, y: 60, bits: 1, state: 0 },
          { id: 'out_g', label: 'g', type: 'output', x: width, y: 70, bits: 1, state: 0 },
        ],
      };
    }

    // Sequential Components
    case 'D_FLIP_FLOP': {
      const width = 80;
      const height = 70;
      return {
        width,
        height,
        pins: [
          { id: 'in_d', label: 'D', type: 'input', x: 0, y: 20, bits: 1, state: 0 },
          { id: 'in_clk', label: 'CLK', type: 'input', x: 0, y: 45, bits: 1, state: 0 },
          { id: 'in_rst', label: 'RST', type: 'input', x: 40, y: height, bits: 1, state: 0 },
          { id: 'out_q', label: 'Q', type: 'output', x: width, y: 20, bits: 1, state: 0 },
          { id: 'out_qbar', label: '~Q', type: 'output', x: width, y: 50, bits: 1, state: 1 },
        ],
      };
    }

    case 'JK_FLIP_FLOP': {
      const width = 80;
      const height = 70;
      return {
        width,
        height,
        pins: [
          { id: 'in_j', label: 'J', type: 'input', x: 0, y: 18, bits: 1, state: 0 },
          { id: 'in_clk', label: 'CLK', type: 'input', x: 0, y: 35, bits: 1, state: 0 },
          { id: 'in_k', label: 'K', type: 'input', x: 0, y: 52, bits: 1, state: 0 },
          { id: 'out_q', label: 'Q', type: 'output', x: width, y: 20, bits: 1, state: 0 },
          { id: 'out_qbar', label: '~Q', type: 'output', x: width, y: 50, bits: 1, state: 1 },
        ],
      };
    }

    case 'T_FLIP_FLOP': {
      const width = 80;
      const height = 60;
      return {
        width,
        height,
        pins: [
          { id: 'in_t', label: 'T', type: 'input', x: 0, y: 20, bits: 1, state: 0 },
          { id: 'in_clk', label: 'CLK', type: 'input', x: 0, y: 40, bits: 1, state: 0 },
          { id: 'out_q', label: 'Q', type: 'output', x: width, y: 20, bits: 1, state: 0 },
          { id: 'out_qbar', label: '~Q', type: 'output', x: width, y: 40, bits: 1, state: 1 },
        ],
      };
    }

    case 'SR_LATCH': {
      const width = 80;
      const height = 60;
      return {
        width,
        height,
        pins: [
          { id: 'in_s', label: 'S', type: 'input', x: 0, y: 20, bits: 1, state: 0 },
          { id: 'in_r', label: 'R', type: 'input', x: 0, y: 40, bits: 1, state: 0 },
          { id: 'out_q', label: 'Q', type: 'output', x: width, y: 20, bits: 1, state: 0 },
          { id: 'out_qbar', label: '~Q', type: 'output', x: width, y: 40, bits: 1, state: 1 },
        ],
      };
    }

    case 'REGISTER_4BIT': {
      const width = 100;
      const height = 75;
      return {
        width,
        height,
        pins: [
          { id: 'in_d', label: 'D[3:0]', type: 'input', x: 0, y: 20, bits: 4, state: 0 },
          { id: 'in_clk', label: 'CLK', type: 'input', x: 0, y: 40, bits: 1, state: 0 },
          { id: 'in_load', label: 'LD', type: 'input', x: 0, y: 58, bits: 1, state: 0 },
          { id: 'in_oe', label: 'OE', type: 'input', x: 50, y: height, bits: 1, state: 1 },
          { id: 'out_q', label: 'Q[3:0]', type: 'output', x: width, y: 35, bits: 4, state: 0 },
        ],
      };
    }

    case 'REGISTER_8BIT': {
      const width = 110;
      const height = 80;
      return {
        width,
        height,
        pins: [
          { id: 'in_d', label: 'D[7:0]', type: 'input', x: 0, y: 20, bits: 8, state: 0 },
          { id: 'in_clk', label: 'CLK', type: 'input', x: 0, y: 42, bits: 1, state: 0 },
          { id: 'in_load', label: 'LD', type: 'input', x: 0, y: 64, bits: 1, state: 0 },
          { id: 'in_oe', label: 'OE', type: 'input', x: 55, y: height, bits: 1, state: 1 },
          { id: 'out_q', label: 'Q[7:0]', type: 'output', x: width, y: 38, bits: 8, state: 0 },
        ],
      };
    }

    case 'COUNTER_4BIT': {
      const width = 100;
      const height = 70;
      return {
        width,
        height,
        pins: [
          { id: 'in_clk', label: 'CLK', type: 'input', x: 0, y: 22, bits: 1, state: 0 },
          { id: 'in_rst', label: 'RST', type: 'input', x: 0, y: 48, bits: 1, state: 0 },
          { id: 'out_q', label: 'Q[3:0]', type: 'output', x: width, y: 25, bits: 4, state: 0 },
          { id: 'out_tc', label: 'TC', type: 'output', x: width, y: 50, bits: 1, state: 0 },
        ],
      };
    }

    // Memory
    case 'RAM_16B': {
      const width = 120;
      const height = 90;
      return {
        width,
        height,
        pins: [
          { id: 'in_addr', label: 'A[3:0]', type: 'input', x: 0, y: 20, bits: 4, state: 0 },
          { id: 'in_din', label: 'DIN[7:0]', type: 'input', x: 0, y: 45, bits: 8, state: 0 },
          { id: 'in_we', label: 'WE', type: 'input', x: 0, y: 70, bits: 1, state: 0 },
          { id: 'in_oe', label: 'OE', type: 'input', x: 60, y: height, bits: 1, state: 1 },
          { id: 'out_dout', label: 'DOUT[7:0]', type: 'output', x: width, y: 45, bits: 8, state: 0 },
        ],
      };
    }

    case 'ROM_16B': {
      const width = 110;
      const height = 75;
      return {
        width,
        height,
        pins: [
          { id: 'in_addr', label: 'A[3:0]', type: 'input', x: 0, y: 30, bits: 4, state: 0 },
          { id: 'in_oe', label: 'OE', type: 'input', x: 55, y: height, bits: 1, state: 1 },
          { id: 'out_dout', label: 'DOUT[7:0]', type: 'output', x: width, y: 38, bits: 8, state: 0 },
        ],
      };
    }

    // Micro-8 Microprocessor System / Core
    case 'CPU_MICRO8': {
      const width = 160;
      const height = 130;
      return {
        width,
        height,
        pins: [
          { id: 'in_clk', label: 'CLK', type: 'input', x: 0, y: 25, bits: 1, state: 0 },
          { id: 'in_rst', label: 'RST', type: 'input', x: 0, y: 50, bits: 1, state: 0 },
          { id: 'in_bus', label: 'BUS_IN[7:0]', type: 'input', x: 0, y: 75, bits: 8, state: 0 },
          { id: 'in_step', label: 'STEP', type: 'input', x: 0, y: 100, bits: 1, state: 0 },
          { id: 'out_bus', label: 'BUS_OUT[7:0]', type: 'output', x: width, y: 25, bits: 8, state: 0 },
          { id: 'out_addr', label: 'ADDR[3:0]', type: 'output', x: width, y: 50, bits: 4, state: 0 },
          { id: 'out_out', label: 'OUT[7:0]', type: 'output', x: width, y: 75, bits: 8, state: 0 },
          { id: 'out_hlt', label: 'HLT', type: 'output', x: width, y: 100, bits: 1, state: 0 },
          // Control bus tap on bottom
          { id: 'out_ctrl', label: 'CTRL_WORD', type: 'output', x: 80, y: height, bits: 16, state: 0 },
        ],
      };
    }

    // I/O & Indicators
    case 'SWITCH': {
      const width = 60;
      const height = 40;
      return {
        width,
        height,
        pins: [
          { id: 'out_y', label: 'Q', type: 'output', x: width, y: 20, bits: 1, state: 0 },
        ],
      };
    }

    case 'PUSH_BUTTON': {
      const width = 60;
      const height = 40;
      return {
        width,
        height,
        pins: [
          { id: 'out_y', label: 'Q', type: 'output', x: width, y: 20, bits: 1, state: 0 },
        ],
      };
    }

    case 'CLOCK': {
      const width = 65;
      const height = 45;
      return {
        width,
        height,
        pins: [
          { id: 'out_clk', label: 'CLK', type: 'output', x: width, y: 22, bits: 1, state: 0 },
        ],
      };
    }

    case 'VCC': {
      const width = 40;
      const height = 30;
      return {
        width,
        height,
        pins: [
          { id: 'out_vcc', label: '1', type: 'output', x: 20, y: height, bits: 1, state: 1 },
        ],
      };
    }

    case 'GND': {
      const width = 40;
      const height = 30;
      return {
        width,
        height,
        pins: [
          { id: 'out_gnd', label: '0', type: 'output', x: 20, y: 0, bits: 1, state: 0 },
        ],
      };
    }

    case 'LED': {
      const width = 50;
      const height = 50;
      return {
        width,
        height,
        pins: [
          { id: 'in_d', label: 'IN', type: 'input', x: 0, y: 25, bits: 1, state: 0 },
        ],
      };
    }

    case 'LED_BAR_8': {
      const width = 120;
      const height = 45;
      return {
        width,
        height,
        pins: [
          { id: 'in_bus', label: 'BUS[7:0]', type: 'input', x: 0, y: 22, bits: 8, state: 0 },
        ],
      };
    }

    case 'HEX_DISPLAY_7SEG': {
      const width = 60;
      const height = 80;
      return {
        width,
        height,
        pins: [
          { id: 'in_hex', label: 'HEX[3:0]', type: 'input', x: 0, y: 40, bits: 4, state: 0 },
        ],
      };
    }

    case 'PROBE': {
      const width = 60;
      const height = 35;
      return {
        width,
        height,
        pins: [
          { id: 'in_d', label: 'IN', type: 'input', x: 0, y: 17, bits: 1, state: 0 },
        ],
      };
    }

    case 'BUS_DISPLAY_8BIT': {
      const width = 90;
      const height = 45;
      return {
        width,
        height,
        pins: [
          { id: 'in_bus', label: 'BUS[7:0]', type: 'input', x: 0, y: 22, bits: 8, state: 0 },
        ],
      };
    }

    default: {
      return {
        width: 80,
        height: 50,
        pins: [
          { id: 'in_a', label: 'A', type: 'input', x: 0, y: 25, bits: 1, state: 0 },
          { id: 'out_y', label: 'Y', type: 'output', x: 80, y: 25, bits: 1, state: 0 },
        ],
      };
    }
  }
}

export function createNewComponent(type: ComponentType, x: number, y: number, id?: string): CircuitComponent {
  const { width, height, pins } = createComponentPins(type);
  const compId = id || `comp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const defaultData: ComponentData = {};

  if (type === 'CLOCK') {
    defaultData.frequencyHz = 2; // default 2Hz clock
  } else if (type === 'SWITCH') {
    defaultData.switchState = false;
  } else if (type === 'PUSH_BUTTON') {
    defaultData.buttonPressed = false;
  } else if (type === 'RAM_16B' || type === 'ROM_16B') {
    // 16 bytes initialized to 0
    defaultData.memory = new Array(16).fill(0);
    defaultData.ramAddress = 0;
  } else if (type === 'LED') {
    defaultData.color = '#10b981'; // emerald green
  } else if (type === 'D_FLIP_FLOP' || type === 'JK_FLIP_FLOP' || type === 'T_FLIP_FLOP') {
    defaultData.qState = 0;
    defaultData.lastClock = 0;
  } else if (type === 'COUNTER_4BIT') {
    defaultData.counterValue = 0;
    defaultData.lastClock = 0;
  } else if (type === 'REGISTER_4BIT' || type === 'REGISTER_8BIT') {
    defaultData.registerValue = 0;
    defaultData.lastClock = 0;
  } else if (type === 'CPU_MICRO8') {
    defaultData.memory = new Array(16).fill(0);
    defaultData.registerValue = 0; // A reg
  }

  return {
    id: compId,
    type,
    label: type.replace('_', ' '),
    x,
    y,
    width,
    height,
    pins,
    data: defaultData,
    isHierarchical: ['ALU_4BIT', 'ADDER_4BIT', 'FULL_ADDER', 'D_FLIP_FLOP', 'CPU_MICRO8'].includes(type),
  };
}
