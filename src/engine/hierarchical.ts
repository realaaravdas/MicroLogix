/**
 * Hierarchical Sub-Circuit Generator & Navigator
 * Enables stepping down from chip-level ICs down to individual gate-level implementations
 */
import { CircuitSchematic, CircuitComponent, Wire } from '../types/circuit.ts';
import { createNewComponent } from './pinLayouts.ts';

export interface BreadcrumbItem {
  id: string;
  name: string;
  componentType?: string;
  schematic: CircuitSchematic;
}

export function getInternalSubCircuit(parentComponent: CircuitComponent): CircuitSchematic | null {
  const { type, label } = parentComponent;

  if (type === 'FULL_ADDER') {
    // 2 Half adders + 1 OR gate
    const xor1 = createNewComponent('XOR', 120, 100, 'ha1_xor');
    xor1.label = 'XOR 1';
    const and1 = createNewComponent('AND', 120, 200, 'ha1_and');
    and1.label = 'AND 1';

    const xor2 = createNewComponent('XOR', 300, 140, 'ha2_xor');
    xor2.label = 'XOR 2';
    const and2 = createNewComponent('AND', 300, 240, 'ha2_and');
    and2.label = 'AND 2';

    const or1 = createNewComponent('OR', 460, 220, 'carry_or');
    or1.label = 'OR Carry';

    const components = [xor1, and1, xor2, and2, or1];
    const wires: Wire[] = [
      { id: 'w1', fromComponentId: 'ha1_xor', fromPinId: 'out_y', toComponentId: 'ha2_xor', toPinId: 'in_a', state: 0 },
      { id: 'w2', fromComponentId: 'ha1_xor', fromPinId: 'out_y', toComponentId: 'ha2_and', toPinId: 'in_a', state: 0 },
      { id: 'w3', fromComponentId: 'ha1_and', fromPinId: 'out_y', toComponentId: 'carry_or', toPinId: 'in_a', state: 0 },
      { id: 'w4', fromComponentId: 'ha2_and', fromPinId: 'out_y', toComponentId: 'carry_or', toPinId: 'in_b', state: 0 },
    ];

    return {
      id: `sub_${parentComponent.id}`,
      name: `${label} (Internal Logic Gates)`,
      description: 'Internal gate-level breakdown of Full Adder using XOR, AND, and OR gates.',
      components,
      wires,
    };
  }

  if (type === 'ALU_4BIT') {
    // 4 cascaded Full Adders + Logic unit
    const fa0 = createNewComponent('FULL_ADDER', 120, 100, 'fa_bit0');
    fa0.label = 'Full Adder Bit 0';
    const fa1 = createNewComponent('FULL_ADDER', 280, 100, 'fa_bit1');
    fa1.label = 'Full Adder Bit 1';
    const fa2 = createNewComponent('FULL_ADDER', 440, 100, 'fa_bit2');
    fa2.label = 'Full Adder Bit 2';
    const fa3 = createNewComponent('FULL_ADDER', 600, 100, 'fa_bit3');
    fa3.label = 'Full Adder Bit 3';

    const xorSub0 = createNewComponent('XOR', 120, 240, 'sub_xor0');
    xorSub0.label = 'B0 ^ SUB';
    const xorSub1 = createNewComponent('XOR', 280, 240, 'sub_xor1');
    xorSub1.label = 'B1 ^ SUB';
    const xorSub2 = createNewComponent('XOR', 440, 240, 'sub_xor2');
    xorSub2.label = 'B2 ^ SUB';
    const xorSub3 = createNewComponent('XOR', 600, 240, 'sub_xor3');
    xorSub3.label = 'B3 ^ SUB';

    const zeroNor = createNewComponent('NOR', 440, 360, 'zero_nor');
    zeroNor.label = 'Zero Detect NOR';

    const components = [fa0, fa1, fa2, fa3, xorSub0, xorSub1, xorSub2, xorSub3, zeroNor];
    const wires: Wire[] = [
      // Ripple carry: Cout -> Cin
      { id: 'rc0', fromComponentId: 'fa_bit0', fromPinId: 'out_cout', toComponentId: 'fa_bit1', toPinId: 'in_cin', state: 0 },
      { id: 'rc1', fromComponentId: 'fa_bit1', fromPinId: 'out_cout', toComponentId: 'fa_bit2', toPinId: 'in_cin', state: 0 },
      { id: 'rc2', fromComponentId: 'fa_bit2', fromPinId: 'out_cout', toComponentId: 'fa_bit3', toPinId: 'in_cin', state: 0 },
      // Sub XOR outputs to B inputs
      { id: 'xb0', fromComponentId: 'sub_xor0', fromPinId: 'out_y', toComponentId: 'fa_bit0', toPinId: 'in_b', state: 0 },
      { id: 'xb1', fromComponentId: 'sub_xor1', fromPinId: 'out_y', toComponentId: 'fa_bit1', toPinId: 'in_b', state: 0 },
      { id: 'xb2', fromComponentId: 'sub_xor2', fromPinId: 'out_y', toComponentId: 'fa_bit2', toPinId: 'in_b', state: 0 },
      { id: 'xb3', fromComponentId: 'sub_xor3', fromPinId: 'out_y', toComponentId: 'fa_bit3', toPinId: 'in_b', state: 0 },
    ];

    return {
      id: `sub_${parentComponent.id}`,
      name: `${label} (4-Bit ALU Internal Architecture)`,
      description: 'Internal 4-bit ripple-carry adder with two’s complement subtraction invertors and zero flag detection.',
      components,
      wires,
    };
  }

  if (type === 'D_FLIP_FLOP') {
    // 4 NAND gates forming master latch
    const nand1 = createNewComponent('NAND', 120, 100, 'nand_1');
    nand1.label = 'NAND 1';
    const nand2 = createNewComponent('NAND', 120, 220, 'nand_2');
    nand2.label = 'NAND 2';
    const nand3 = createNewComponent('NAND', 300, 100, 'nand_3');
    nand3.label = 'NAND 3 (Q)';
    const nand4 = createNewComponent('NAND', 300, 220, 'nand_4');
    nand4.label = 'NAND 4 (~Q)';

    const components = [nand1, nand2, nand3, nand4];
    const wires: Wire[] = [
      // Cross feedback
      { id: 'w1', fromComponentId: 'nand_1', fromPinId: 'out_y', toComponentId: 'nand_3', toPinId: 'in_a', state: 0 },
      { id: 'w2', fromComponentId: 'nand_2', fromPinId: 'out_y', toComponentId: 'nand_4', toPinId: 'in_b', state: 0 },
      { id: 'w3', fromComponentId: 'nand_3', fromPinId: 'out_y', toComponentId: 'nand_4', toPinId: 'in_a', state: 0 },
      { id: 'w4', fromComponentId: 'nand_4', fromPinId: 'out_y', toComponentId: 'nand_3', toPinId: 'in_b', state: 0 },
    ];

    return {
      id: `sub_${parentComponent.id}`,
      name: `${label} (Gate-Level NAND Latch)`,
      description: 'Internal gate-level flip-flop cross-coupled NAND latch implementation.',
      components,
      wires,
    };
  }

  if (type === 'CPU_MICRO8') {
    // Micro-8 CPU internal schematic showing Registers, ALU, Control Sequencer, PC, MAR, IR
    const pc = createNewComponent('COUNTER_4BIT', 100, 100, 'cpu_pc');
    pc.label = 'Program Counter (PC)';

    const mar = createNewComponent('REGISTER_4BIT', 300, 100, 'cpu_mar');
    mar.label = 'Memory Address Reg (MAR)';

    const ir = createNewComponent('REGISTER_8BIT', 500, 100, 'cpu_ir');
    ir.label = 'Instruction Reg (IR)';

    const regA = createNewComponent('REGISTER_8BIT', 100, 260, 'cpu_reg_a');
    regA.label = 'Accumulator (A)';

    const regB = createNewComponent('REGISTER_8BIT', 300, 260, 'cpu_reg_b');
    regB.label = 'Temp Register (B)';

    const alu = createNewComponent('ALU_4BIT', 500, 260, 'cpu_alu');
    alu.label = 'ALU & Adder Block';

    const regOut = createNewComponent('REGISTER_8BIT', 240, 420, 'cpu_reg_out');
    regOut.label = 'Output Register (OUT)';

    const seqRing = createNewComponent('COUNTER_4BIT', 460, 420, 'cpu_ring');
    seqRing.label = 'T-State Sequencer (T0..T5)';

    const components = [pc, mar, ir, regA, regB, alu, regOut, seqRing];
    const wires: Wire[] = [
      // PC to Bus
      { id: 'w_pc_bus', fromComponentId: 'cpu_pc', fromPinId: 'out_q', toComponentId: 'cpu_mar', toPinId: 'in_d', state: 0 },
      // A & B to ALU
      { id: 'w_a_alu', fromComponentId: 'cpu_reg_a', fromPinId: 'out_q', toComponentId: 'cpu_alu', toPinId: 'in_a', state: 0 },
      { id: 'w_b_alu', fromComponentId: 'cpu_reg_b', fromPinId: 'out_q', toComponentId: 'cpu_alu', toPinId: 'in_b', state: 0 },
      // ALU to A
      { id: 'w_alu_a', fromComponentId: 'cpu_alu', fromPinId: 'out_res', toComponentId: 'cpu_reg_a', toPinId: 'in_d', state: 0 },
      // A to OUT
      { id: 'w_a_out', fromComponentId: 'cpu_reg_a', fromPinId: 'out_q', toComponentId: 'cpu_reg_out', toPinId: 'in_d', state: 0 },
    ];

    return {
      id: `sub_${parentComponent.id}`,
      name: `${label} (Internal Microprocessor Architecture)`,
      description: 'Internal block diagram of the Micro-8 CPU showing PC, MAR, IR, Accumulator A, B, ALU, OUT register, and Sequencer.',
      components,
      wires,
    };
  }

  return null;
}
