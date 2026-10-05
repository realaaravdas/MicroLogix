import React, { useRef, useEffect, useState, useCallback } from 'react';
import { CircuitComponent, CircuitSchematic, LogicState, Pin, Wire, WirePoint } from '../types/circuit.ts';
import { SEVEN_SEG_DECODE } from '../engine/simulation.ts';

interface SchematicCanvasProps {
  schematic: CircuitSchematic;
  selectedComponentId: string | null;
  selectedWireId: string | null;
  onSelectComponent: (id: string | null) => void;
  onSelectWire: (id: string | null) => void;
  onUpdateComponentPosition: (id: string, x: number, y: number) => void;
  onAddWire: (fromCompId: string, fromPinId: string, toCompId: string, toPinId: string) => void;
  onDeleteWire: (wireId: string) => void;
  onToggleSwitch: (componentId: string) => void;
  onPressButton: (componentId: string, pressed: boolean) => void;
  onDrillDown: (component: CircuitComponent) => void;
  isSimulating: boolean;
  gridSnap: boolean;
}

export const SchematicCanvas: React.FC<SchematicCanvasProps> = ({
  schematic,
  selectedComponentId,
  selectedWireId,
  onSelectComponent,
  onSelectWire,
  onUpdateComponentPosition,
  onAddWire,
  onDeleteWire,
  onToggleSwitch,
  onPressButton,
  onDrillDown,
  isSimulating,
  gridSnap,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Viewport pan & zoom
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  // Dragging component
  const [draggingCompId, setDraggingCompId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Wiring state
  const [wiringFrom, setWiringFrom] = useState<{ compId: string; pinId: string; pin: Pin } | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Animation pulse offset for active wires
  const [pulseOffset, setPulseOffset] = useState(0);

  useEffect(() => {
    let animId: number;
    const animate = () => {
      setPulseOffset((prev) => (prev + 0.5) % 20);
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Convert screen coordinates to world coordinates
  const screenToWorld = useCallback(
    (sx: number, sy: number) => {
      return {
        x: (sx - pan.x) / zoom,
        y: (sy - pan.y) / zoom,
      };
    },
    [pan, zoom]
  );

  // Convert world coordinates to screen coordinates
  const worldToScreen = useCallback(
    (wx: number, wy: number) => {
      return {
        x: wx * zoom + pan.x,
        y: wy * zoom + pan.y,
      };
    },
    [pan, zoom]
  );

  const getPinWorldPos = useCallback((comp: CircuitComponent, pin: Pin) => {
    return {
      x: comp.x + pin.x,
      y: comp.y + pin.y,
    };
  }, []);

  // Find pin under world coordinate
  const findPinAt = useCallback(
    (wx: number, wy: number, threshold = 12) => {
      for (const comp of schematic.components) {
        for (const pin of comp.pins) {
          const pinPos = getPinWorldPos(comp, pin);
          const dist = Math.hypot(wx - pinPos.x, wy - pinPos.y);
          if (dist <= threshold / zoom) {
            return { comp, pin };
          }
        }
      }
      return null;
    },
    [schematic.components, getPinWorldPos, zoom]
  );

  // Find component under world coordinate
  const findComponentAt = useCallback(
    (wx: number, wy: number) => {
      // Search top-to-bottom (reverse of draw order)
      for (let i = schematic.components.length - 1; i >= 0; i--) {
        const comp = schematic.components[i];
        if (
          wx >= comp.x &&
          wx <= comp.x + comp.width &&
          wy >= comp.y &&
          wy <= comp.y + comp.height
        ) {
          return comp;
        }
      }
      return null;
    },
    [schematic.components]
  );

  // Find wire near coordinate
  const findWireAt = useCallback(
    (wx: number, wy: number, threshold = 8) => {
      const compMap = new Map(schematic.components.map((c) => [c.id, c]));
      for (const wire of schematic.wires) {
        const fromComp = compMap.get(wire.fromComponentId);
        const toComp = compMap.get(wire.toComponentId);
        if (!fromComp || !toComp) continue;

        const fromPin = fromComp.pins.find((p) => p.id === wire.fromPinId);
        const toPin = toComp.pins.find((p) => p.id === wire.toPinId);
        if (!fromPin || !toPin) continue;

        const p1 = { x: fromComp.x + fromPin.x, y: fromComp.y + fromPin.y };
        const p2 = { x: toComp.x + toPin.x, y: toComp.y + toPin.y };

        // Simple Manhattan midpoint route
        const midX = (p1.x + p2.x) / 2;
        const dist1 = distToSegment(wx, wy, p1.x, p1.y, midX, p1.y);
        const dist2 = distToSegment(wx, wy, midX, p1.y, midX, p2.y);
        const dist3 = distToSegment(wx, wy, midX, p2.y, p2.x, p2.y);

        if (Math.min(dist1, dist2, dist3) <= threshold / zoom) {
          return wire;
        }
      }
      return null;
    },
    [schematic.components, schematic.wires, zoom]
  );

  // Helper for point-line segment distance
  function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
    const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
  }

  // Draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // Clear background
    ctx.fillStyle = '#090d14';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Apply pan & zoom
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // 1. Draw Grid
    drawGrid(ctx, rect.width, rect.height, pan, zoom);

    // 2. Draw Wires
    const compMap = new Map(schematic.components.map((c) => [c.id, c]));
    for (const wire of schematic.wires) {
      const isSelected = wire.id === selectedWireId;
      drawWire(ctx, wire, compMap, isSelected, pulseOffset);
    }

    // 3. Draw In-progress Wire
    if (wiringFrom) {
      const fromComp = compMap.get(wiringFrom.compId);
      if (fromComp) {
        const p1 = getPinWorldPos(fromComp, wiringFrom.pin);
        drawRubberbandWire(ctx, p1, mousePos);
      }
    }

    // 4. Draw Components
    for (const comp of schematic.components) {
      const isSelected = comp.id === selectedComponentId;
      drawComponent(ctx, comp, isSelected);
    }

    ctx.restore();
    ctx.restore();
  }, [
    schematic,
    selectedComponentId,
    selectedWireId,
    pan,
    zoom,
    wiringFrom,
    mousePos,
    pulseOffset,
    getPinWorldPos,
  ]);

  // Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const { x: wx, y: wy } = screenToWorld(sx, sy);

    // Middle click or Space+click initiates pan
    if (e.button === 1 || e.altKey) {
      setIsPanning(true);
      setStartPan({ x: sx - pan.x, y: sy - pan.y });
      return;
    }

    // Check if clicked on a pin to start wiring
    const pinHit = findPinAt(wx, wy);
    if (pinHit) {
      if (pinHit.pin.type === 'output' || pinHit.pin.type === 'bidir') {
        setWiringFrom({ compId: pinHit.comp.id, pinId: pinHit.pin.id, pin: pinHit.pin });
        setMousePos({ x: wx, y: wy });
        return;
      }
    }

    // Check if clicked on interactive component (Switch / Button)
    const compHit = findComponentAt(wx, wy);
    if (compHit) {
      if (compHit.type === 'SWITCH') {
        onToggleSwitch(compHit.id);
      } else if (compHit.type === 'PUSH_BUTTON') {
        onPressButton(compHit.id, true);
      }

      onSelectComponent(compHit.id);
      onSelectWire(null);
      setDraggingCompId(compHit.id);
      setDragOffset({ x: wx - compHit.x, y: wy - compHit.y });
      return;
    }

    // Check wire selection
    const wireHit = findWireAt(wx, wy);
    if (wireHit) {
      onSelectWire(wireHit.id);
      onSelectComponent(null);
      return;
    }

    // Clicked empty background: deselect, start panning
    onSelectComponent(null);
    onSelectWire(null);
    setIsPanning(true);
    setStartPan({ x: sx - pan.x, y: sy - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const { x: wx, y: wy } = screenToWorld(sx, sy);

    setMousePos({ x: wx, y: wy });

    if (isPanning) {
      setPan({ x: sx - startPan.x, y: sy - startPan.y });
      return;
    }

    if (draggingCompId) {
      let newX = wx - dragOffset.x;
      let newY = wy - dragOffset.y;
      if (gridSnap) {
        newX = Math.round(newX / 20) * 20;
        newY = Math.round(newY / 20) * 20;
      }
      onUpdateComponentPosition(draggingCompId, newX, newY);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const { x: wx, y: wy } = screenToWorld(sx, sy);

    // Complete wire if wiring
    if (wiringFrom) {
      const pinHit = findPinAt(wx, wy);
      if (pinHit && pinHit.comp.id !== wiringFrom.compId && pinHit.pin.type !== 'output') {
        onAddWire(wiringFrom.compId, wiringFrom.pinId, pinHit.comp.id, pinHit.pin.id);
      }
      setWiringFrom(null);
    }

    // Release push button
    if (selectedComponentId) {
      const comp = schematic.components.find((c) => c.id === selectedComponentId);
      if (comp && comp.type === 'PUSH_BUTTON') {
        onPressButton(comp.id, false);
      }
    }

    setIsPanning(false);
    setDraggingCompId(null);
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const { x: wx, y: wy } = screenToWorld(sx, sy);

    const compHit = findComponentAt(wx, wy);
    if (compHit && compHit.isHierarchical) {
      onDrillDown(compHit);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    const newZoom = Math.max(0.2, Math.min(3.5, zoom * zoomFactor));

    // Zoom centered on mouse pointer
    const wx = (sx - pan.x) / zoom;
    const wy = (sy - pan.y) / zoom;

    setPan({
      x: sx - wx * newZoom,
      y: sy - wy * newZoom,
    });
    setZoom(newZoom);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedWireId) {
      onDeleteWire(selectedWireId);
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden select-none outline-none" tabIndex={0} onKeyDown={handleKeyDown}>
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair block"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
      />

      {/* Floating Canvas Quick Controls */}
      <div className="absolute bottom-4 left-4 flex items-center gap-1.5 bg-[#0f172a]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/60 shadow-xl text-xs text-slate-300 font-mono">
        <button
          onClick={() => setZoom((z) => Math.min(3.5, z * 1.2))}
          className="p-1 hover:text-white hover:bg-slate-700/50 rounded transition"
          title="Zoom In"
        >
          +
        </button>
        <span className="w-12 text-center text-slate-400 font-semibold">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => setZoom((z) => Math.max(0.2, z / 1.2))}
          className="p-1 hover:text-white hover:bg-slate-700/50 rounded transition"
          title="Zoom Out"
        >
          -
        </button>
        <div className="w-[1px] h-3.5 bg-slate-700 mx-1" />
        <button
          onClick={() => {
            setZoom(1);
            setPan({ x: 50, y: 50 });
          }}
          className="px-2 py-0.5 hover:text-white hover:bg-slate-700/50 rounded transition"
          title="Fit & Reset View"
        >
          Reset
        </button>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// Canvas Drawing Helper Functions
// -------------------------------------------------------------

function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  pan: { x: number; y: number },
  zoom: number
) {
  const startX = -pan.x / zoom;
  const startY = -pan.y / zoom;
  const endX = startX + width / zoom;
  const endY = startY + height / zoom;

  const gridSize = 20;
  const majorGridSize = 100;

  const firstX = Math.floor(startX / gridSize) * gridSize;
  const firstY = Math.floor(startY / gridSize) * gridSize;

  // Minor dots / fine grid
  ctx.fillStyle = '#1e293b';
  for (let x = firstX; x <= endX; x += gridSize) {
    for (let y = firstY; y <= endY; y += gridSize) {
      if (x % majorGridSize === 0 && y % majorGridSize === 0) {
        ctx.fillStyle = '#334155';
        ctx.fillRect(x - 1, y - 1, 2, 2);
        ctx.fillStyle = '#1e293b';
      } else if (zoom >= 0.6) {
        ctx.fillRect(x - 0.5, y - 0.5, 1, 1);
      }
    }
  }
}

function drawWire(
  ctx: CanvasRenderingContext2D,
  wire: Wire,
  compMap: Map<string, CircuitComponent>,
  isSelected: boolean,
  pulseOffset: number
) {
  const fromComp = compMap.get(wire.fromComponentId);
  const toComp = compMap.get(wire.toComponentId);
  if (!fromComp || !toComp) return;

  const fromPin = fromComp.pins.find((p) => p.id === wire.fromPinId);
  const toPin = toComp.pins.find((p) => p.id === wire.toPinId);
  if (!fromPin || !toPin) return;

  const p1 = { x: fromComp.x + fromPin.x, y: fromComp.y + fromPin.y };
  const p2 = { x: toComp.x + toPin.x, y: toComp.y + toPin.y };

  // Calculate orthogonal Manhattan routing waypoints
  const midX = (p1.x + p2.x) / 2;

  // Signal State Color
  const state = wire.state;
  let wireColor = '#475569'; // Low (0) - dark slate
  let glowColor = 'transparent';

  if (state === 1 || (typeof state === 'number' && state > 0)) {
    wireColor = '#10b981'; // High (1) - neon emerald
    glowColor = 'rgba(16, 185, 129, 0.4)';
  } else if (state === 'Z') {
    wireColor = '#a855f7'; // High-Z - purple
  } else if (state === 'X') {
    wireColor = '#ef4444'; // Contention - red
    glowColor = 'rgba(239, 68, 68, 0.5)';
  }

  if (isSelected) {
    wireColor = '#38bdf8'; // Sky blue when selected
    glowColor = 'rgba(56, 189, 248, 0.6)';
  }

  ctx.save();

  // Glow shadow for active wires
  if (glowColor !== 'transparent') {
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 8;
  }

  ctx.strokeStyle = wireColor;
  const isBus = (fromPin.bits || 1) > 1;
  ctx.lineWidth = isBus ? 4 : (isSelected ? 3 : 2);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(midX, p1.y);
  ctx.lineTo(midX, p2.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();

  // Draw signal pulses on active 1 wires
  if ((state === 1 || (typeof state === 'number' && state > 0)) && !isSelected) {
    ctx.save();
    ctx.strokeStyle = '#6ee7b7';
    ctx.lineWidth = isBus ? 5 : 3;
    ctx.setLineDash([4, 16]);
    ctx.lineDashOffset = -pulseOffset;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(midX, p1.y);
    ctx.lineTo(midX, p2.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    ctx.restore();
  }

  // Draw Bus slash and value badge
  if (isBus) {
    const badgeX = midX;
    const badgeY = (p1.y + p2.y) / 2;

    ctx.save();
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = wireColor;
    ctx.lineWidth = 1;
    ctx.fillRect(badgeX - 16, badgeY - 8, 32, 16);
    ctx.strokeRect(badgeX - 16, badgeY - 8, 32, 16);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const displayNum = typeof state === 'number' ? `0x${state.toString(16).toUpperCase()}` : `${state}`;
    ctx.fillText(displayNum, badgeX, badgeY);
    ctx.restore();
  }

  // Draw connection dots at pin terminals
  ctx.fillStyle = wireColor;
  ctx.beginPath();
  ctx.arc(p1.x, p1.y, isBus ? 3.5 : 2.5, 0, Math.PI * 2);
  ctx.arc(p2.x, p2.y, isBus ? 3.5 : 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawRubberbandWire(
  ctx: CanvasRenderingContext2D,
  fromPos: { x: number; y: number },
  toPos: { x: number; y: number }
) {
  const midX = (fromPos.x + toPos.x) / 2;
  ctx.save();
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(fromPos.x, fromPos.y);
  ctx.lineTo(midX, fromPos.y);
  ctx.lineTo(midX, toPos.y);
  ctx.lineTo(toPos.x, toPos.y);
  ctx.stroke();
  ctx.restore();
}

function drawComponent(ctx: CanvasRenderingContext2D, comp: CircuitComponent, isSelected: boolean) {
  ctx.save();
  ctx.translate(comp.x, comp.y);

  // Selection outline
  if (isSelected) {
    ctx.save();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(-5, -5, comp.width + 10, comp.height + 10);
    ctx.restore();
  }

  // Component Specific Renderer
  switch (comp.type) {
    case 'AND':
      drawAndGate(ctx, comp);
      break;
    case 'OR':
      drawOrGate(ctx, comp);
      break;
    case 'NOT':
      drawNotGate(ctx, comp);
      break;
    case 'NAND':
      drawNandGate(ctx, comp);
      break;
    case 'NOR':
      drawNorGate(ctx, comp);
      break;
    case 'XOR':
      drawXorGate(ctx, comp);
      break;
    case 'XNOR':
      drawXnorGate(ctx, comp);
      break;
    case 'SWITCH':
      drawSwitch(ctx, comp);
      break;
    case 'PUSH_BUTTON':
      drawPushButton(ctx, comp);
      break;
    case 'CLOCK':
      drawClock(ctx, comp);
      break;
    case 'LED':
      drawLed(ctx, comp);
      break;
    case 'LED_BAR_8':
      drawLedBar(ctx, comp);
      break;
    case 'HEX_DISPLAY_7SEG':
      draw7SegmentDisplay(ctx, comp);
      break;
    case 'BUS_DISPLAY_8BIT':
      drawBusDisplay(ctx, comp);
      break;
    case 'VCC':
      drawVcc(ctx, comp);
      break;
    case 'GND':
      drawGnd(ctx, comp);
      break;
    default:
      // Generic IC Chip package
      drawIcBox(ctx, comp);
      break;
  }

  // Draw Pin Terminals & Labels
  drawPins(ctx, comp);

  ctx.restore();
}

// Draw Pin terminals and mini labels
function drawPins(ctx: CanvasRenderingContext2D, comp: CircuitComponent) {
  for (const pin of comp.pins) {
    ctx.save();
    const isHigh = pin.state === 1 || (typeof pin.state === 'number' && pin.state > 0);
    const pinColor = isHigh ? '#10b981' : '#64748b';

    ctx.fillStyle = pinColor;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(pin.x, pin.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Pin Label text
    ctx.font = '8.5px "JetBrains Mono", monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.textBaseline = 'middle';

    if (pin.x === 0) {
      // Left side input
      ctx.textAlign = 'left';
      ctx.fillText(pin.label, pin.x + 7, pin.y);
    } else if (pin.x === comp.width) {
      // Right side output
      ctx.textAlign = 'right';
      ctx.fillText(pin.label, pin.x - 7, pin.y);
    } else if (pin.y === comp.height) {
      // Bottom pin
      ctx.textAlign = 'center';
      ctx.fillText(pin.label, pin.x, pin.y - 8);
    } else {
      // Top pin
      ctx.textAlign = 'center';
      ctx.fillText(pin.label, pin.x, pin.y + 8);
    }

    ctx.restore();
  }
}

// -------------------------------------------------------------
// Component Visual Renderers
// -------------------------------------------------------------

function drawIcBox(ctx: CanvasRenderingContext2D, comp: CircuitComponent) {
  const w = comp.width;
  const h = comp.height;

  // Chip body
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#1e293b');
  grad.addColorStop(1, '#0f172a');
  ctx.fillStyle = grad;
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.roundRect(0, 0, w, h, 6);
  ctx.fill();
  ctx.stroke();

  // Chip notch on top
  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.arc(w / 2, 0, 5, 0, Math.PI);
  ctx.fill();

  // Chip Title / Label
  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 11px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(comp.label, w / 2, h / 2 - 6);

  // Subtitle / Type
  ctx.fillStyle = '#64748b';
  ctx.font = '9px "JetBrains Mono", monospace';
  ctx.fillText(comp.type, w / 2, h / 2 + 10);

  // Drilldown badge if hierarchical
  if (comp.isHierarchical) {
    ctx.fillStyle = '#38bdf8';
    ctx.font = '8px "Inter", sans-serif';
    ctx.fillText('⤢ Double-click to expand', w / 2, h - 8);
  }
}

function drawAndGate(ctx: CanvasRenderingContext2D, comp: CircuitComponent) {
  const w = comp.width;
  const h = comp.height;
  const r = h / 2;

  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(15, 0);
  ctx.lineTo(w - r, 0);
  ctx.arc(w - r, r, r, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(15, h);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Gate title
  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('AND', w / 2 - 5, r);
}

function drawOrGate(ctx: CanvasRenderingContext2D, comp: CircuitComponent) {
  const w = comp.width;
  const h = comp.height;
  const r = h / 2;

  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(10, 0);
  ctx.quadraticCurveTo(w * 0.45, 0, w - 8, r);
  ctx.quadraticCurveTo(w * 0.45, h, 10, h);
  ctx.quadraticCurveTo(25, r, 10, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('OR', w / 2 - 4, r);
}

function drawNotGate(ctx: CanvasRenderingContext2D, comp: CircuitComponent) {
  const w = comp.width;
  const h = comp.height;
  const r = 4;

  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;

  // Triangle
  ctx.beginPath();
  ctx.moveTo(12, 5);
  ctx.lineTo(w - r * 2 - 4, h / 2);
  ctx.lineTo(12, h - 5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Negation circle
  ctx.beginPath();
  ctx.arc(w - r - 4, h / 2, r, 0, Math.PI * 2);
  ctx.fillStyle = '#0f172a';
  ctx.fill();
  ctx.stroke();
}

function drawNandGate(ctx: CanvasRenderingContext2D, comp: CircuitComponent) {
  const w = comp.width;
  const h = comp.height;
  const r = h / 2;
  const bubbleR = 4;

  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(12, 0);
  ctx.lineTo(w - r - bubbleR * 2, 0);
  ctx.arc(w - r - bubbleR * 2, r, r, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(12, h);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Bubble
  ctx.beginPath();
  ctx.arc(w - bubbleR - 2, r, bubbleR, 0, Math.PI * 2);
  ctx.fillStyle = '#0f172a';
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#94a3b8';
  ctx.font = '9px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('NAND', w / 2 - 8, r);
}

function drawNorGate(ctx: CanvasRenderingContext2D, comp: CircuitComponent) {
  const w = comp.width;
  const h = comp.height;
  const r = h / 2;
  const bubbleR = 4;

  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(10, 0);
  ctx.quadraticCurveTo(w * 0.4, 0, w - bubbleR * 2 - 8, r);
  ctx.quadraticCurveTo(w * 0.4, h, 10, h);
  ctx.quadraticCurveTo(22, r, 10, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Bubble
  ctx.beginPath();
  ctx.arc(w - bubbleR - 2, r, bubbleR, 0, Math.PI * 2);
  ctx.fillStyle = '#0f172a';
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#94a3b8';
  ctx.font = '9px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('NOR', w / 2 - 8, r);
}

function drawXorGate(ctx: CanvasRenderingContext2D, comp: CircuitComponent) {
  const w = comp.width;
  const h = comp.height;
  const r = h / 2;

  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;

  // Back arc
  ctx.beginPath();
  ctx.moveTo(6, 0);
  ctx.quadraticCurveTo(20, r, 6, h);
  ctx.stroke();

  // Body
  ctx.beginPath();
  ctx.moveTo(14, 0);
  ctx.quadraticCurveTo(w * 0.45, 0, w - 8, r);
  ctx.quadraticCurveTo(w * 0.45, h, 14, h);
  ctx.quadraticCurveTo(26, r, 14, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('XOR', w / 2 - 2, r);
}

function drawXnorGate(ctx: CanvasRenderingContext2D, comp: CircuitComponent) {
  const w = comp.width;
  const h = comp.height;
  const r = h / 2;
  const bubbleR = 4;

  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;

  // Back arc
  ctx.beginPath();
  ctx.moveTo(6, 0);
  ctx.quadraticCurveTo(20, r, 6, h);
  ctx.stroke();

  // Body
  ctx.beginPath();
  ctx.moveTo(14, 0);
  ctx.quadraticCurveTo(w * 0.4, 0, w - bubbleR * 2 - 8, r);
  ctx.quadraticCurveTo(w * 0.4, h, 14, h);
  ctx.quadraticCurveTo(26, r, 14, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Bubble
  ctx.beginPath();
  ctx.arc(w - bubbleR - 2, r, bubbleR, 0, Math.PI * 2);
  ctx.fillStyle = '#0f172a';
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#94a3b8';
  ctx.font = '9px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('XNOR', w / 2 - 6, r);
}

function drawSwitch(ctx: CanvasRenderingContext2D, comp: CircuitComponent) {
  const w = comp.width;
  const h = comp.height;
  const isOn = !!comp.data.switchState;

  // Bezel
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(0, 0, w, h, 4);
  ctx.fill();
  ctx.stroke();

  // Switch track
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.roundRect(10, h / 2 - 7, 35, 14, 7);
  ctx.fill();

  // Switch knob
  ctx.fillStyle = isOn ? '#10b981' : '#64748b';
  if (isOn) {
    ctx.shadowColor = 'rgba(16, 185, 129, 0.6)';
    ctx.shadowBlur = 6;
  }
  const knobX = isOn ? 33 : 17;
  ctx.beginPath();
  ctx.arc(knobX, h / 2, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = isOn ? '#10b981' : '#94a3b8';
  ctx.font = 'bold 9px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(isOn ? '1' : '0', w / 2, 9);
}

function drawPushButton(ctx: CanvasRenderingContext2D, comp: CircuitComponent) {
  const w = comp.width;
  const h = comp.height;
  const isPressed = !!comp.data.buttonPressed;

  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(0, 0, w, h, 4);
  ctx.fill();
  ctx.stroke();

  // Round button
  ctx.fillStyle = isPressed ? '#ef4444' : '#b91c1c';
  if (isPressed) {
    ctx.shadowColor = 'rgba(239, 68, 68, 0.6)';
    ctx.shadowBlur = 8;
  }
  ctx.beginPath();
  ctx.arc(w / 2 - 5, h / 2, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 8px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PUSH', w / 2 - 5, h / 2 + 3);
}

function drawClock(ctx: CanvasRenderingContext2D, comp: CircuitComponent) {
  const w = comp.width;
  const h = comp.height;
  const outPin = comp.pins.find((p) => p.id === 'out_clk');
  const isHigh = outPin?.state === 1;

  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = isHigh ? '#10b981' : '#475569';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(0, 0, w, h, 6);
  ctx.fill();
  ctx.stroke();

  // Draw square wave glyph
  ctx.strokeStyle = isHigh ? '#10b981' : '#94a3b8';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(12, h / 2 + 5);
  ctx.lineTo(20, h / 2 + 5);
  ctx.lineTo(20, h / 2 - 5);
  ctx.lineTo(30, h / 2 - 5);
  ctx.lineTo(30, h / 2 + 5);
  ctx.lineTo(38, h / 2 + 5);
  ctx.stroke();

  // Blinking LED indicator
  ctx.fillStyle = isHigh ? '#10b981' : '#334155';
  if (isHigh) {
    ctx.shadowColor = '#10b981';
    ctx.shadowBlur = 8;
  }
  ctx.beginPath();
  ctx.arc(w - 14, 12, 3.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#64748b';
  ctx.font = '8px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`${comp.data.frequencyHz || 2}Hz`, w / 2 - 4, h - 6);
}

function drawLed(ctx: CanvasRenderingContext2D, comp: CircuitComponent) {
  const w = comp.width;
  const h = comp.height;
  const inPin = comp.pins.find((p) => p.id === 'in_d');
  const isOn = inPin?.state === 1 || (typeof inPin?.state === 'number' && inPin.state > 0);
  const color = comp.data.color || '#10b981';

  // Base
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(0, 0, w, h, 6);
  ctx.fill();
  ctx.stroke();

  // Glowing Bulb
  ctx.save();
  if (isOn) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 16;
    ctx.fillStyle = color;
  } else {
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#475569';
  }

  ctx.beginPath();
  ctx.arc(w / 2 + 4, h / 2, 12, 0, Math.PI * 2);
  ctx.fill();
  if (!isOn) ctx.stroke();

  // Inner bulb highlight
  if (isOn) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(w / 2 + 2, h / 2 - 3, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawLedBar(ctx: CanvasRenderingContext2D, comp: CircuitComponent) {
  const w = comp.width;
  const h = comp.height;
  const val = comp.data.hexValue ?? 0;

  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(0, 0, w, h, 6);
  ctx.fill();
  ctx.stroke();

  // 8 Bar LEDs (MSB bit 7 on left, LSB bit 0 on right)
  const startX = 22;
  const spacing = 11;
  for (let bit = 7; bit >= 0; bit--) {
    const bitOn = (val & (1 << bit)) !== 0;
    const x = startX + (7 - bit) * spacing;
    const y = h / 2;

    ctx.save();
    if (bitOn) {
      ctx.fillStyle = '#10b981';
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 6;
    } else {
      ctx.fillStyle = '#1e293b';
    }
    ctx.beginPath();
    ctx.roundRect(x - 3.5, y - 8, 7, 16, 2);
    ctx.fill();
    ctx.restore();
  }

  // Value text
  ctx.fillStyle = '#94a3b8';
  ctx.font = '8px "JetBrains Mono", monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`0x${val.toString(16).toUpperCase().padStart(2, '0')}`, w - 6, h - 4);
}

function draw7SegmentDisplay(ctx: CanvasRenderingContext2D, comp: CircuitComponent) {
  const w = comp.width;
  const h = comp.height;
  const hex = comp.data.hexValue ?? 0;
  const segs = SEVEN_SEG_DECODE[hex] || [0, 0, 0, 0, 0, 0, 0];

  // Bezel
  ctx.fillStyle = '#090d14';
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(0, 0, w, h, 6);
  ctx.fill();
  ctx.stroke();

  // Draw 7 segments: a, b, c, d, e, f, g
  const onColor = '#ef4444'; // classic ruby red LED
  const offColor = '#1e1b2e';

  const segW = 18;
  const segT = 3.5;
  const cx = w / 2 + 4;
  const cy = h / 2;

  // Segment a (top horizontal)
  drawHorizSegment(ctx, cx - segW / 2, cy - 22, segW, segT, segs[0] ? onColor : offColor);
  // Segment b (top right vertical)
  drawVertSegment(ctx, cx + segW / 2 - segT, cy - 20, segT, 16, segs[1] ? onColor : offColor);
  // Segment c (bottom right vertical)
  drawVertSegment(ctx, cx + segW / 2 - segT, cy + 2, segT, 16, segs[2] ? onColor : offColor);
  // Segment d (bottom horizontal)
  drawHorizSegment(ctx, cx - segW / 2, cy + 18, segW, segT, segs[3] ? onColor : offColor);
  // Segment e (bottom left vertical)
  drawVertSegment(ctx, cx - segW / 2, cy + 2, segT, 16, segs[4] ? onColor : offColor);
  // Segment f (top left vertical)
  drawVertSegment(ctx, cx - segW / 2, cy - 20, segT, 16, segs[5] ? onColor : offColor);
  // Segment g (middle horizontal)
  drawHorizSegment(ctx, cx - segW / 2, cy - 1, segW, segT, segs[6] ? onColor : offColor);

  // Decimal Point (DP)
  ctx.fillStyle = offColor;
  ctx.beginPath();
  ctx.arc(cx + segW / 2 + 5, cy + 18, 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawHorizSegment(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string
) {
  ctx.save();
  ctx.fillStyle = color;
  if (color !== '#1e1b2e') {
    ctx.shadowColor = 'rgba(239, 68, 68, 0.7)';
    ctx.shadowBlur = 6;
  }
  ctx.beginPath();
  ctx.moveTo(x + h, y);
  ctx.lineTo(x + w - h, y);
  ctx.lineTo(x + w, y + h / 2);
  ctx.lineTo(x + w - h, y + h);
  ctx.lineTo(x + h, y + h);
  ctx.lineTo(x, y + h / 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawVertSegment(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string
) {
  ctx.save();
  ctx.fillStyle = color;
  if (color !== '#1e1b2e') {
    ctx.shadowColor = 'rgba(239, 68, 68, 0.7)';
    ctx.shadowBlur = 6;
  }
  ctx.beginPath();
  ctx.moveTo(x, y + w);
  ctx.lineTo(x + w / 2, y);
  ctx.lineTo(x + w, y + w);
  ctx.lineTo(x + w, y + h - w);
  ctx.lineTo(x + w / 2, y + h);
  ctx.lineTo(x, y + h - w);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawBusDisplay(ctx: CanvasRenderingContext2D, comp: CircuitComponent) {
  const w = comp.width;
  const h = comp.height;
  const val = comp.data.hexValue ?? 0;

  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(0, 0, w, h, 6);
  ctx.fill();
  ctx.stroke();

  // Title
  ctx.fillStyle = '#94a3b8';
  ctx.font = '8px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('BUS VALUE', w / 2 + 6, 12);

  // Big Hex & Decimal Readout
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 13px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`0x${val.toString(16).toUpperCase().padStart(2, '0')}`, w / 2 + 6, 26);

  ctx.fillStyle = '#64748b';
  ctx.font = '9px "JetBrains Mono", monospace';
  ctx.fillText(`dec: ${val}`, w / 2 + 6, 38);
}

function drawVcc(ctx: CanvasRenderingContext2D, comp: CircuitComponent) {
  const w = comp.width;
  const h = comp.height;

  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(w / 2, h);
  ctx.lineTo(w / 2, 10);
  ctx.stroke();

  // VCC bar
  ctx.beginPath();
  ctx.moveTo(w / 2 - 10, 10);
  ctx.lineTo(w / 2 + 10, 10);
  ctx.stroke();

  ctx.fillStyle = '#ef4444';
  ctx.font = 'bold 9px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('VCC (+5V)', w / 2, 6);
}

function drawGnd(ctx: CanvasRenderingContext2D, comp: CircuitComponent) {
  const w = comp.width;

  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(w / 2, 0);
  ctx.lineTo(w / 2, 14);
  ctx.stroke();

  // GND 3 stepped bars
  ctx.beginPath();
  ctx.moveTo(w / 2 - 10, 14);
  ctx.lineTo(w / 2 + 10, 14);
  ctx.moveTo(w / 2 - 6, 18);
  ctx.lineTo(w / 2 + 6, 18);
  ctx.moveTo(w / 2 - 2, 22);
  ctx.lineTo(w / 2 + 2, 22);
  ctx.stroke();

  ctx.fillStyle = '#64748b';
  ctx.font = '8px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('GND', w / 2, 28);
}
