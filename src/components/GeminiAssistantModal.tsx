import React, { useState, useRef } from 'react';
import { CircuitSchematic, CircuitComponent } from '../types/circuit.ts';
import { createNewComponent } from '../engine/pinLayouts.ts';
import { Sparkles, Mic, MicOff, Send, Loader2, Play, Code, Wrench, AlertCircle, Check } from 'lucide-react';

interface GeminiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  schematic: CircuitSchematic;
  onApplySynthesizedCircuit: (newComponents: CircuitComponent[], newWires: any[]) => void;
  onLoadAsmToIde: (code: string) => void;
}

export const GeminiAssistantModal: React.FC<GeminiAssistantModalProps> = ({
  isOpen,
  onClose,
  schematic,
  onApplySynthesizedCircuit,
  onLoadAsmToIde,
}) => {
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState<'gemini-3.5-flash' | 'gemini-3.1-pro-preview' | 'gemini-3.1-flash-lite'>('gemini-3.5-flash');
  const [actionType, setActionType] = useState<'chat' | 'generate_circuit' | 'generate_asm' | 'diagnose'>('chat');
  const [isLoading, setIsLoading] = useState(false);
  const [responseLog, setResponseLog] = useState<{ role: 'user' | 'assistant'; text: string; data?: any }[]>([
    {
      role: 'assistant',
      text: '👋 Welcome to MicroLogic AI Architect! You can speak via microphone or type requests like:\n• "Synthesize an XOR gate using only NAND gates"\n• "Write an 8-bit assembly program for factorial"\n• "Diagnose current circuit for timing hazards or floating pins"',
    },
  ]);

  // Audio Recording State for gemini-3.5-transcribe
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);

  if (!isOpen) return null;

  const startVoiceRecording = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        clearInterval(timerIntervalRef.current);
        setIsRecording(false);
        setRecordingSeconds(0);
        stream.getTracks().forEach((track) => track.stop());

        // Process audio blob to base64
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Data = (reader.result as string).split(',')[1];
          await transcribeAudio(base64Data);
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Microphone error:', err);
      alert('Could not access microphone. Please ensure microphone permissions are granted.');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  const transcribeAudio = async (base64Audio: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/gemini/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioData: base64Audio,
          mimeType: 'audio/webm',
        }),
      });

      const data = await res.json();
      if (data.text) {
        setPrompt(data.text);
      } else if (data.error) {
        alert(`Transcription error: ${data.error}`);
      }
    } catch (err: any) {
      console.error('Transcription request failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (overridePrompt?: string) => {
    const textToSend = overridePrompt || prompt;
    if (!textToSend.trim() || isLoading) return;

    setResponseLog((prev) => [...prev, { role: 'user', text: textToSend }]);
    setPrompt('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/gemini/circuit-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionType,
          prompt: textToSend,
          model,
          schematicData: {
            components: schematic.components.map((c) => ({
              id: c.id,
              type: c.type,
              label: c.label,
              data: c.data,
            })),
            wireCount: schematic.wires.length,
          },
        }),
      });

      const data = await res.json();
      if (data.text) {
        // Try parsing JSON if circuit synthesis was requested
        let parsedData = null;
        if (actionType === 'generate_circuit') {
          try {
            const jsonMatch = data.text.match(/```json\s*([\s\S]*?)\s*```/) || [null, data.text];
            parsedData = JSON.parse(jsonMatch[1]);
          } catch (e) {
            // Not JSON or parse failed
          }
        }

        setResponseLog((prev) => [
          ...prev,
          { role: 'assistant', text: data.text, data: parsedData },
        ]);
      } else {
        setResponseLog((prev) => [
          ...prev,
          { role: 'assistant', text: `Error: ${data.error || 'Unknown failure'}` },
        ]);
      }
    } catch (err: any) {
      setResponseLog((prev) => [
        ...prev,
        { role: 'assistant', text: `Network error: ${err.message}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyCircuit = (circuitJson: any) => {
    if (!circuitJson || !circuitJson.components) return;

    const newComponents: CircuitComponent[] = [];
    const idMap = new Map<number, string>();

    // Create components
    circuitJson.components.forEach((c: any, index: number) => {
      const comp = createNewComponent(c.type || 'AND', c.x || 100 + index * 120, c.y || 100);
      if (c.label) comp.label = c.label;
      newComponents.push(comp);
      idMap.set(index, comp.id);
    });

    // Create wires
    const newWires: any[] = [];
    if (circuitJson.wires) {
      circuitJson.wires.forEach((w: any, idx: number) => {
        const fromId = idMap.get(w.fromComp);
        const toId = idMap.get(w.toComp);
        if (fromId && toId) {
          newWires.push({
            id: `w_ai_${Date.now()}_${idx}`,
            fromComponentId: fromId,
            fromPinId: w.fromPin || 'out_y',
            toComponentId: toId,
            toPinId: w.toPin || 'in_a',
            state: 0,
          });
        }
      });
    }

    onApplySynthesizedCircuit(newComponents, newWires);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-[#0f172a] border border-slate-700 rounded-xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-700/80 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                MicroLogic AI Architect & Voice Synthesis
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {model}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Natural language hardware synthesis, voice commands & circuit diagnosis
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Model Selector */}
            <select
              value={model}
              onChange={(e: any) => setModel(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-2 py-1 focus:outline-none focus:border-indigo-500 font-mono"
            >
              <option value="gemini-3.5-flash">Gemini 3.5 Flash (Recommended)</option>
              <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Complex Reasoning)</option>
              <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash-Lite (Fast)</option>
            </select>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white px-2 py-1 rounded text-sm hover:bg-slate-800 transition"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Task Action Type Tabs */}
        <div className="px-5 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center gap-2 text-xs">
          <button
            onClick={() => setActionType('chat')}
            className={`px-3 py-1 rounded-md font-medium transition ${
              actionType === 'chat' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            Assistant Chat
          </button>
          <button
            onClick={() => setActionType('generate_circuit')}
            className={`px-3 py-1 rounded-md font-medium transition ${
              actionType === 'generate_circuit' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            Circuit Synthesis (Schematic)
          </button>
          <button
            onClick={() => setActionType('generate_asm')}
            className={`px-3 py-1 rounded-md font-medium transition ${
              actionType === 'generate_asm' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            Assembly Synthesis (Micro-8)
          </button>
          <button
            onClick={() => setActionType('diagnose')}
            className={`px-3 py-1 rounded-md font-medium transition ${
              actionType === 'diagnose' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            Diagnose Circuit Hazards
          </button>
        </div>

        {/* Chat / Response Scrollable Area */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-[#090d14]">
          {responseLog.map((item, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${item.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-xl p-3.5 text-xs leading-relaxed ${
                  item.role === 'user'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-900 border border-slate-800 text-slate-200'
                }`}
              >
                <div className="whitespace-pre-wrap font-sans">{item.text}</div>

                {/* If circuit JSON was synthesized, show Apply to Canvas button */}
                {item.data && item.data.components && (
                  <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-emerald-400 font-medium">
                      ✓ Synthesized {item.data.components.length} components
                    </span>
                    <button
                      onClick={() => handleApplyCircuit(item.data)}
                      className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold shadow-sm transition"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Place on Canvas
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-indigo-400 text-xs py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Gemini is generating digital logic & timing analysis...</span>
            </div>
          )}
        </div>

        {/* Input Bar & Voice Recording */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/90 flex flex-col gap-2">
          {isRecording && (
            <div className="flex items-center justify-between px-3 py-1.5 bg-red-950/60 border border-red-800 rounded-lg text-xs text-red-300 animate-pulse">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                <span>Recording audio with gemini-3.5-transcribe...</span>
              </div>
              <span className="font-mono font-bold">{recordingSeconds}s</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            {/* Microphone button */}
            <button
              onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
              className={`p-2 rounded-lg border transition flex items-center justify-center ${
                isRecording
                  ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-500/30'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
              title={isRecording ? 'Stop Recording' : 'Voice Input (gemini-3.5-transcribe)'}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-sky-400" />}
            </button>

            {/* Text prompt input */}
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmit();
              }}
              placeholder={
                actionType === 'generate_circuit'
                  ? 'Describe circuit to synthesize (e.g. 2-bit magnitude comparator)...'
                  : actionType === 'generate_asm'
                  ? 'Describe algorithm (e.g. calculate prime numbers)...'
                  : 'Ask about hardware design, timing glitches, or logic equations...'
              }
              className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition font-sans"
            />

            {/* Send button */}
            <button
              onClick={() => handleSubmit()}
              disabled={isLoading || !prompt.trim()}
              className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg transition shadow-md"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
