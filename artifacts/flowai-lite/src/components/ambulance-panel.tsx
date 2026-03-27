import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useStartAmbulanceCorridor, useStopAmbulanceCorridor, type TrafficState } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Siren, Clock, CheckCircle2, X } from "lucide-react";

interface AmbulancePanelProps {
  state: TrafficState | undefined;
}

const ROUTE_NODES = [
  { key: "A", label: "West Entry",   desc: "Hospital Gate" },
  { key: "B", label: "Intersection", desc: "Main Junction"  },
  { key: "C", label: "East Exit",    desc: "Emergency Dept" },
];

function nodeProgress(progress: number): number {
  // Which node is active: A=0-33, B=34-66, C=67-100
  if (progress < 40)  return 0; // A
  if (progress < 60)  return 1; // B
  return 2;                      // C
}

export function AmbulancePanel({ state }: AmbulancePanelProps) {
  const { toast } = useToast();
  const amb = state?.ambulance;
  const isActive   = amb?.active ?? false;
  const isComplete = amb?.phase === "complete";

  const startMutation = useStartAmbulanceCorridor({
    mutation: {
      onSuccess: (data) => {
        if (data.success) {
          toast({ title: "🚑 Ambulance Corridor Activated", description: data.message });
        } else {
          toast({ title: "Cannot activate", description: data.message, variant: "destructive" });
        }
      },
    },
  });

  const stopMutation = useStopAmbulanceCorridor({
    mutation: {
      onSuccess: () => {
        toast({ title: "Corridor Cancelled", description: "Traffic returning to AI control" });
      },
    },
  });

  const currentNode = nodeProgress(amb?.progress ?? 0);
  const progressPct = amb?.progress ?? 0;

  return (
    <div className={cn(
      "glass-panel rounded-2xl p-6 flex flex-col gap-5 border transition-colors duration-500",
      isActive ? "border-red-500/40 shadow-[0_0_30px_rgba(239,68,68,0.15)]" : "border-white/5"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <h2 className="text-xl font-sans font-bold tracking-tight flex items-center gap-2">
          <Siren className={cn("w-5 h-5", isActive ? "text-red-400 animate-pulse" : "text-primary")} />
          AMBULANCE CORRIDOR
        </h2>
        {isActive && (
          <span className="text-[10px] font-mono font-bold text-red-400 bg-red-400/10 border border-red-400/30 px-2 py-1 rounded animate-pulse">
            ACTIVE
          </span>
        )}
      </div>

      {/* ETA Comparison */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-black/40 rounded-xl p-4 border border-white/5">
          <p className="text-[10px] font-mono text-muted-foreground uppercase mb-1">Normal Time</p>
          <div className="flex items-end gap-1">
            <span className="text-2xl font-mono font-black text-red-400">
              {amb?.normalTimeMin ?? 11}
            </span>
            <span className="text-sm text-muted-foreground mb-0.5">min</span>
          </div>
          <p className="text-[9px] text-muted-foreground font-mono mt-1">With all red lights</p>
        </div>

        <div className={cn(
          "rounded-xl p-4 border relative overflow-hidden transition-all duration-500",
          isActive
            ? "bg-green-500/10 border-green-500/40 shadow-[0_0_15px_rgba(34,197,94,0.2)]"
            : "bg-black/40 border-white/5"
        )}>
          {isActive && (
            <div className="absolute inset-0 bg-green-500/5 animate-pulse pointer-events-none" />
          )}
          <p className="text-[10px] font-mono text-muted-foreground uppercase mb-1">AI Time</p>
          <div className="flex items-end gap-1">
            <span className="text-2xl font-mono font-black text-green-400">
              {amb?.aiTimeMin ?? 2.8}
            </span>
            <span className="text-sm text-muted-foreground mb-0.5">min</span>
          </div>
          <p className="text-[9px] text-green-400 font-mono mt-1">
            Saves {amb?.timeSavedMin ?? 8.2} min
          </p>
        </div>
      </div>

      {/* Route A → B → C */}
      <div className="bg-black/40 rounded-xl p-4 border border-white/5 space-y-3">
        <p className="text-[10px] font-mono text-muted-foreground uppercase">Route Corridor</p>

        <div className="relative flex items-center gap-0">
          {ROUTE_NODES.map((node, i) => {
            const isPast    = isActive && currentNode > i;
            const isCurrent = isActive && currentNode === i;
            const isFuture  = !isActive || currentNode < i;

            return (
              <React.Fragment key={node.key}>
                {/* Node */}
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <motion.div
                    className={cn(
                      "w-8 h-8 rounded-full border-2 flex items-center justify-center font-mono font-black text-xs transition-all duration-500",
                      isPast    ? "bg-green-500 border-green-500 text-black" :
                      isCurrent ? "bg-red-500 border-red-400 text-white shadow-[0_0_12px_rgba(239,68,68,0.6)]" :
                      "bg-zinc-900 border-white/20 text-white/50"
                    )}
                    animate={isCurrent ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                    transition={{ repeat: Infinity, duration: 1 }}
                  >
                    {isPast ? <CheckCircle2 className="w-4 h-4" /> : node.key}
                  </motion.div>
                  <div className="text-center">
                    <p className={cn(
                      "font-mono text-[9px] font-bold uppercase",
                      isCurrent ? "text-red-400" : isPast ? "text-green-400" : "text-white/30"
                    )}>
                      {node.label}
                    </p>
                  </div>
                </div>

                {/* Connector line */}
                {i < ROUTE_NODES.length - 1 && (
                  <div className="flex-1 h-0.5 mx-1 relative overflow-hidden bg-white/10 rounded">
                    <AnimatePresence>
                      {isActive && currentNode > i && (
                        <motion.div
                          key="fill"
                          className="absolute inset-y-0 left-0 bg-green-500 rounded"
                          initial={{ width: "0%" }}
                          animate={{ width: "100%" }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                        />
                      )}
                    </AnimatePresence>
                    {isActive && currentNode === i && (
                      <motion.div
                        className="absolute inset-y-0 left-0 bg-red-400 rounded"
                        animate={{ width: [`${(progressPct % 40) * 2.5}%`, "100%"] }}
                        transition={{ duration: 1, ease: "linear" }}
                      />
                    )}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Progress bar */}
        {isActive && (
          <div className="space-y-1">
            <div className="flex justify-between text-[9px] font-mono text-muted-foreground">
              <span>CORRIDOR PROGRESS</span>
              <span>{progressPct}%</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-red-500 via-yellow-400 to-green-500 rounded-full"
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Activate / Cancel Button */}
      <div className="space-y-2">
        {!isActive ? (
          <button
            onClick={() => startMutation.mutate()}
            disabled={startMutation.isPending}
            className={cn(
              "w-full py-3.5 rounded-xl font-mono font-bold text-sm uppercase tracking-widest transition-all duration-200",
              "bg-red-600 hover:bg-red-500 text-white border border-red-400/50",
              "shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:shadow-[0_0_30px_rgba(239,68,68,0.5)]",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "flex items-center justify-center gap-2"
            )}
          >
            {startMutation.isPending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Siren className="w-4 h-4" />
            )}
            Activate Emergency Corridor
          </button>
        ) : (
          <button
            onClick={() => stopMutation.mutate()}
            disabled={stopMutation.isPending || isComplete}
            className={cn(
              "w-full py-3 rounded-xl font-mono font-bold text-sm uppercase tracking-widest transition-all duration-200",
              "bg-zinc-800 hover:bg-zinc-700 text-white/70 border border-white/10",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "flex items-center justify-center gap-2"
            )}
          >
            <X className="w-4 h-4" />
            {isComplete ? "Corridor Complete" : "Cancel Corridor"}
          </button>
        )}

        {isActive && !isComplete && (
          <div className="flex items-center gap-2 justify-center text-[10px] font-mono text-red-400 animate-pulse">
            <Clock className="w-3 h-3" />
            All other traffic halted — ambulance in transit
          </div>
        )}
      </div>
    </div>
  );
}
