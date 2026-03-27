import React from "react";
import { Activity, Car, Clock, ShieldAlert, Wifi, WifiOff } from "lucide-react";
import type { TrafficState } from "@workspace/api-client-react";
import { format } from "date-fns";

interface StatsPanelProps {
  state: TrafficState | undefined;
  isConnected: boolean;
  lastUpdated: Date | null;
}

export function StatsPanel({ state, isConnected, lastUpdated }: StatsPanelProps) {
  const totalVehicles = state?.roads.reduce((acc, road) => acc + road.vehicleCount, 0) || 0;
  const greenRoads = state?.roads.filter(r => r.signal === "green").map(r => r.name).join(", ") || "None";

  return (
    <div className="glass-panel rounded-2xl p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <h2 className="text-xl font-sans font-bold tracking-tight flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          SYSTEM TELEMETRY
        </h2>
        
        {/* Connection Status */}
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

      <div className="grid grid-cols-2 gap-4">
        {/* Total Vehicles */}
        <div className="bg-black/40 rounded-xl p-4 border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <Car className="w-12 h-12" />
          </div>
          <p className="text-xs text-muted-foreground font-mono uppercase mb-1">Total Network Load</p>
          <p className="text-3xl font-mono font-bold text-white">{totalVehicles}</p>
          <p className="text-xs text-primary mt-2 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block animate-ping" />
            Live Tracking
          </p>
        </div>

        {/* Cycle Time */}
        <div className="bg-black/40 rounded-xl p-4 border border-white/5 relative overflow-hidden">
           <div className="absolute top-0 right-0 p-3 opacity-10">
            <Clock className="w-12 h-12" />
          </div>
          <p className="text-xs text-muted-foreground font-mono uppercase mb-1">Cycle Duration</p>
          <p className="text-3xl font-mono font-bold text-white">{state?.cycleTime || 0}s</p>
          <p className="text-xs text-muted-foreground mt-2">Per direction phase</p>
        </div>
      </div>

      {/* Status Details */}
      <div className="bg-black/40 rounded-xl p-4 border border-white/5 space-y-4">
        <div>
          <p className="text-xs text-muted-foreground font-mono uppercase mb-1">Active Flow</p>
          <p className="text-sm font-bold text-green-400">{greenRoads}</p>
        </div>
        
        <div className="pt-3 border-t border-white/5">
          <p className="text-xs text-muted-foreground font-mono uppercase mb-1">Emergency Override</p>
          {state?.emergencyMode ? (
            <div className="flex items-center gap-2 text-destructive font-bold text-sm">
              <ShieldAlert className="w-4 h-4" />
              ACTIVE: {state.emergencyRoad}
            </div>
          ) : (
            <p className="text-sm font-bold text-zinc-500">STANDBY</p>
          )}
        </div>
      </div>

      {/* Timestamp */}
      <div className="text-[10px] text-zinc-600 font-mono text-center pt-2">
        LAST SYNC: {lastUpdated ? format(lastUpdated, 'HH:mm:ss.SSS') : 'AWAITING...'}
      </div>
    </div>
  );
}
