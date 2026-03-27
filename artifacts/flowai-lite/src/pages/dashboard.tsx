import React from "react";
import { useTrafficSocket } from "@/hooks/use-traffic-socket";
import { useGetTrafficState } from "@workspace/api-client-react";
import { Intersection } from "@/components/intersection";
import { StatsPanel } from "@/components/stats-panel";
import { ControlPanel } from "@/components/control-panel";
import { AlertTriangle } from "lucide-react";

export default function Dashboard() {
  // 1. Setup socket connection to receive live updates
  const { isConnected, lastUpdated } = useTrafficSocket();
  
  // 2. Query initial state and provide cache access. 
  // The socket hook will update this query's cache automatically.
  const { data: state, isLoading, isError } = useGetTrafficState();

  return (
    <div className="min-h-screen relative selection:bg-primary/30">
      
      {/* Background image requested in requirements.yaml */}
      <div 
        className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url('${import.meta.env.BASE_URL}images/cyber-grid.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          mixBlendMode: 'screen'
        }}
      />

      <div className="relative z-10 max-w-[1400px] mx-auto p-4 md:p-6 lg:p-8 flex flex-col gap-6 min-h-screen">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 glass-panel rounded-2xl p-4 md:px-8 border-b border-white/5">
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-white flex items-center gap-3">
              FLOW<span className="text-primary glow-text-primary">AI</span> LITE
            </h1>
            <p className="text-muted-foreground font-mono text-xs uppercase tracking-widest mt-1">
              Autonomous Intersection Matrix
            </p>
          </div>
          
          {state?.emergencyMode && (
            <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-2 rounded-lg flex items-center gap-3 font-bold font-mono animate-pulse shadow-[0_0_20px_rgba(255,50,50,0.3)]">
              <AlertTriangle className="w-5 h-5" />
              EMERGENCY CORRIDOR ACTIVE
            </div>
          )}
        </header>

        {/* Main Content Grid */}
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
          
          {/* Left Column: Intersection Visualizer (Takes up most space) */}
          <div className="lg:col-span-8 flex flex-col">
            <div className="flex-1 flex flex-col items-center justify-center p-4">
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
          </div>

          {/* Right Column: Panels */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <StatsPanel 
              state={state} 
              isConnected={isConnected} 
              lastUpdated={lastUpdated} 
            />
            
            <div className="flex-1">
               <ControlPanel state={state} />
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
