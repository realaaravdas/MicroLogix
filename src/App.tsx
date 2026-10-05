/**
 * MicroLogic CAD - Real-Time Hardware Schematic Designer & CPU Logic Emulator
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  CircuitComponent,
  CircuitSchematic,
  ComponentType,
  LogicAnalyzerChannel,
  LogicAnalyzerSample,
  Wire,
} from './types/circuit.ts';
import { createNewComponent } from './engine/pinLayouts.ts';
import { TEMPLATES } from './engine/templates.ts';
import {
  createSimulationContext,
  SimulationContext,
  tickSimulation,
} from './engine/simulation.ts';
import {
  CpuState,
  createInitialCpuState,
  stepCpuInstruction,
  stepCpuMicro,
} from './engine/cpu8.ts';
import { BreadcrumbItem, getInternalSubCircuit } from './engine/hierarchical.ts';

// UI Components
import { SchematicCanvas } from './components/SchematicCanvas.tsx';
import { ComponentLibraryDrawer } from './components/ComponentLibraryDrawer.tsx';
import { LogicAnalyzer } from './components/LogicAnalyzer.tsx';
import { CpuDebugPanel } from './components/CpuDebugPanel.tsx';
import { AssemblyEditorModal } from './components/AssemblyEditorModal.tsx';
import { PrebuiltTemplatesModal } from './components/PrebuiltTemplatesModal.tsx';
import { GeminiAssistantModal } from './components/GeminiAssistantModal.tsx';

// Icons
import {
  Cpu,
  Layers,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Code,
  FolderOpen,
  Grid,
  Trash2,
  Activity,
  Sliders,
  ChevronRight,
  Home,
  Mic,
  Maximize2,
} from 'lucide-react';

export default function App() {
  // Initialize with Micro-8 Computer System template by default
  const [schematic, setSchematic] = useState<CircuitSchematic>(() => TEMPLATES[0].create());

  // Breadcrumb stack for sub-circuit drill down
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { id: 'root', name: 'Top Schematic', schematic: TEMPLATES[0].create() },
  ]);

  // Selected item on canvas
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [selectedWireId, setSelectedWireId] = useState<string | null>(null);

  // Simulation run state
  const [isSimulating, setIsSimulating] = useState(true);
  const [masterClockHz, setMasterClockHz] = useState<number>(2);
  const [gridSnap, setGridSnap] = useState(true);

  // Side drawers & Modals
  const [isLibraryOpen, setIsLibraryOpen] = useState(true);
  const [isCpuPanelOpen, setIsCpuPanelOpen] = useState(true);
  const [isAnalyzerOpen, setIsAnalyzerOpen] = useState(false);
  const [isAssemblyOpen, setIsAssemblyOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isGeminiOpen, setIsGeminiOpen] = useState(false);

  // Simulation engine context
  const simContextRef = useRef<SimulationContext>(createSimulationContext());

  // Logic Analyzer channels & waveform buffer
  const [analyzerChannels] = useState<LogicAnalyzerChannel[]>([
    { id: 'CLK', label: 'CLK', color: '#10b981', type: 'bit', bits: 1 },
    { id: 'PC', label: 'PC [3:0]', color: '#f59e0b', type: 'bus', bits: 4 },
    { id: 'MAR', label: 'MAR [3:0]', color: '#a855f7', type: 'bus', bits: 4 },
    { id: 'BUS', label: 'DATA BUS', color: '#38bdf8', type: 'bus', bits: 8 },
    { id: 'A_REG', label: 'ACC (A)', color: '#34d399', type: 'bus', bits: 8 },
    { id: 'OUT_REG', label: 'OUT', color: '#ec4899', type: 'bus', bits: 8 },
    { id: 'T_STATE', label: 'T-STATE', color: '#818cf8', type: 'bus', bits: 4 },
  ]);
  const [analyzerSamples, setAnalyzerSamples] = useState<LogicAnalyzerSample[]>([]);

  // CPU state (extracted from CPU_MICRO8 on canvas)
  const [activeCpuState, setActiveCpuState] = useState<CpuState>(createInitialCpuState());

  // Find active CPU component if any
  const cpuComponent = schematic.components.find((c) => c.type === 'CPU_MICRO8');

  // Sync Master Clock Hz to clock components
  const updateClockFrequencies = (hz: number) => {
    setMasterClockHz(hz);
    setSchematic((prev) => ({
      ...prev,
      components: prev.components.map((c) => {
        if (c.type === 'CLOCK') {
          return { ...c, data: { ...c.data, frequencyHz: hz } };
        }
        return c;
      }),
    }));
  };

  // Real-time Simulation Tick Loop (60 FPS)
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const dt = currentTime - lastTime;
      lastTime = currentTime;

      if (isSimulating) {
        setSchematic((prev) => {
          const { schematic: nextSchematic, context } = tickSimulation(
            { ...prev },
            simContextRef.current,
            dt
          );
          simContextRef.current = context;

          // Sample Logic Analyzer every ~100ms or on clock edge
          const cpu = nextSchematic.components.find((c) => c.type === 'CPU_MICRO8');
          const clk = nextSchematic.components.find((c) => c.type === 'CLOCK');
          const cpuState = cpu ? context.cpuStates[cpu.id] || createInitialCpuState() : null;

          if (cpuState) {
            setActiveCpuState({ ...cpuState });
          }

          return nextSchematic;
        });
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isSimulating]);

  // Periodic Logic Analyzer Sampler
  useEffect(() => {
    if (!isSimulating) return;
    const interval = setInterval(() => {
      const cpu = schematic.components.find((c) => c.type === 'CPU_MICRO8');
      const clk = schematic.components.find((c) => c.type === 'CLOCK');
      const cpuState = cpu ? simContextRef.current.cpuStates[cpu.id] || activeCpuState : null;
      const clkPin = clk?.pins.find((p) => p.id === 'out_clk');

      setAnalyzerSamples((prev) => {
        const next = [
          ...prev,
          {
            cycle: prev.length,
            timestamp: Date.now(),
            signals: {
              CLK: clkPin?.state ?? 0,
              PC: cpuState ? cpuState.pc : 0,
              MAR: cpuState ? cpuState.mar : 0,
              BUS: cpuState ? cpuState.bus : 0,
              A_REG: cpuState ? cpuState.a : 0,
              OUT_REG: cpuState ? cpuState.out : 0,
              T_STATE: cpuState ? cpuState.tState : 0,
            },
          },
        ];
        return next.slice(-200); // keep last 200 cycles
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isSimulating, schematic.components, activeCpuState]);

  // Single step clock pulse
  const handleSingleStepClock = () => {
    setSchematic((prev) => {
      // Toggle clock from 0 to 1 then 0
      const nextSchematic = { ...prev };
      const { schematic: res, context } = tickSimulation(
        nextSchematic,
        simContextRef.current,
        500
      );
      simContextRef.current = context;

      const cpu = res.components.find((c) => c.type === 'CPU_MICRO8');
      if (cpu) {
        const cpuState = context.cpuStates[cpu.id];
        if (cpuState) setActiveCpuState({ ...cpuState });
      }

      return res;
    });
  };

  // Add component onto canvas
  const handleAddComponent = (type: ComponentType) => {
    const newComp = createNewComponent(type, 300, 200);
    if (type === 'CLOCK') {
      newComp.data.frequencyHz = masterClockHz;
    }
    setSchematic((prev) => ({
      ...prev,
      components: [...prev.components, newComp],
    }));
    setSelectedComponentId(newComp.id);
  };

  // Update component position
  const handleUpdateComponentPosition = (id: string, x: number, y: number) => {
    setSchematic((prev) => ({
      ...prev,
      components: prev.components.map((c) => (c.id === id ? { ...c, x, y } : c)),
    }));
  };

  // Connect wire
  const handleAddWire = (
    fromCompId: string,
    fromPinId: string,
    toCompId: string,
    toPinId: string
  ) => {
    // Avoid duplicate wire
    const exists = schematic.wires.some(
      (w) =>
        (w.fromComponentId === fromCompId &&
          w.fromPinId === fromPinId &&
          w.toComponentId === toCompId &&
          w.toPinId === toPinId) ||
        (w.fromComponentId === toCompId &&
          w.fromPinId === toPinId &&
          w.toComponentId === fromCompId &&
          w.toPinId === fromPinId)
    );
    if (exists) return;

    const newWire: Wire = {
      id: `w_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      fromComponentId: fromCompId,
      fromPinId: fromPinId,
      toComponentId: toCompId,
      toPinId: toPinId,
      state: 0,
    };

    setSchematic((prev) => ({
      ...prev,
      wires: [...prev.wires, newWire],
    }));
  };

  // Delete wire
  const handleDeleteWire = (wireId: string) => {
    setSchematic((prev) => ({
      ...prev,
      wires: prev.wires.filter((w) => w.id !== wireId),
    }));
    if (selectedWireId === wireId) setSelectedWireId(null);
  };

  // Delete selected component
  const handleDeleteComponent = (compId: string) => {
    setSchematic((prev) => ({
      ...prev,
      components: prev.components.filter((c) => c.id !== compId),
      wires: prev.wires.filter(
        (w) => w.fromComponentId !== compId && w.toComponentId !== compId
      ),
    }));
    if (selectedComponentId === compId) setSelectedComponentId(null);
  };

  // Toggle Switch directly on canvas
  const handleToggleSwitch = (compId: string) => {
    setSchematic((prev) => ({
      ...prev,
      components: prev.components.map((c) => {
        if (c.id === compId && c.type === 'SWITCH') {
          return {
            ...c,
            data: { ...c.data, switchState: !c.data.switchState },
          };
        }
        return c;
      }),
    }));
  };

  // Press Push Button
  const handlePressButton = (compId: string, pressed: boolean) => {
    setSchematic((prev) => ({
      ...prev,
      components: prev.components.map((c) => {
        if (c.id === compId && c.type === 'PUSH_BUTTON') {
          return {
            ...c,
            data: { ...c.data, buttonPressed: pressed },
          };
        }
        return c;
      }),
    }));
  };

  // Drill down into internal sub-circuit (Gate level view)
  const handleDrillDown = (component: CircuitComponent) => {
    const sub = getInternalSubCircuit(component);
    if (!sub) return;

    setBreadcrumbs((prev) => [
      ...prev,
      { id: sub.id, name: sub.name, componentType: component.type, schematic },
    ]);
    setSchematic(sub);
    setSelectedComponentId(null);
    setSelectedWireId(null);
  };

  // Return to previous level in hierarchy
  const handleBreadcrumbClick = (index: number) => {
    if (index === breadcrumbs.length - 1) return;
    const target = breadcrumbs[index];
    setSchematic(target.schematic);
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
    setSelectedComponentId(null);
    setSelectedWireId(null);
  };

  // Load new template
  const handleSelectTemplate = (newSchematic: CircuitSchematic) => {
    setSchematic(newSchematic);
    setBreadcrumbs([{ id: 'root', name: newSchematic.name, schematic: newSchematic }]);
    setSelectedComponentId(null);
    setSelectedWireId(null);
    simContextRef.current = createSimulationContext();
    setAnalyzerSamples([]);
  };

  // Load assembled code into CPU RAM
  const handleLoadProgramToMemory = (bytes: number[]) => {
    setSchematic((prev) => ({
      ...prev,
      components: prev.components.map((c) => {
        if (c.type === 'CPU_MICRO8' || c.type === 'RAM_16B') {
          return {
            ...c,
            data: { ...c.data, memory: [...bytes] },
          };
        }
        return c;
      }),
    }));

    // Reset CPU
    if (cpuComponent) {
      simContextRef.current.cpuStates[cpuComponent.id] = createInitialCpuState();
      setActiveCpuState(createInitialCpuState());
    }
  };

  // Reset circuit & CPU
  const handleResetCircuit = () => {
    simContextRef.current = createSimulationContext();
    setActiveCpuState(createInitialCpuState());
    setAnalyzerSamples([]);
  };

  // Clear canvas
  const handleClearCanvas = () => {
    if (confirm('Clear all components and wires from schematic?')) {
      setSchematic({
        id: 'empty',
        name: 'Empty Schematic',
        description: 'New blank schematic',
        components: [],
        wires: [],
      });
      setSelectedComponentId(null);
      setSelectedWireId(null);
      handleResetCircuit();
    }
  };

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-[#090d14] text-slate-100 font-sans">
      {/* Top Application Bar */}
      <header className="h-14 bg-[#0f172a] border-b border-slate-800 px-4 flex items-center justify-between z-30 select-none shrink-0 shadow-md">
        {/* Brand & Breadcrumbs */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-bold text-sm tracking-wide text-white">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Cpu className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="bg-gradient-to-r from-sky-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent font-extrabold text-base">
                MicroLogic CAD
              </span>
              <span className="hidden sm:inline text-[10px] text-slate-400 ml-1.5 font-mono px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700/60">
                v2.5 FPGA/ASIC
              </span>
            </div>
          </div>

          <div className="hidden lg:block w-[1px] h-5 bg-slate-700/80 mx-1" />

          {/* Hierarchical Breadcrumb Navigation */}
          <div className="hidden lg:flex items-center gap-1 text-xs font-mono">
            {breadcrumbs.map((item, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <div key={item.id} className="flex items-center gap-1">
                  <button
                    onClick={() => handleBreadcrumbClick(idx)}
                    className={`px-2 py-0.5 rounded transition ${
                      isLast
                        ? 'text-sky-400 bg-sky-500/10 font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {idx === 0 ? <Home className="w-3 h-3 inline mr-1" /> : null}
                    {item.name}
                  </button>
                  {!isLast && <ChevronRight className="w-3 h-3 text-slate-600" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Controls & Hardware Tools */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Drawer Toggles */}
          <button
            onClick={() => setIsLibraryOpen(!isLibraryOpen)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              isLibraryOpen
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
            title="Component Library Drawer"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Components</span>
          </button>

          <button
            onClick={() => setIsTemplatesOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition"
            title="Pre-built Templates"
          >
            <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Templates</span>
          </button>

          <button
            onClick={() => setIsAssemblyOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition"
            title="Assembly IDE & Compiler"
          >
            <Code className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden md:inline">Assembly IDE</span>
          </button>

          <button
            onClick={() => setIsGeminiOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-lg text-xs font-bold transition shadow-md shadow-indigo-600/25"
            title="Gemini AI Hardware Synthesis & Voice Transcription"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span>AI Copilot</span>
            <Mic className="w-3 h-3 text-sky-200" />
          </button>

          <div className="w-[1px] h-5 bg-slate-700/80 mx-0.5" />

          {/* Clock Run / Pause */}
          <button
            onClick={() => setIsSimulating(!isSimulating)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm ${
              isSimulating
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20'
                : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-500/20'
            }`}
          >
            {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isSimulating ? 'Running' : 'Paused'}</span>
          </button>

          {/* Clock Hz Selector */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-800/90 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-300 font-mono">
            <span className="text-slate-500 text-[10px]">FREQ:</span>
            <select
              value={masterClockHz}
              onChange={(e) => updateClockFrequencies(Number(e.target.value))}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="0.5" className="bg-slate-900">0.5 Hz</option>
              <option value="1" className="bg-slate-900">1 Hz</option>
              <option value="2" className="bg-slate-900">2 Hz</option>
              <option value="5" className="bg-slate-900">5 Hz</option>
              <option value="10" className="bg-slate-900">10 Hz</option>
              <option value="50" className="bg-slate-900">50 Hz</option>
            </select>
          </div>

          {/* Step Clock */}
          <button
            onClick={handleSingleStepClock}
            disabled={isSimulating}
            className="hidden sm:flex items-center px-2 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-200 border border-slate-700 rounded-lg text-xs font-mono transition"
            title="Step Clock 1 Tick"
          >
            Step ⇥
          </button>

          {/* Reset */}
          <button
            onClick={handleResetCircuit}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition"
            title="Reset Logic States"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Grid Snap Toggle */}
          <button
            onClick={() => setGridSnap(!gridSnap)}
            className={`p-1.5 rounded-lg transition ${
              gridSnap ? 'text-sky-400 bg-sky-500/10' : 'text-slate-500 hover:bg-slate-800'
            }`}
            title={gridSnap ? 'Grid Snap: On (20px)' : 'Grid Snap: Off'}
          >
            <Grid className="w-4 h-4" />
          </button>

          {/* Oscilloscope Toggle */}
          <button
            onClick={() => setIsAnalyzerOpen(!isAnalyzerOpen)}
            className={`p-1.5 rounded-lg transition ${
              isAnalyzerOpen ? 'text-sky-400 bg-sky-500/15' : 'text-slate-400 hover:bg-slate-800'
            }`}
            title="Toggle Logic Analyzer & Oscilloscope"
          >
            <Activity className="w-4 h-4" />
          </button>

          {/* Clear Canvas */}
          <button
            onClick={handleClearCanvas}
            className="p-1.5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition"
            title="Clear Schematic"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Workspace Split Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Visual Component Library Drawer */}
        <ComponentLibraryDrawer
          isOpen={isLibraryOpen}
          onClose={() => setIsLibraryOpen(false)}
          onAddComponent={handleAddComponent}
        />

        {/* Central CAD Schematic Canvas */}
        <main
          className="flex-1 h-full relative"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const compType = e.dataTransfer.getData('text/plain') as ComponentType;
            if (compType) {
              const rect = e.currentTarget.getBoundingClientRect();
              const newComp = createNewComponent(
                compType,
                Math.round((e.clientX - rect.left - 50) / 20) * 20,
                Math.round((e.clientY - rect.top - 20) / 20) * 20
              );
              setSchematic((prev) => ({
                ...prev,
                components: [...prev.components, newComp],
              }));
              setSelectedComponentId(newComp.id);
            }
          }}
        >
          <SchematicCanvas
            schematic={schematic}
            selectedComponentId={selectedComponentId}
            selectedWireId={selectedWireId}
            onSelectComponent={setSelectedComponentId}
            onSelectWire={setSelectedWireId}
            onUpdateComponentPosition={handleUpdateComponentPosition}
            onAddWire={handleAddWire}
            onDeleteWire={handleDeleteWire}
            onToggleSwitch={handleToggleSwitch}
            onPressButton={handlePressButton}
            onDrillDown={handleDrillDown}
            isSimulating={isSimulating}
            gridSnap={gridSnap}
          />

          {/* Floating Selected Component Toolbar */}
          {selectedComponentId && (
            <div className="absolute top-4 right-4 bg-[#0f172a]/95 backdrop-blur-md border border-slate-700/80 px-3.5 py-2 rounded-xl shadow-2xl flex items-center gap-3 text-xs text-slate-200 z-10 animate-in fade-in slide-in-from-top-2">
              {(() => {
                const comp = schematic.components.find((c) => c.id === selectedComponentId);
                if (!comp) return null;
                return (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sky-400 font-mono">{comp.type}</span>
                      <span className="text-slate-400 text-[11px] truncate max-w-[120px]">
                        {comp.label}
                      </span>
                    </div>

                    {comp.isHierarchical && (
                      <button
                        onClick={() => handleDrillDown(comp)}
                        className="px-2 py-1 bg-sky-600/30 hover:bg-sky-600/50 text-sky-300 border border-sky-500/40 rounded text-[11px] font-semibold transition"
                      >
                        Drill Down ⤢
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteComponent(comp.id)}
                      className="text-red-400 hover:text-red-300 p-1 hover:bg-red-500/20 rounded transition"
                      title="Delete Component"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                );
              })()}
            </div>
          )}
        </main>

        {/* Right Side: Micro-8 CPU Debugger & Architecture Monitor */}
        {isCpuPanelOpen && cpuComponent && (
          <aside className="h-full z-10 shrink-0">
            <CpuDebugPanel
              cpuState={activeCpuState}
              memory={cpuComponent.data.memory || new Array(16).fill(0)}
              onUpdateCpu={(nextState, nextMemory) => {
                setActiveCpuState(nextState);
                setSchematic((prev) => ({
                  ...prev,
                  components: prev.components.map((c) =>
                    c.id === cpuComponent.id
                      ? { ...c, data: { ...c.data, memory: nextMemory } }
                      : c
                  ),
                }));
              }}
              onOpenAssemblyEditor={() => setIsAssemblyOpen(true)}
              onResetCpu={handleResetCircuit}
            />
          </aside>
        )}
      </div>

      {/* Bottom Collapsible Logic Analyzer & Timing Waveforms */}
      {isAnalyzerOpen && (
        <div className="h-56 z-20 shrink-0">
          <LogicAnalyzer
            samples={analyzerSamples}
            channels={analyzerChannels}
            onClearSamples={() => setAnalyzerSamples([])}
            isSimulating={isSimulating}
            onToggleSimulation={() => setIsSimulating(!isSimulating)}
            onStepClock={handleSingleStepClock}
          />
        </div>
      )}

      {/* Assembly IDE & Machine Code Compiler Modal */}
      <AssemblyEditorModal
        isOpen={isAssemblyOpen}
        onClose={() => setIsAssemblyOpen(false)}
        onLoadProgramToMemory={handleLoadProgramToMemory}
      />

      {/* Pre-built Hardware Templates Modal */}
      <PrebuiltTemplatesModal
        isOpen={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
        onSelectTemplate={handleSelectTemplate}
      />

      {/* Gemini AI Hardware Assistant & Audio Transcription Modal */}
      <GeminiAssistantModal
        isOpen={isGeminiOpen}
        onClose={() => setIsGeminiOpen(false)}
        schematic={schematic}
        onApplySynthesizedCircuit={(newComps, newWires) => {
          setSchematic((prev) => ({
            ...prev,
            components: [...prev.components, ...newComps],
            wires: [...prev.wires, ...newWires],
          }));
        }}
        onLoadAsmToIde={(code) => {
          setIsAssemblyOpen(true);
        }}
      />
    </div>
  );
}
