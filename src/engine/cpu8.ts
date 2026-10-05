/**
 * Micro-8 8-Bit Breadboard Microprocessor Architecture
 * Cycle-accurate microcode sequencer, registers, ALU, RAM, and Assembler
 */

export interface CpuFlags {
  carry: boolean;
  zero: boolean;
  negative: boolean;
}

export interface CpuState {
  pc: number; // 4-bit Program Counter (0-15)
  mar: number; // 4-bit Memory Address Register (0-15)
  ir: number; // 8-bit Instruction Register (High nibble = opcode, Low = operand)
  a: number; // 8-bit Accumulator
  b: number; // 8-bit Temporary register B
  aluOut: number; // 8-bit ALU output
  out: number; // 8-bit Output register
  bus: number; // 8-bit main system bus
  tState: number; // 0 to 5 (Microcode step)
  halted: boolean;
  flags: CpuFlags;
  controlWord: number; // 16-bit active control word
  cycleCount: number;
}

// 16 Control Signal Bitmasks
export const CTRL = {
  HLT: 1 << 0, // Halt clock
  MI: 1 << 1, // Memory Address Register In
  RI: 1 << 2, // RAM In (Write bus to RAM[MAR])
  RO: 1 << 3, // RAM Out (Read RAM[MAR] to bus)
  IO: 1 << 4, // Instruction Register Out (put operand on bus)
  II: 1 << 5, // Instruction Register In (latch bus into IR)
  AI: 1 << 6, // Accumulator In
  AO: 1 << 7, // Accumulator Out
  EO: 1 << 8, // ALU Out
  SU: 1 << 9, // ALU Subtract
  BI: 1 << 10, // B Register In
  OI: 1 << 11, // Output Register In
  CE: 1 << 12, // Counter Enable (PC increment)
  CO: 1 << 13, // Counter Out (PC onto bus)
  J: 1 << 14, // Jump (Latch bus into PC)
  FI: 1 << 15, // Flags In (Latch flags from ALU)
};

export const OPCODES: Record<string, number> = {
  NOP: 0x0,
  LDA: 0x1,
  ADD: 0x2,
  SUB: 0x3,
  STA: 0x4,
  LDI: 0x5,
  JMP: 0x6,
  JC: 0x7,
  JZ: 0x8,
  OUT: 0x9,
  AND: 0xa,
  OR: 0xb,
  XOR: 0xc,
  INC: 0xd,
  DEC: 0xe,
  HLT: 0xf,
};

export const OPCODE_NAMES: Record<number, string> = Object.fromEntries(
  Object.entries(OPCODES).map(([k, v]) => [v, k])
);

export function getControlSignalNames(controlWord: number): string[] {
  const names: string[] = [];
  if (controlWord & CTRL.HLT) names.push('HLT');
  if (controlWord & CTRL.MI) names.push('MI');
  if (controlWord & CTRL.RI) names.push('RI');
  if (controlWord & CTRL.RO) names.push('RO');
  if (controlWord & CTRL.IO) names.push('IO');
  if (controlWord & CTRL.II) names.push('II');
  if (controlWord & CTRL.AI) names.push('AI');
  if (controlWord & CTRL.AO) names.push('AO');
  if (controlWord & CTRL.EO) names.push('EO');
  if (controlWord & CTRL.SU) names.push('SU');
  if (controlWord & CTRL.BI) names.push('BI');
  if (controlWord & CTRL.OI) names.push('OI');
  if (controlWord & CTRL.CE) names.push('CE');
  if (controlWord & CTRL.CO) names.push('CO');
  if (controlWord & CTRL.J) names.push('J');
  if (controlWord & CTRL.FI) names.push('FI');
  return names;
}

export function createInitialCpuState(): CpuState {
  return {
    pc: 0,
    mar: 0,
    ir: 0,
    a: 0,
    b: 0,
    aluOut: 0,
    out: 0,
    bus: 0,
    tState: 0,
    halted: false,
    flags: { carry: false, zero: false, negative: false },
    controlWord: 0,
    cycleCount: 0,
  };
}

/**
 * Microcode table lookup for given (opcode, tState, flags)
 */
