import React from "react";
import { Activity, Car, Clock, ShieldAlert, Wifi, WifiOff, TrendingUp, Timer } from "lucide-react";
import type { TrafficState } from "@workspace/api-client-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface StatsPanelProps {
  state: TrafficState | undefined;
  isConnected: boolean;
  lastUpdated: Date | null;
}

function DensityBar({ label, density, signal }: { label: string; density: number; signal: string }) {
  const color =
    signal === "green"
      ? "bg-green-400"
      : signal === "yellow"
      ? "bg-yellow-400"
      : "bg-red-500/60";

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[10px] text-muted-foreground w-14 shrink-0 uppercase">{label}</span>
      <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className={cn("h-full rounded-full transition-colors", color)}
          animate={{ width: `${density}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
      <span className="font-mono text-[10px] text-white w-9 text-right shrink-0">{density}%</span>
    </div>
  );
}

export function StatsPanel({ state, isConnected, lastUpdated }: StatsPanelProps) {
  const totalVehicles = state?.roads.reduce((acc, road) => acc + road.vehicleCount, 0) ?? 0;
  const countdown = state?.countdown ?? 0;
  const greenDuration = state?.greenDuration ?? state?.cycleTime ?? 10;
  const countdownPct = greenDuration > 0 ? Math.min(100, (countdown / greenDuration) * 100) : 0;
  const isYellow = state?.roads.some((r) => r.signal === "yellow") ?? false;

  // Circumference of the SVG circle
  const R = 30;
  const CIRC = 2 * Math.PI * R;
  const dashOffset = CIRC * (1 - countdownPct / 100);

  return (
    <div className="glass-panel rounded-2xl p-6 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <h2 className="text-xl font-sans font-bold tracking-tight flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          SYSTEM TELEMETRY
        </h2>
        <div className="flex items-center gap-2 text-xs font-mono">
          {isConnected ? (
            <span className="flex items-center gap-1.5 text-primary">
              <Wifi className="w-4 h-4 animate-pulse" />
              ONLINE
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-destructive">
              <WifiOff className="w-4 h-4" />
              OFFLINE
            </span>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Total vehicles */}
        <div className="bg-black/40 rounded-xl p-4 border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <Car className="w-12 h-12" />
          </div>
          <p className="text-xs text-muted-foreground font-mono uppercase mb-1">Network Load</p>
          <p className="text-3xl font-mono font-bold text-white">{totalVehicles}</p>
          <p className="text-xs text-primary mt-2 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block animate-ping" />
            Live Tracking
          </p>
        </div>

        {/* Countdown */}
        <div className="bg-black/40 rounded-xl p-4 border border-white/5 flex flex-col items-center justify-center relative overflow-hidden">
          <p className="text-xs text-muted-foreground font-mono uppercase mb-2">Phase Timer</p>
          <div className="relative w-16 h-16">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 70 70">
              <circle cx="35" cy="35" r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
              <motion.circle
                cx="35"
                cy="35"
                r={R}
                fill="none"
                stroke={isYellow ? "#facc15" : "#22d3ee"}
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={CIRC}
                animate={{ strokeDashoffset: dashOffset }}
                transition={{ duration: 0.8, ease: "linear" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={cn("font-mono font-black text-lg", isYellow ? "text-yellow-400" : "text-primary")}>
                {countdown}
              </span>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground font-mono mt-1">of {greenDuration}s</p>
        </div>
      </div>

      {/* Active lane */}
      <div className="bg-black/40 rounded-xl p-4 border border-white/5 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground font-mono uppercase">Active Lane</p>
          <TrendingUp className="w-3.5 h-3.5 text-primary" />
        </div>
        <AnimatePresence mode="wait">
          {state?.emergencyMode ? (
            <motion.div
              key="emergency"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="flex items-center gap-2 text-destructive font-bold text-sm"
            >
              <ShieldAlert className="w-4 h-4" />
              EMERGENCY: {state.emergencyRoad?.toUpperCase()}
            </motion.div>
          ) : isYellow ? (
            <motion.div
              key="yellow"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="text-yellow-400 font-bold text-sm font-mono animate-pulse"
            >
              ⚡ SWITCHING LANES…
            </motion.div>
          ) : (
            <motion.div
              key={state?.activeLane ?? "none"}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="text-green-400 font-bold text-sm"
            >
              {state?.activeLane ?? "—"}
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-[10px] text-muted-foreground font-mono">
          {state?.emergencyMode
            ? "Manual override active"
            : `AI-selected · ${greenDuration}s green phase`}
        </p>
      </div>

      {/* Per-road density bars */}
      <div className="bg-black/40 rounded-xl p-4 border border-white/5 space-y-3">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-muted-foreground font-mono uppercase">Traffic Density</p>
          <Car className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
        {state?.roads.map((road) => (
          <DensityBar
            key={road.id}
            label={road.direction}
            density={road.densityPercent}
            signal={road.signal}
          />
        ))}
      </div>

      {/* Timestamp */}
      <div className="text-[10px] text-zinc-600 font-mono text-center">
        LAST SYNC: {lastUpdated ? format(lastUpdated, "HH:mm:ss.SSS") : "AWAITING…"}
      </div>
    </div>
  );
}
