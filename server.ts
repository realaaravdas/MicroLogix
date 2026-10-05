import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// API: Transcribe Audio using gemini-3.5-transcribe
app.post('/api/gemini/transcribe', async (req: Request, res: Response) => {
  try {
    const { audioData, mimeType = 'audio/webm' } = req.body;
    if (!audioData) {
      return res.status(400).json({ error: 'Missing audioData in request body' });
    }

    const audioPart = {
      inlineData: {
        mimeType: mimeType,
        data: audioData,
      },
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [
          audioPart,
          {
            text: 'Transcribe this spoken audio exactly as said. Return only the transcription text, nothing else. If it is a hardware, circuit, or CPU assembly command, capture technical terms accurately.',
          },
        ],
      },
    });

    const transcription = response.text || '';
    return res.json({ text: transcription.trim() });
  } catch (error: any) {
    console.error('Transcription error:', error);
    return res.status(500).json({ error: error.message || 'Failed to transcribe audio' });
  }
});

// API: Hardware Synthesis, Circuit Analysis, ASM Generation & Logic Assistant
app.post('/api/gemini/circuit-assistant', async (req: Request, res: Response) => {
  try {
    const { action, prompt, schematicData, model = 'gemini-3.5-flash' } = req.body;

    let systemInstruction = `You are MicroLogic Architect, an expert digital logic design engineer, computer architecture specialist, and CPU emulator assistant.
You specialize in:
1. Gate-level digital logic (AND, OR, NOT, NAND, NOR, XOR, XNOR, Flip-Flops, Adders, Multiplexers, ALUs).
2. Computer Architecture: Von Neumann, Harvard, 8-bit & 16-bit microprocessors, instruction sets, microcode, register transfer language.
3. Machine code & Assembly synthesis for custom 8-bit/16-bit CPUs.
4. Circuit synthesis: generating node/wire specifications for digital schematics.
5. Debugging timing glitches, race conditions, floating pins, and logic hazards.

When generating or modifying circuits, return clean, structured JSON or concise explanations as requested.`;

    let userContent = prompt;

    if (action === 'generate_circuit') {
      systemInstruction += `\nWhen the user asks to generate a circuit or schematic from a Boolean equation, natural language, or functional spec, respond with JSON matching this structure:
{
  "title": "Short title",
  "description": "Short summary of how it works",
  "components": [
    { "type": "AND"|"OR"|"NOT"|"XOR"|"NAND"|"NOR"|"INPUT"|"OUTPUT"|"D_FF"|"ADDER"|"MUX21"|"CLOCK"|"HEX_DISPLAY", "label": "string", "x": number, "y": number }
  ],
  "wires": [
    { "fromComp": number, "fromPin": "out"|"q"|"sum"|"cout"|"y", "toComp": number, "toPin": "a"|"b"|"d"|"clk"|"in"|"sel" }
  ],
  "truthTable": [
    { "inputs": {"A": 0, "B": 1}, "outputs": {"Y": 1} }
  ]
}
Return ONLY valid JSON.`;
    } else if (action === 'generate_asm') {
      systemInstruction += `\nGenerate valid 8-bit microprocessor assembly for the Micro-8 architecture.
Supported instructions:
- NOP (0x0)
- LDA [addr] (0x1) - Load RAM[addr] into Accumulator A
- ADD [addr] (0x2) - A = A + RAM[addr]
- SUB [addr] (0x3) - A = A - RAM[addr]
- STA [addr] (0x4) - Store A into RAM[addr]
- LDI imm (0x5) - Load immediate value into A
- JMP [addr] (0x6) - Jump to address
- JC [addr] (0x7) - Jump if carry flag set
- JZ [addr] (0x8) - Jump if zero flag set
- OUT (0x9) - Output A to Display/Port
- AND [addr] (0xA) - A = A & RAM[addr]
- OR [addr] (0xB) - A = A | RAM[addr]
- XOR [addr] (0xC) - A = A ^ RAM[addr]
- INC (0xD) - Increment A
- DEC (0xE) - Decrement A
- HLT (0xF) - Halt execution

Provide well-commented assembly code and explain the memory layout.`;
    }

    if (schematicData) {
      userContent = `Current Circuit/CPU State Context:\n${JSON.stringify(schematicData, null, 2)}\n\nUser Request: ${prompt}`;
    }

    const response = await ai.models.generateContent({
      model: model,
      contents: userContent,
      config: {
        systemInstruction,
        temperature: 0.2,
      },
    });

    return res.json({ text: response.text });
  } catch (error: any) {
    console.error('Circuit assistant error:', error);
    return res.status(500).json({ error: error.message || 'AI request failed' });
  }
});

// Vite middleware in dev or static server in prod
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