export function getMicrocode(opcode: number, tState: number, flags: CpuFlags): number {
  // T0 and T1 are universal Fetch cycles for all instructions:
  // T0: Program Counter to Memory Address Register (MAR)
  if (tState === 0) {
    return CTRL.CO | CTRL.MI;
  }
  // T1: RAM Out to Instruction Register (IR), PC increments
  if (tState === 1) {
    return CTRL.RO | CTRL.II | CTRL.CE;
  }

  // T2 - T5: Execute cycles based on Opcode
  switch (opcode) {
    case OPCODES.NOP:
      return 0;

    case OPCODES.LDA:
      if (tState === 2) return CTRL.IO | CTRL.MI; // Operand address to MAR
      if (tState === 3) return CTRL.RO | CTRL.AI; // RAM[MAR] to Accumulator A
      return 0;

    case OPCODES.ADD:
      if (tState === 2) return CTRL.IO | CTRL.MI; // Operand address to MAR
      if (tState === 3) return CTRL.RO | CTRL.BI; // RAM[MAR] to B register
      if (tState === 4) return CTRL.EO | CTRL.AI | CTRL.FI; // ALU Sum to A, latch Flags
      return 0;

    case OPCODES.SUB:
      if (tState === 2) return CTRL.IO | CTRL.MI; // Operand address to MAR
      if (tState === 3) return CTRL.RO | CTRL.BI; // RAM[MAR] to B register
      if (tState === 4) return CTRL.EO | CTRL.AI | CTRL.SU | CTRL.FI; // ALU Diff to A, latch Flags
      return 0;

    case OPCODES.STA:
      if (tState === 2) return CTRL.IO | CTRL.MI; // Operand address to MAR
      if (tState === 3) return CTRL.AO | CTRL.RI; // A onto bus, write to RAM[MAR]
      return 0;

    case OPCODES.LDI:
      if (tState === 2) return CTRL.IO | CTRL.AI; // Put immediate 4-bit value into A
      return 0;

    case OPCODES.JMP:
      if (tState === 2) return CTRL.IO | CTRL.J; // Operand address into PC
      return 0;

    case OPCODES.JC:
      if (tState === 2) {
        return flags.carry ? CTRL.IO | CTRL.J : 0;
      }
      return 0;

    case OPCODES.JZ:
      if (tState === 2) {
        return flags.zero ? CTRL.IO | CTRL.J : 0;
      }
      return 0;

    case OPCODES.OUT:
      if (tState === 2) return CTRL.AO | CTRL.OI; // A into Output register
      return 0;

    case OPCODES.AND:
      if (tState === 2) return CTRL.IO | CTRL.MI;
      if (tState === 3) return CTRL.RO | CTRL.BI;
      if (tState === 4) return CTRL.EO | CTRL.AI | CTRL.FI;
      return 0;

    case OPCODES.OR:
      if (tState === 2) return CTRL.IO | CTRL.MI;
      if (tState === 3) return CTRL.RO | CTRL.BI;
      if (tState === 4) return CTRL.EO | CTRL.AI | CTRL.FI;
      return 0;

    case OPCODES.XOR:
      if (tState === 2) return CTRL.IO | CTRL.MI;
      if (tState === 3) return CTRL.RO | CTRL.BI;
      if (tState === 4) return CTRL.EO | CTRL.AI | CTRL.FI;
      return 0;

    case OPCODES.INC:
      if (tState === 2) return CTRL.EO | CTRL.AI | CTRL.FI;
      return 0;

    case OPCODES.DEC:
      if (tState === 2) return CTRL.EO | CTRL.AI | CTRL.SU | CTRL.FI;
      return 0;

    case OPCODES.HLT:
      return CTRL.HLT;

    default:
      return 0;
  }
}

/**
 * Step CPU by single micro-operation (1 clock tick)
 */
