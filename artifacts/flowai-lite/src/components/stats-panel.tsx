import React from "react";
import { Activity, Car, ShieldAlert, TrendingUp, Wifi, WifiOff } from "lucide-react";
import type { TrafficState } from "@workspace/api-client-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface StatsPanelProps {
  state: TrafficState | undefined;
  isConnected: boolean;
  lastUpdated: Date | null;
}

function DensityBar({
  label,
  density,
  signal,
  isActive,
}: {
  label: string;
  density: number;
  signal: string;
  isActive: boolean;
}) {
  const barColor =
    signal === "green"
      ? "bg-green-400"
      : signal === "yellow"
      ? "bg-yellow-400"
      : "bg-red-500/60";

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg px-2 py-1.5 transition-all duration-500",
        isActive
          ? "bg-green-500/8 border-l-2 border-green-400/60"
          : "border-l-2 border-transparent"
      )}
    >
      <span
        className={cn(
          "font-mono text-[10px] w-12 shrink-0 uppercase font-semibold transition-colors duration-500",
          isActive ? "text-green-300" : "text-muted-foreground"
        )}
      >
        {label}
      </span>
      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className={cn("h-full rounded-full", barColor)}
          animate={{ width: `${density}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{ transition: "background-color 0.5s ease" }}
        />
      </div>
      <span
        className={cn(
          "font-mono text-[10px] w-8 text-right shrink-0 tabular-nums transition-colors duration-500",
          isActive ? "text-green-300 font-bold" : "text-white/50"
        )}
      >
        {density}%
      </span>
    </div>
  );
}

export function StatsPanel({ state, isConnected, lastUpdated }: StatsPanelProps) {
  const totalVehicles   = state?.roads.reduce((acc, r) => acc + r.vehicleCount, 0) ?? 0;
  const countdown       = state?.countdown ?? 0;
  const greenDuration   = state?.greenDuration ?? state?.cycleTime ?? 10;
  const countdownPct    = greenDuration > 0 ? Math.min(100, (countdown / greenDuration) * 100) : 0;
  const isYellow        = state?.roads.some((r) => r.signal === "yellow") ?? false;
  const isEmergency     = state?.emergencyMode ?? false;
  const isAmbulance     = state?.ambulance?.active ?? false;

  const R         = 30;
  const CIRC      = 2 * Math.PI * R;
  const dashOffset = CIRC * (1 - countdownPct / 100);

  const ringColor = isAmbulance
    ? "#ef4444"
    : isEmergency
    ? "#ef4444"
    : isYellow
    ? "#facc15"
    : "#22d3ee";

  const activeGroupRoads = new Set<string>(
    state?.roads.filter((r) => r.signal === "green").map((r) => r.direction) ?? []
  );

  const laneIsActive = !isYellow && !isEmergency && !isAmbulance && !!state?.activeLane;

  return (
    <div className="glass-panel rounded-2xl p-5 flex flex-col gap-4">

      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/8">
        <h2 className="text-base font-bold tracking-tight flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          SYSTEM TELEMETRY
        </h2>
        <div className="flex items-center gap-1.5 text-xs font-mono">
          {isConnected ? (
            <span className="flex items-center gap-1.5 text-primary">
              <Wifi className="w-3.5 h-3.5" />
              ONLINE
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-destructive">
              <WifiOff className="w-3.5 h-3.5" />
              OFFLINE
            </span>
          )}
        </div>
      </div>

      {/* Network load + Phase timer */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-black/40 rounded-xl p-4 border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none">
            <Car className="w-12 h-12" />
          </div>
          <p className="text-[10px] text-muted-foreground font-mono uppercase mb-1 tracking-widest">Network Load</p>
          <p className="text-3xl font-mono font-black text-white leading-none">{totalVehicles}</p>
          <p className="text-[10px] text-primary mt-2 flex items-center gap-1.5 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block animate-ping" />
            Live Tracking
          </p>
        </div>

        <div className="bg-black/40 rounded-xl p-4 border border-white/5 flex flex-col items-center justify-center gap-1">
          <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">Phase Timer</p>
          <div className="relative w-14 h-14">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 70 70">
              <circle cx="35" cy="35" r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
              <motion.circle
                cx="35" cy="35" r={R}
                fill="none"
                stroke={ringColor}
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={CIRC}
                animate={{ strokeDashoffset: dashOffset, stroke: ringColor }}
                transition={{ duration: 0.8, ease: "linear" }}
                style={{ filter: `drop-shadow(0 0 4px ${ringColor}60)` }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.span
                  key={countdown}
                  initial={{ opacity: 0, scale: 1.3 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ duration: 0.15 }}
                  className={cn(
                    "font-mono font-black text-lg leading-none",
                    isAmbulance || isEmergency ? "text-red-400" : isYellow ? "text-yellow-400" : "text-primary"
                  )}
                >
                  {countdown}
                </motion.span>
              </AnimatePresence>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground font-mono">of {greenDuration}s</p>
        </div>
      </div>

      {/* Active lane */}
      <div
        className={cn(
          "rounded-xl p-4 border space-y-2 transition-all duration-600",
          laneIsActive
            ? "bg-green-500/5 border-green-500/25 shadow-[0_0_20px_rgba(34,197,94,0.07)]"
            : isEmergency || isAmbulance
            ? "bg-red-500/5 border-red-500/20"
            : "bg-black/40 border-white/5"
        )}
      >
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">Active Lane</p>
          <TrendingUp
            className={cn(
              "w-3.5 h-3.5 transition-colors duration-500",
              laneIsActive ? "text-green-400" : "text-muted-foreground"
            )}
          />
        </div>

        <AnimatePresence mode="wait">
          {isAmbulance ? (
            <motion.div
              key="ambulance"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="text-red-400 font-bold text-sm font-mono flex items-center gap-2"
            >
              🚑 AMBULANCE CORRIDOR
            </motion.div>
          ) : isEmergency ? (
            <motion.div
              key="emergency"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="flex items-center gap-2 text-destructive font-bold text-sm"
            >
              <ShieldAlert className="w-4 h-4" />
              {state?.emergencyRoad?.toUpperCase()} OVERRIDE
            </motion.div>
          ) : isYellow ? (
            <motion.div
              key="yellow"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="text-yellow-400 font-bold text-sm font-mono"
            >
              ⚡ Switching…
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
          {isAmbulance
            ? "All other traffic halted"
            : isEmergency
            ? "Manual override active"
            : `AI-selected · ${greenDuration}s green phase`}
        </p>
      </div>

      {/* Traffic density */}
      <div className="bg-black/40 rounded-xl px-3 py-3 border border-white/5 space-y-0.5">
        <div className="flex items-center justify-between mb-2 px-2">
          <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">Traffic Density</p>
          <Car className="w-3 h-3 text-muted-foreground" />
        </div>
        {state?.roads.map((road) => (
          <DensityBar
            key={road.id}
            label={road.direction}
            density={road.densityPercent}
            signal={road.signal}
            isActive={activeGroupRoads.has(road.direction)}
          />
        ))}
      </div>

      {/* Timestamp */}
      <p className="text-[10px] text-zinc-600 font-mono text-center tabular-nums">
        LAST SYNC: {lastUpdated ? format(lastUpdated, "HH:mm:ss.SSS") : "AWAITING…"}
      </p>
    </div>
  );
}
