import React, { useRef, useState, useEffect } from "react";
import { RoadSegment } from "./road-segment";
import { AmbulanceOverlay } from "./ambulance-overlay";
import type { TrafficState } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface IntersectionProps {
  state: TrafficState | undefined;
}

export function Intersection({ state }: IntersectionProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [gridSize, setGridSize] = useState(600);

  useEffect(() => {
    if (!gridRef.current) return;
    const obs = new ResizeObserver(() => {
      if (gridRef.current) setGridSize(gridRef.current.offsetWidth);
    });
    obs.observe(gridRef.current);
    return () => obs.disconnect();
  }, []);

  if (!state || !state.roads)
    return (
      <div className="w-full aspect-square flex items-center justify-center text-muted-foreground font-mono">
        NO SIGNAL DATA
      </div>
    );

  const northRoad = state.roads.find((r) => r.direction === "north");
  const southRoad = state.roads.find((r) => r.direction === "south");
  const eastRoad  = state.roads.find((r) => r.direction === "east");
  const westRoad  = state.roads.find((r) => r.direction === "west");

  const countdown      = state.countdown ?? 0;
  const greenDuration  = state.greenDuration ?? state.cycleTime ?? 10;
  const isYellow       = state.roads.some((r) => r.signal === "yellow");
  const isEmergency    = state.emergencyMode;
  const amb            = state.ambulance;
  const isAmbulance    = amb?.active ?? false;

  const R    = 38;
  const CIRC = 2 * Math.PI * R;
  const pct  = greenDuration > 0 ? Math.min(1, countdown / greenDuration) : 0;
  const dashOffset = CIRC * (1 - pct);

  const ringColor = isAmbulance
    ? "#ef4444"
    : isEmergency
    ? "#ef4444"
    : isYellow
    ? "#facc15"
    : "#22d3ee";

  return (
    <div className="relative w-full max-w-[800px] aspect-square mx-auto bg-black/40 rounded-3xl p-8 glass-panel overflow-hidden shadow-2xl flex items-center justify-center">
      {/* Corner decorations */}
      <div className="absolute top-4 left-4   w-16 h-16 border-t-2 border-l-2 border-primary/30 rounded-tl-xl" />
      <div className="absolute top-4 right-4  w-16 h-16 border-t-2 border-r-2 border-primary/30 rounded-tr-xl" />
      <div className="absolute bottom-4 left-4  w-16 h-16 border-b-2 border-l-2 border-primary/30 rounded-bl-xl" />
      <div className="absolute bottom-4 right-4 w-16 h-16 border-b-2 border-r-2 border-primary/30 rounded-br-xl" />

      {/* Ambulance mode outer ring glow */}
      <AnimatePresence>
        {isAmbulance && (
          <motion.div
            key="amb-glow"
            className="absolute inset-2 rounded-3xl border-2 border-red-500/50 pointer-events-none"
            animate={{ opacity: [0.4, 0.9, 0.4] }}
            transition={{ repeat: Infinity, duration: 0.8 }}
          />
        )}
      </AnimatePresence>

      {/* 3×3 grid */}
      <div
        ref={gridRef}
        className="w-[600px] h-[600px] grid grid-cols-3 grid-rows-3 gap-0 relative shadow-2xl"
      >
        {/* Row 1 */}
        <div className="col-start-1 bg-zinc-950/50 rounded-tl-2xl" />
        <div className="col-start-2 row-start-1">
          {northRoad && <RoadSegment road={northRoad} position="north" />}
        </div>
        <div className="col-start-3 bg-zinc-950/50 rounded-tr-2xl" />

        {/* Row 2 */}
        <div className="col-start-1 row-start-2">
          {westRoad && <RoadSegment road={westRoad} position="west" />}
        </div>

        {/* CENTER */}
        <div className="col-start-2 row-start-2 relative bg-zinc-900 border-4 border-dashed border-yellow-500/20 flex items-center justify-center overflow-hidden z-0">
          <div className="absolute inset-0 bg-yellow-500/5 opacity-50" />

          {/* Crosswalk markings */}
          <div className="absolute top-2 left-4 right-4 h-4 border-x-4 border-dashed border-white/20" />
          <div className="absolute bottom-2 left-4 right-4 h-4 border-x-4 border-dashed border-white/20" />
          <div className="absolute left-2 top-4 bottom-4 w-4 border-y-4 border-dashed border-white/20" />
          <div className="absolute right-2 top-4 bottom-4 w-4 border-y-4 border-dashed border-white/20" />

          {/* Countdown ring */}
          {!isAmbulance && (
            <div className="relative flex items-center justify-center z-10">
              <svg width="100" height="100" viewBox="0 0 100 100" className="-rotate-90">
                <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                <motion.circle
                  cx="50" cy="50" r={R}
                  fill="none"
                  stroke={ringColor}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={CIRC}
                  animate={{ strokeDashoffset: dashOffset, stroke: ringColor }}
                  transition={{ duration: 0.8, ease: "linear" }}
                  style={{ filter: `drop-shadow(0 0 6px ${ringColor})` }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={countdown}
                    initial={{ scale: 1.2, opacity: 0 }}
                    animate={{ scale: 1,   opacity: 1 }}
                    exit={{   scale: 0.8,  opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      "font-mono font-black text-2xl leading-none",
                      isEmergency ? "text-red-400" : isYellow ? "text-yellow-400" : "text-primary"
                    )}
                  >
                    {isEmergency ? "🚨" : countdown}
                  </motion.span>
                </AnimatePresence>
                {!isEmergency && (
                  <span className="font-mono text-[8px] text-white/30 uppercase mt-0.5">
                    {isYellow ? "switch" : "sec"}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Ambulance center indicator */}
          {isAmbulance && (
            <motion.div
              className="flex flex-col items-center gap-1 z-10"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 0.6 }}
            >
              <span className="text-4xl">🚑</span>
              <span className="font-mono text-[9px] text-red-400 font-bold uppercase">IN TRANSIT</span>
            </motion.div>
          )}
        </div>

        <div className="col-start-3 row-start-2">
          {eastRoad && <RoadSegment road={eastRoad} position="east" />}
        </div>

        {/* Row 3 */}
        <div className="col-start-1 bg-zinc-950/50 rounded-bl-2xl" />
        <div className="col-start-2 row-start-3">
          {southRoad && <RoadSegment road={southRoad} position="south" />}
        </div>
        <div className="col-start-3 bg-zinc-950/50 rounded-br-2xl" />

        {/* Ambulance animated overlay */}
        {amb && (
          <AmbulanceOverlay
            ambulance={amb}
            gridSizePx={gridSize}
          />
        )}
      </div>
    </div>
  );
}