export function stepCpuMicro(state: CpuState, memory: number[]): { state: CpuState; memory: number[] } {
  if (state.halted) return { state, memory };

  const nextState = { ...state };
  const nextMemory = [...memory];
  nextState.cycleCount++;

  const opcode = (state.ir >> 4) & 0x0f;
  const controlWord = getMicrocode(opcode, state.tState, state.flags);
  nextState.controlWord = controlWord;

  if (controlWord & CTRL.HLT) {
    nextState.halted = true;
    return { state: nextState, memory: nextMemory };
  }

  // Determine bus driver (What is putting data ONTO the bus)
  let busValue = 0;
  if (controlWord & CTRL.CO) {
    busValue = state.pc & 0x0f;
  } else if (controlWord & CTRL.RO) {
    busValue = nextMemory[state.mar & 0x0f] ?? 0;
  } else if (controlWord & CTRL.IO) {
    busValue = state.ir & 0x0f;
  } else if (controlWord & CTRL.AO) {
    busValue = state.a & 0xff;
  } else if (controlWord & CTRL.EO) {
    // ALU calculation
    if (opcode === OPCODES.SUB || (controlWord & CTRL.SU)) {
      const diff = state.a - state.b;
      busValue = (diff + 256) % 256;
      if (controlWord & CTRL.FI) {
        nextState.flags.carry = diff >= 0; // Carry is inverted borrow in 6502/x86 style
        nextState.flags.zero = (busValue & 0xff) === 0;
        nextState.flags.negative = (busValue & 0x80) !== 0;
      }
    } else if (opcode === OPCODES.AND) {
      busValue = (state.a & state.b) & 0xff;
      if (controlWord & CTRL.FI) {
        nextState.flags.zero = busValue === 0;
      }
    } else if (opcode === OPCODES.OR) {
      busValue = (state.a | state.b) & 0xff;
      if (controlWord & CTRL.FI) {
        nextState.flags.zero = busValue === 0;
      }
    } else if (opcode === OPCODES.XOR) {
      busValue = (state.a ^ state.b) & 0xff;
      if (controlWord & CTRL.FI) {
        nextState.flags.zero = busValue === 0;
      }
    } else if (opcode === OPCODES.INC) {
      busValue = (state.a + 1) & 0xff;
      if (controlWord & CTRL.FI) {
        nextState.flags.carry = state.a === 255;
        nextState.flags.zero = busValue === 0;
      }
    } else if (opcode === OPCODES.DEC) {
      busValue = (state.a - 1 + 256) & 0xff;
      if (controlWord & CTRL.FI) {
        nextState.flags.carry = state.a === 0;
        nextState.flags.zero = busValue === 0;
      }
    } else {
      // Default ADD
      const sum = state.a + state.b;
      busValue = sum & 0xff;
      if (controlWord & CTRL.FI) {
        nextState.flags.carry = sum > 255;
        nextState.flags.zero = busValue === 0;
        nextState.flags.negative = (busValue & 0x80) !== 0;
      }
    }
  }

  nextState.bus = busValue;

  // Clock edge latches (What is reading FROM the bus)
  if (controlWord & CTRL.MI) {
    nextState.mar = busValue & 0x0f;
  }
  if (controlWord & CTRL.RI) {
    nextMemory[nextState.mar & 0x0f] = busValue & 0xff;
  }
  if (controlWord & CTRL.II) {
    nextState.ir = busValue & 0xff;
  }
  if (controlWord & CTRL.AI) {
    nextState.a = busValue & 0xff;
  }
  if (controlWord & CTRL.BI) {
    nextState.b = busValue & 0xff;
  }
  if (controlWord & CTRL.OI) {
    nextState.out = busValue & 0xff;
  }
  if (controlWord & CTRL.J) {
    nextState.pc = busValue & 0x0f;
  }
  if (controlWord & CTRL.CE) {
    nextState.pc = (nextState.pc + 1) & 0x0f;
  }

  // Advance ring counter micro-state (0 to 5)
  nextState.tState = (state.tState + 1) % 6;

  return { state: nextState, memory: nextMemory };
}

/**
 * Step CPU by an entire instruction (completes all micro-steps T0..T5 until T0 again)
 */
