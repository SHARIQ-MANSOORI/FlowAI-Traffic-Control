import React from "react";
import { useTrafficSocket } from "@/hooks/use-traffic-socket";
import {
  useGetTrafficState,
  useStartAmbulanceCorridor,
} from "@workspace/api-client-react";
import { Intersection } from "@/components/intersection";
import { StatsPanel } from "@/components/stats-panel";
import { ControlPanel } from "@/components/control-panel";
import { AmbulancePanel } from "@/components/ambulance-panel";
import { MiniStatsPanel } from "@/components/mini-stats-panel";
import { AlertTriangle, Siren, Play, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { isConnected, lastUpdated } = useTrafficSocket();
  const { data: state, isLoading, isError } = useGetTrafficState();
  const { toast } = useToast();

  const isAmbulanceActive = state?.ambulance?.active ?? false;
  const isAmbulanceComplete = state?.ambulance?.phase === "complete";
  const isManualEmergency = state?.emergencyMode && !isAmbulanceActive;

  const startDemo = useStartAmbulanceCorridor({
    mutation: {
      onSuccess: (data) => {
        if (data.success) {
          toast({ title: "🚑 Demo Started", description: "Ambulance corridor activated — watch the intersection!" });
        } else {
          toast({ title: "Already running", description: data.message });
        }
      },
    },
  });

  return (
    <motion.div
      className="min-h-screen relative selection:bg-primary/30"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Background grid */}
      <div
        className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url('${import.meta.env.BASE_URL}images/cyber-grid.png')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          mixBlendMode: "screen",
        }}
      />

      <div className="relative z-10 max-w-[1400px] mx-auto p-4 md:p-6 lg:p-8 flex flex-col gap-5 min-h-screen">

        {/* ── Header ── */}
        <motion.header
          className="glass-panel rounded-2xl px-6 py-4 md:px-8 border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          {/* Title block */}
          <div className="flex flex-col gap-0.5">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white leading-none">
              AI Traffic System{" "}
              <span className="text-primary" style={{ textShadow: "0 0 20px rgba(34,211,238,0.5)" }}>
                for Emergency Response
              </span>
            </h1>
            <p className="text-muted-foreground text-sm mt-1 max-w-xl">
              Traditional red lights add <span className="text-white/70 font-semibold">8+ minutes</span> to ambulance trips.
              AI dynamically opens green corridors, cutting response time by{" "}
              <span className="text-green-400 font-semibold">75%</span>.
            </p>
          </div>

          {/* Right: status badges + Start Demo */}
          <div className="flex items-center gap-3 shrink-0">
            <AnimatePresence mode="popLayout">
              {isAmbulanceActive && (
                <motion.div
                  key="amb-banner"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className="bg-red-500/10 border border-red-500/70 text-red-400 px-3 py-1.5 rounded-lg flex items-center gap-2 font-bold font-mono text-xs shadow-[0_0_15px_rgba(239,68,68,0.25)]"
                >
                  <Siren className="w-3.5 h-3.5 animate-pulse" />
                  CORRIDOR ACTIVE
                </motion.div>
              )}
              {isManualEmergency && (
                <motion.div
                  key="emg-banner"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className="bg-destructive/10 border border-destructive/70 text-destructive px-3 py-1.5 rounded-lg flex items-center gap-2 font-bold font-mono text-xs animate-pulse"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  OVERRIDE ACTIVE
                </motion.div>
              )}
            </AnimatePresence>

            {/* Start Demo button */}
            <button
              onClick={() => startDemo.mutate()}
              disabled={startDemo.isPending || isAmbulanceActive}
              className={cn(
                "relative flex items-center gap-2 px-5 py-2.5 rounded-xl font-mono font-bold text-sm uppercase tracking-wider",
                "transition-all duration-300 overflow-hidden",
                isAmbulanceActive
                  ? "bg-green-500/10 border border-green-500/30 text-green-400 cursor-not-allowed"
                  : "bg-primary text-black border border-primary/50 hover:bg-primary/90 cursor-pointer shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)]",
                "disabled:opacity-70"
              )}
            >
              {/* Animated shimmer on idle */}
              {!isAmbulanceActive && (
                <motion.div
                  className="absolute inset-0 bg-white/10"
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ repeat: Infinity, duration: 2.5, ease: "linear", repeatDelay: 1 }}
                />
              )}
              <span className="relative flex items-center gap-2">
                {startDemo.isPending ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : isAmbulanceActive ? (
                  <Siren className="w-4 h-4 animate-pulse" />
                ) : (
                  <Play className="w-4 h-4 fill-current" />
                )}
                {isAmbulanceActive ? "Demo Running" : "Start Demo"}
              </span>
            </button>
          </div>
        </motion.header>

        {/* ── Main grid ── */}
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1">

          {/* Left: Intersection + mini stats */}
          <motion.div
            className="lg:col-span-8 flex flex-col gap-4"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.2 }}
          >
            <div className="flex flex-col items-center justify-center p-4">
              {isLoading ? (
                <div className="flex flex-col items-center gap-4 font-mono text-primary animate-pulse">
                  <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  INITIALIZING MATRIX...
                </div>
              ) : isError ? (
                <div className="glass-panel p-8 rounded-xl text-destructive text-center font-mono">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
                  FAILED TO CONNECT TO CENTRAL AI
                </div>
              ) : (
                <Intersection state={state} />
              )}
            </div>
            {!isLoading && !isError && <MiniStatsPanel state={state} />}
          </motion.div>

          {/* Right: Panels */}
          <motion.div
            className="lg:col-span-4 flex flex-col gap-4 overflow-y-auto"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.3 }}
          >
            <StatsPanel state={state} isConnected={isConnected} lastUpdated={lastUpdated} />
            <AmbulancePanel state={state} />
            <ControlPanel state={state} />
          </motion.div>

        </main>

        {/* ── Demo guide strip ── */}
        <AnimatePresence>
          {!isAmbulanceActive && !isLoading && !isError && (
            <motion.div
              key="guide"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.3, delay: 0.5 }}
              className="glass-panel rounded-xl px-6 py-3 border border-white/5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2"
            >
              {[
                { step: "1", text: "AI picks the busiest lane automatically" },
                { step: "2", text: "Green phase scales 10–40 s by density" },
                { step: "3", text: 'Press "Start Demo" to open ambulance corridor' },
                { step: "4", text: "Watch 11 min → 2.8 min response time" },
              ].map(({ step, text }) => (
                <div key={step} className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                  <span className="w-5 h-5 rounded-full bg-primary/15 border border-primary/30 text-primary font-black flex items-center justify-center text-[9px]">
                    {step}
                  </span>
                  {text}
                </div>
              ))}
            </motion.div>
          )}
          {isAmbulanceActive && (
            <motion.div
              key="active-guide"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.3 }}
              className="glass-panel rounded-xl px-6 py-3 border border-red-500/20 bg-red-500/5 flex items-center justify-center gap-3 text-sm font-mono text-red-300"
            >
              <Siren className="w-4 h-4 animate-pulse" />
              All signals cleared — ambulance routing West → Intersection → East
              <span className="text-white/30 ml-2">Normal: 11 min</span>
              <span className="text-green-400 font-bold">AI: 2.8 min</span>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </motion.div>
  );
}
