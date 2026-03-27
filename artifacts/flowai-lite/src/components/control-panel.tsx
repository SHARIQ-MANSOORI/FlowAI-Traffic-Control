import React from "react";
import { CyberButton } from "./ui/cyber-button";
import { ShieldAlert, Power, RotateCcw } from "lucide-react";
import { useTriggerEmergency, useResetTraffic, type TrafficState } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ControlPanelProps {
  state: TrafficState | undefined;
}

export function ControlPanel({ state }: ControlPanelProps) {
  const { toast } = useToast();

  const triggerMutation = useTriggerEmergency({
    mutation: {
      onSuccess: (data) => {
        toast({ title: "Emergency Corridor Activated", description: data.message, variant: "destructive" });
      },
      onError: (error: any) => {
        toast({ title: "Failed to trigger", description: error.message || "Unknown error", variant: "destructive" });
      },
    },
  });

  const resetMutation = useResetTraffic({
    mutation: {
      onSuccess: (data) => {
        toast({ title: "System Reset", description: data.message });
      },
    },
  });

  const isEmergencyActive = state?.emergencyMode;

  return (
    <div className="glass-panel rounded-2xl p-5 flex flex-col gap-4">

      {/* Header */}
      <div className="flex items-center gap-2 pb-3 border-b border-white/8">
        <Power className="w-4 h-4 text-primary" />
        <div>
          <h2 className="text-base font-bold tracking-tight leading-none">MANUAL OVERRIDE</h2>
          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">Route priority control</p>
        </div>
      </div>

      {/* EVAC buttons */}
      <div className="grid grid-cols-2 gap-2.5">
        {state?.roads.map((road) => {
          const isGreen    = road.signal === "green";
          const isPending  = triggerMutation.isPending && triggerMutation.variables?.data.roadId === road.id;

          return (
            <button
              key={road.id}
              onClick={() => triggerMutation.mutate({ data: { roadId: road.id } })}
              disabled={isPending}
              className={cn(
                "relative h-16 rounded-xl flex flex-col items-center justify-center gap-1 px-2",
                "font-mono text-[10px] font-bold uppercase tracking-wider",
                "border transition-all duration-500 cursor-pointer",
                isGreen
                  ? "bg-green-500/10 border-green-500/40 text-green-300 shadow-[0_0_16px_rgba(34,197,94,0.15)]"
                  : "bg-destructive/5 border-destructive/20 text-destructive/70 hover:bg-destructive/10 hover:border-destructive/40 hover:text-destructive",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isPending ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <ShieldAlert className={cn("w-4 h-4 transition-transform duration-200 hover:scale-110", isGreen && "animate-pulse")} />
              )}
              <span>{road.name}</span>
              {isGreen && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-green-400 animate-ping" />
              )}
            </button>
          );
        })}

        {(!state || state.roads.length === 0) && (
          <div className="col-span-2 text-center text-xs text-muted-foreground p-4 border border-dashed border-white/10 rounded-lg font-mono">
            Waiting for network topology…
          </div>
        )}
      </div>

      {/* System restore */}
      <div
        className={cn(
          "rounded-xl p-4 border transition-all duration-500",
          isEmergencyActive
            ? "bg-primary/5 border-primary/30"
            : "bg-white/2 border-white/5"
        )}
      >
        <p className="text-[10px] font-mono uppercase font-bold mb-2.5 tracking-widest text-muted-foreground">System Restore</p>
        <button
          onClick={() => resetMutation.mutate()}
          disabled={resetMutation.isPending || !isEmergencyActive}
          className={cn(
            "w-full h-10 rounded-lg flex items-center justify-center gap-2",
            "font-mono text-xs font-bold uppercase tracking-wider",
            "border transition-all duration-300",
            isEmergencyActive
              ? "border-primary/50 text-primary hover:bg-primary/15 cursor-pointer"
              : "border-white/10 text-white/20 cursor-not-allowed",
            "disabled:opacity-40"
          )}
        >
          {resetMutation.isPending ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <RotateCcw className="w-3.5 h-3.5" />
          )}
          Resume Normal Cycle
        </button>
        {isEmergencyActive && (
          <p className="text-[9px] text-center text-primary mt-2 font-mono animate-pulse tracking-widest">
            EMERGENCY PROTOCOL ACTIVE
          </p>
        )}
      </div>
    </div>
  );
}