export function stepCpuInstruction(state: CpuState, memory: number[]): { state: CpuState; memory: number[] } {
  let currState = state;
  let currMemory = memory;
  if (currState.halted) return { state: currState, memory: currMemory };

  let maxSteps = 10;
  do {
    const res = stepCpuMicro(currState, currMemory);
    currState = res.state;
    currMemory = res.memory;
    maxSteps--;
    if (currState.halted) break;
  } while (currState.tState !== 0 && maxSteps > 0);

  return { state: currState, memory: currMemory };
}

/**
 * Micro-8 Assembler
 */
export interface AssembledLine {
  address: number;
  byte: number;
  hex: string;
  binary: string;
  source: string;
}

export function assemble(sourceCode: string): {
  bytes: number[];
  listing: AssembledLine[];
  errors: string[];
} {
  const bytes = new Array(16).fill(0);
  const listing: AssembledLine[] = [];
  const errors: string[] = [];
  const labels: Record<string, number> = {};

  const lines = sourceCode.split('\n');

  // First pass: collect labels and addresses
  let address = 0;
  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    // Strip comments
    const commentIdx = rawLine.indexOf(';');
    const line = (commentIdx !== -1 ? rawLine.substring(0, commentIdx) : rawLine).trim();
    if (!line) continue;

    // Check for label definition (e.g. "loop:")
    const matchLabel = line.match(/^([A-Za-z_][A-Za-z0-9_]*):/);
    if (matchLabel) {
      labels[matchLabel[1].toUpperCase()] = address;
      const rest = line.substring(matchLabel[0].length).trim();
      if (!rest) continue;
    }

    if (address > 15) {
      errors.push(`Memory limit exceeded at line ${i + 1}. Max 16 bytes (0x0 to 0xF).`);
      break;
    }
    address++;
  }

  // Second pass: generate machine code
  address = 0;
  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const commentIdx = rawLine.indexOf(';');
    let line = (commentIdx !== -1 ? rawLine.substring(0, commentIdx) : rawLine).trim();
    if (!line) continue;

    // Strip leading label
    const matchLabel = line.match(/^([A-Za-z_][A-Za-z0-9_]*):/);
    if (matchLabel) {
      line = line.substring(matchLabel[0].length).trim();
      if (!line) continue;
    }

    if (address > 15) break;

    const parts = line.split(/\s+/);
    const mnemonic = parts[0].toUpperCase();
    const operandStr = parts[1];

    let byteVal = 0;

    // Direct byte directive: .byte 42 or .byte 0x2A
    if (mnemonic === '.BYTE' || mnemonic === 'DB') {
      if (!operandStr) {
        errors.push(`Line ${i + 1}: Missing value for .BYTE`);
      } else {
        const val = operandStr.startsWith('0x') || operandStr.startsWith('0X')
          ? parseInt(operandStr, 16)
          : parseInt(operandStr, 10);
        byteVal = isNaN(val) ? 0 : val & 0xff;
      }
    } else if (mnemonic in OPCODES) {
      const opcode = OPCODES[mnemonic];
      let operand = 0;

      if (operandStr !== undefined) {
        const upperOp = operandStr.toUpperCase();
        if (upperOp in labels) {
          operand = labels[upperOp];
        } else if (operandStr.startsWith('0x') || operandStr.startsWith('0X')) {
          operand = parseInt(operandStr, 16) & 0x0f;
        } else {
          const parsed = parseInt(operandStr, 10);
          operand = isNaN(parsed) ? 0 : parsed & 0x0f;
        }
      }

      byteVal = ((opcode & 0x0f) << 4) | (operand & 0x0f);
    } else {
      errors.push(`Line ${i + 1}: Unknown instruction or directive '${mnemonic}'`);
    }

    bytes[address] = byteVal;
    listing.push({
      address,
      byte: byteVal,
      hex: byteVal.toString(16).toUpperCase().padStart(2, '0'),
      binary: byteVal.toString(2).padStart(8, '0'),
      source: rawLine.trim(),
    });

    address++;
  }

  return { bytes, listing, errors };
}

/**
 * Disassemble 16 bytes of memory into assembly code
 */
