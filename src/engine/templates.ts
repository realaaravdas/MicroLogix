/**
 * Pre-built Circuit Templates
 * Demonstrates stepping down from gate-level operations (AND, OR, NAND, Flip-Flops)
 * to emulating an entire custom 8-bit microprocessor running machine code.
 */
import { CircuitSchematic, CircuitComponent, Wire } from '../types/circuit.ts';
import { createNewComponent } from './pinLayouts.ts';
import { assemble, PRESET_PROGRAMS } from './cpu8.ts';

export interface TemplateDefinition {
  id: string;
  name: string;
  category: 'gate-level' | 'arithmetic' | 'sequential' | 'microprocessor';
  description: string;
  complexity: 'Beginner' | 'Intermediate' | 'Advanced';
  create: () => CircuitSchematic;
}

export const TEMPLATES: TemplateDefinition[] = [
  {
    id: 'micro8-computer',
    name: 'Micro-8 8-Bit Computer System',
    category: 'microprocessor',
    description: 'Complete 8-bit breadboard computer architecture with CPU, Clock, RAM, 7-Segment Hex Display, and Bus Monitor running the Fibonacci machine code program.',
    complexity: 'Advanced',
    create: () => {
      const fibProg = PRESET_PROGRAMS[0];
      const { bytes } = assemble(fibProg.code);

      // Components
      const clock = createNewComponent('CLOCK', 80, 160, 'clk_1');
      clock.data.frequencyHz = 2;

      const runSwitch = createNewComponent('SWITCH', 80, 260, 'sw_rst');
      runSwitch.label = 'RESET';

      const cpu = createNewComponent('CPU_MICRO8', 260, 140, 'cpu_1');
      cpu.label = 'Micro-8 CPU';
      cpu.data.memory = [...bytes];

      const ram = createNewComponent('RAM_16B', 520, 140, 'ram_1');
      ram.label = 'RAM (16 Bytes)';
      ram.data.memory = [...bytes];

      const outDisplay = createNewComponent('HEX_DISPLAY_7SEG', 520, 300, 'hex_out');
      outDisplay.label = 'OUT (Hex)';

      const ledBar = createNewComponent('LED_BAR_8', 630, 310, 'led_bar');
      ledBar.label = 'OUT (Bits)';

      const busMonitor = createNewComponent('BUS_DISPLAY_8BIT', 290, 340, 'bus_mon');
      busMonitor.label = 'Data Bus';

      const hltLed = createNewComponent('LED', 520, 80, 'led_hlt');
      hltLed.label = 'HALT';
      hltLed.data.color = '#ef4444'; // red

      const components: CircuitComponent[] = [clock, runSwitch, cpu, ram, outDisplay, ledBar, busMonitor, hltLed];

      // Wires
      const wires: Wire[] = [
        // Clock -> CPU
        {
          id: 'w_clk',
          fromComponentId: 'clk_1',
          fromPinId: 'out_clk',
          toComponentId: 'cpu_1',
          toPinId: 'in_clk',
          state: 0,
        },
        // Reset switch -> CPU
        {
          id: 'w_rst',
          fromComponentId: 'sw_rst',
          fromPinId: 'out_y',
          toComponentId: 'cpu_1',
          toPinId: 'in_rst',
          state: 0,
        },
        // CPU ADDR -> RAM ADDR
        {
          id: 'w_addr',
          fromComponentId: 'cpu_1',
          fromPinId: 'out_addr',
          toComponentId: 'ram_1',
          toPinId: 'in_addr',
          state: 0,
        },
        // RAM DOUT -> CPU BUS_IN
        {
          id: 'w_ram_cpu',
          fromComponentId: 'ram_1',
          fromPinId: 'out_dout',
          toComponentId: 'cpu_1',
          toPinId: 'in_bus',
          state: 0,
        },
        // CPU BUS_OUT -> RAM DIN
        {
          id: 'w_cpu_ram',
          fromComponentId: 'cpu_1',
          fromPinId: 'out_bus',
          toComponentId: 'ram_1',
          toPinId: 'in_din',
          state: 0,
        },
        // CPU BUS_OUT -> Bus Monitor
        {
          id: 'w_bus_mon',
          fromComponentId: 'cpu_1',
          fromPinId: 'out_bus',
          toComponentId: 'bus_mon',
          toPinId: 'in_bus',
          state: 0,
        },
        // CPU OUT -> 7-seg Display
        {
          id: 'w_out_7seg',
          fromComponentId: 'cpu_1',
          fromPinId: 'out_out',
          toComponentId: 'hex_out',
          toPinId: 'in_hex',
          state: 0,
        },
        // CPU OUT -> LED Bar
        {
          id: 'w_out_ledbar',
          fromComponentId: 'cpu_1',
          fromPinId: 'out_out',
          toComponentId: 'led_bar',
          toPinId: 'in_bus',
          state: 0,
        },
        // CPU HLT -> HLT LED
        {
          id: 'w_hlt',
          fromComponentId: 'cpu_1',
          fromPinId: 'out_hlt',
          toComponentId: 'led_hlt',
          toPinId: 'in_d',
          state: 0,
        },
      ];

      return {
        id: 'micro8_sys',
        name: 'Micro-8 8-Bit Computer System',
        description: 'Complete 8-bit Von Neumann architecture executing Fibonacci sequence machine code in real-time.',
        components,
        wires,
      };
    },
  },
  {
    id: 'gate-full-adder',
    name: 'Gate-Level Full Adder (XOR, AND, OR)',
    category: 'gate-level',
    description: 'Constructed purely from 2 XOR gates, 2 AND gates, and 1 OR gate to show binary addition and carry generation.',
    complexity: 'Beginner',
    create: () => {
      const swA = createNewComponent('SWITCH', 80, 100, 'sw_a');
      swA.label = 'Input A';
      swA.data.switchState = true;

      const swB = createNewComponent('SWITCH', 80, 200, 'sw_b');
      swB.label = 'Input B';
      swB.data.switchState = true;

      const swCin = createNewComponent('SWITCH', 80, 300, 'sw_cin');
      swCin.label = 'Carry In';
      swCin.data.switchState = false;

      // First stage Half Adder
      const xor1 = createNewComponent('XOR', 240, 120, 'xor_1');
      const and1 = createNewComponent('AND', 240, 220, 'and_1');

      // Second stage
      const xor2 = createNewComponent('XOR', 400, 160, 'xor_2');
      const and2 = createNewComponent('AND', 400, 260, 'and_2');

      // Carry Out OR gate
      const or1 = createNewComponent('OR', 540, 240, 'or_1');

      // Outputs
      const ledSum = createNewComponent('LED', 660, 160, 'led_sum');
      ledSum.label = 'SUM';
      ledSum.data.color = '#38bdf8'; // sky blue

      const ledCout = createNewComponent('LED', 660, 240, 'led_cout');
      ledCout.label = 'C_OUT';
      ledCout.data.color = '#f59e0b'; // amber

      const components = [swA, swB, swCin, xor1, and1, xor2, and2, or1, ledSum, ledCout];

      const wires: Wire[] = [
        // SwA -> XOR1 in_a, AND1 in_a
        { id: 'w1', fromComponentId: 'sw_a', fromPinId: 'out_y', toComponentId: 'xor_1', toPinId: 'in_a', state: 0 },
        { id: 'w2', fromComponentId: 'sw_a', fromPinId: 'out_y', toComponentId: 'and_1', toPinId: 'in_a', state: 0 },

        // SwB -> XOR1 in_b, AND1 in_b
        { id: 'w3', fromComponentId: 'sw_b', fromPinId: 'out_y', toComponentId: 'xor_1', toPinId: 'in_b', state: 0 },
        { id: 'w4', fromComponentId: 'sw_b', fromPinId: 'out_y', toComponentId: 'and_1', toPinId: 'in_b', state: 0 },

        // XOR1 out -> XOR2 in_a, AND2 in_a
        { id: 'w5', fromComponentId: 'xor_1', fromPinId: 'out_y', toComponentId: 'xor_2', toPinId: 'in_a', state: 0 },
        { id: 'w6', fromComponentId: 'xor_1', fromPinId: 'out_y', toComponentId: 'and_2', toPinId: 'in_a', state: 0 },

        // Cin -> XOR2 in_b, AND2 in_b
        { id: 'w7', fromComponentId: 'sw_cin', fromPinId: 'out_y', toComponentId: 'xor_2', toPinId: 'in_b', state: 0 },
        { id: 'w8', fromComponentId: 'sw_cin', fromPinId: 'out_y', toComponentId: 'and_2', toPinId: 'in_b', state: 0 },

        // XOR2 out -> SUM LED
        { id: 'w9', fromComponentId: 'xor_2', fromPinId: 'out_y', toComponentId: 'led_sum', toPinId: 'in_d', state: 0 },

        // AND1 out -> OR1 in_a
        { id: 'w10', fromComponentId: 'and_1', fromPinId: 'out_y', toComponentId: 'or_1', toPinId: 'in_a', state: 0 },
        // AND2 out -> OR1 in_b
        { id: 'w11', fromComponentId: 'and_2', fromPinId: 'out_y', toComponentId: 'or_1', toPinId: 'in_b', state: 0 },

        // OR1 out -> Cout LED
        { id: 'w12', fromComponentId: 'or_1', fromPinId: 'out_y', toComponentId: 'led_cout', toPinId: 'in_d', state: 0 },
      ];

      return {
        id: 'full_adder_gate',
        name: 'Gate-Level Full Adder',
        description: 'Hierarchical gate-level breakdown of binary arithmetic with XOR, AND, and OR logic.',
        components,
        wires,
      };
    },
  },
  {
    id: 'alu-4bit-demo',
    name: '4-Bit ALU Subsystem with Flag Logic',
    category: 'arithmetic',
    description: 'Complete 4-bit Arithmetic Logic Unit performing ADD, SUB, AND, OR, XOR with Zero and Carry detection.',
    complexity: 'Intermediate',
    create: () => {
      const swA = createNewComponent('SWITCH', 80, 100, 'sw_a');
      swA.label = 'A[0]';
      swA.data.switchState = true;

      const swB = createNewComponent('SWITCH', 80, 200, 'sw_b');
      swB.label = 'B[0]';
      swB.data.switchState = true;

      const alu = createNewComponent('ALU_4BIT', 260, 120, 'alu_1');
      alu.label = '4-Bit ALU';

      const hexRes = createNewComponent('HEX_DISPLAY_7SEG', 480, 120, 'hex_res');
      hexRes.label = 'Result';

      const ledZero = createNewComponent('LED', 480, 240, 'led_z');
      ledZero.label = 'ZERO FLAG';
      ledZero.data.color = '#38bdf8';

      const ledCarry = createNewComponent('LED', 480, 310, 'led_c');
      ledCarry.label = 'CARRY FLAG';
      ledCarry.data.color = '#eab308';

      const components = [swA, swB, alu, hexRes, ledZero, ledCarry];

      const wires: Wire[] = [
        { id: 'w1', fromComponentId: 'sw_a', fromPinId: 'out_y', toComponentId: 'alu_1', toPinId: 'in_a', state: 0 },
        { id: 'w2', fromComponentId: 'sw_b', fromPinId: 'out_y', toComponentId: 'alu_1', toPinId: 'in_b', state: 0 },
        { id: 'w3', fromComponentId: 'alu_1', fromPinId: 'out_res', toComponentId: 'hex_res', toPinId: 'in_hex', state: 0 },
        { id: 'w4', fromComponentId: 'alu_1', fromPinId: 'out_zero', toComponentId: 'led_z', toPinId: 'in_d', state: 0 },
        { id: 'w5', fromComponentId: 'alu_1', fromPinId: 'out_cout', toComponentId: 'led_c', toPinId: 'in_d', state: 0 },
      ];

      return {
        id: 'alu_4bit_sys',
        name: '4-Bit Arithmetic Logic Unit',
        description: 'Multi-function 4-bit ALU with arithmetic addition, subtraction, bitwise logic, and condition flag outputs.',
        components,
        wires,
      };
    },
  },
  {
    id: 'sr-latch-gate',
    name: 'Bistable SR Latch from Cross-Coupled NOR Gates',
    category: 'sequential',
    description: 'Fundamental 1-bit memory cell built from two cross-coupled NOR gates showing feedback stabilization.',
    complexity: 'Beginner',
    create: () => {
      const swSet = createNewComponent('PUSH_BUTTON', 80, 120, 'pb_s');
      swSet.label = 'SET (S)';

      const swReset = createNewComponent('PUSH_BUTTON', 80, 260, 'pb_r');
      swReset.label = 'RESET (R)';

      const nor1 = createNewComponent('NOR', 240, 120, 'nor_top');
      nor1.label = 'NOR Top';

      const nor2 = createNewComponent('NOR', 240, 260, 'nor_bot');
      nor2.label = 'NOR Bottom';

      const ledQ = createNewComponent('LED', 440, 120, 'led_q');
      ledQ.label = 'Q';
      ledQ.data.color = '#10b981';

      const ledQbar = createNewComponent('LED', 440, 260, 'led_qbar');
      ledQbar.label = '~Q';
      ledQbar.data.color = '#ef4444';

      const components = [swSet, swReset, nor1, nor2, ledQ, ledQbar];

      const wires: Wire[] = [
        // S -> Top NOR in_a
        { id: 'w_s', fromComponentId: 'pb_s', fromPinId: 'out_y', toComponentId: 'nor_top', toPinId: 'in_a', state: 0 },
        // R -> Bot NOR in_b
        { id: 'w_r', fromComponentId: 'pb_r', fromPinId: 'out_y', toComponentId: 'nor_bot', toPinId: 'in_b', state: 0 },

        // Top NOR out -> LED Q
        { id: 'w_q', fromComponentId: 'nor_top', fromPinId: 'out_y', toComponentId: 'led_q', toPinId: 'in_d', state: 0 },
        // Bot NOR out -> LED ~Q
        { id: 'w_qbar', fromComponentId: 'nor_bot', fromPinId: 'out_y', toComponentId: 'led_qbar', toPinId: 'in_d', state: 0 },

        // Cross feedback: Top NOR out -> Bot NOR in_a
        { id: 'w_fb1', fromComponentId: 'nor_top', fromPinId: 'out_y', toComponentId: 'nor_bot', toPinId: 'in_a', state: 0 },
        // Cross feedback: Bot NOR out -> Top NOR in_b
        { id: 'w_fb2', fromComponentId: 'nor_bot', fromPinId: 'out_y', toComponentId: 'nor_top', toPinId: 'in_b', state: 0 },
      ];

      return {
        id: 'sr_latch_sys',
        name: 'SR Latch (Gate-Level)',
        description: 'Cross-coupled NOR gate 1-bit memory demonstrating bistable latching and race-free feedback.',
        components,
        wires,
      };
    },
  },
  {
    id: 'counter-4bit-demo',
    name: '4-Bit Synchronous Counter & Hex Display',
    category: 'sequential',
    description: '4-bit binary counter driven by clock generator with real-time 7-segment hex decoder.',
    complexity: 'Intermediate',
    create: () => {
      const clk = createNewComponent('CLOCK', 80, 160, 'clk_c');
      clk.data.frequencyHz = 4;

      const swRst = createNewComponent('SWITCH', 80, 260, 'sw_rst');
      swRst.label = 'RESET';

      const counter = createNewComponent('COUNTER_4BIT', 240, 160, 'cnt_1');
      counter.label = '4-Bit Counter';

      const decoder = createNewComponent('HEX_DISPLAY_7SEG', 420, 160, 'hex_1');
      decoder.label = 'Hex Count';

      const ledTc = createNewComponent('LED', 420, 280, 'led_tc');
      ledTc.label = 'TERMINAL COUNT (15)';
      ledTc.data.color = '#f59e0b';

      const components = [clk, swRst, counter, decoder, ledTc];

      const wires: Wire[] = [
        { id: 'w1', fromComponentId: 'clk_c', fromPinId: 'out_clk', toComponentId: 'cnt_1', toPinId: 'in_clk', state: 0 },
        { id: 'w2', fromComponentId: 'sw_rst', fromPinId: 'out_y', toComponentId: 'cnt_1', toPinId: 'in_rst', state: 0 },
        { id: 'w3', fromComponentId: 'cnt_1', fromPinId: 'out_q', toComponentId: 'hex_1', toPinId: 'in_hex', state: 0 },
        { id: 'w4', fromComponentId: 'cnt_1', fromPinId: 'out_tc', toComponentId: 'led_tc', toPinId: 'in_d', state: 0 },
      ];

      return {
        id: 'counter_sys',
        name: '4-Bit Synchronous Counter & Display',
        description: 'Binary counter cycling through 0 to 15 with terminal count pulse and 7-segment display.',
        components,
        wires,
      };
    },
  },
];