export function disassemble(bytes: number[]): string[] {
  return bytes.slice(0, 16).map((b, addr) => {
    const opcode = (b >> 4) & 0x0f;
    const operand = b & 0x0f;
    const name = OPCODE_NAMES[opcode] || '???';
    const noOperand = ['NOP', 'OUT', 'INC', 'DEC', 'HLT'].includes(name);
    return `${addr.toString(16).toUpperCase()}:  ${name} ${noOperand ? '' : operand}`;
  });
}

// Pre-built Assembly Programs
export const PRESET_PROGRAMS: { id: string; name: string; description: string; code: string }[] = [
  {
    id: 'fibonacci',
    name: 'Fibonacci Generator',
    description: 'Computes the Fibonacci series and outputs each number to the display port in an infinite loop.',
    code: `; Fibonacci Sequence Generator
; Computes 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144...
; Outputs each result to the Output Register

        LDA val1    ; Load val1 (1) into A
loop:   OUT         ; Display current number
        ADD val2    ; A = val1 + val2
        JC reset    ; If carry set (>255), reset sequence
        STA temp    ; Store new sum in temp
        LDA val2    ; Load val2 into A
        STA val1    ; Move val2 into val1
        LDA temp    ; Load sum into A
        STA val2    ; Move sum into val2
        JMP loop    ; Continue loop
reset:  LDA one     ; Reset sequence
        STA val1
        STA val2
        JMP loop

val1:   .byte 1
val2:   .byte 1
temp:   .byte 0
one:    .byte 1`,
  },
  {
    id: 'counter',
    name: '8-Bit Binary Counter',
    description: 'Counts up from 0 to 255 and displays on LED output bar, resetting on overflow.',
    code: `; 8-bit Binary Counter
; Increments Accumulator and displays on output port

start:  LDI 0       ; Clear Accumulator to 0
loop:   OUT         ; Show on output display
        INC         ; A = A + 1
        JC start    ; If overflow (carry flag set), reset to 0
        JMP loop    ; Repeat indefinitely`,
  },
  {
    id: 'multiply',
    name: 'Multiplication by Repeated Addition',
    description: 'Multiplies 3 by 5 using repeated addition, outputting 15 (0x0F) and halting.',
    code: `; Multiply 3 * 5 = 15
; Result stored in A and displayed on OUT

start:  LDA count   ; Load loop counter (5)
loop:   JZ done     ; When counter reaches 0, finish
        DEC         ; Counter = Counter - 1
        STA count
        LDA result  ; Add multiplicand (3)
        ADD mult
        STA result
        JMP loop
done:   LDA result
        OUT         ; Output final product (15)
        HLT         ; Stop clock

mult:   .byte 3
count:  .byte 5
result: .byte 0`,
  },
  {
    id: 'triangular',
    name: 'Triangular Numbers (Sum 1..N)',
    description: 'Calculates the sum of numbers 1+2+3+4 = 10, displays 10 and halts.',
    code: `; Sum of 1 to 4: 1 + 2 + 3 + 4 = 10
; Demonstrates conditional loop and accumulation

        LDI 0       ; Initialize Sum = 0
        STA sum
        LDA n       ; Load N (4)
loop:   JZ done     ; If N == 0, done
        STA temp    ; Save current N
        LDA sum     ; Sum += N
        ADD temp
        STA sum
        LDA temp    ; N = N - 1
        DEC
        JMP loop
done:   LDA sum
        OUT         ; Output 10 (0x0A)
        HLT

n:      .byte 4
sum:    .byte 0
temp:   .byte 0`,
  },
  {
    id: 'logic',
    name: 'Bitwise Logic Test',
    description: 'Tests AND, OR, and XOR gate instructions inside the CPU ALU.',
    code: `; Logic ALU Test
; Demonstrates AND, OR, XOR operations

        LDA valA    ; Load 0b1100 (12)
        AND valB    ; AND with 0b1010 (10) -> result 8
        OUT         ; Display 8
        LDA valA
        OR valB     ; OR -> result 14
        OUT         ; Display 14
        LDA valA
        XOR valB    ; XOR -> result 6
        OUT         ; Display 6
        HLT

valA:   .byte 12
valB:   .byte 10`,
  },
];
