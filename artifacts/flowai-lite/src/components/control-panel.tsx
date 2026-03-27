import React from "react";
import { CyberButton } from "./ui/cyber-button";
import { ShieldAlert, Power } from "lucide-react";
import { useTriggerEmergency, useResetTraffic, type TrafficState } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

interface ControlPanelProps {
  state: TrafficState | undefined;
}

export function ControlPanel({ state }: ControlPanelProps) {
  const { toast } = useToast();
  
  const triggerMutation = useTriggerEmergency({
    mutation: {
      onSuccess: (data) => {
        toast({
          title: "Emergency Corridor Activated",
          description: data.message,
          variant: "destructive",
        });
      },
      onError: (error: any) => {
        toast({
          title: "Failed to trigger",
          description: error.message || "Unknown error occurred",
          variant: "destructive",
        });
      }
    }
  });

  const resetMutation = useResetTraffic({
    mutation: {
      onSuccess: (data) => {
        toast({
          title: "System Reset",
          description: data.message,
        });
      }
    }
  });

  const handleEmergency = (roadId: string, roadName: string) => {
    triggerMutation.mutate({ data: { roadId } });
  };

  const isEmergencyActive = state?.emergencyMode;

  return (
    <div className="glass-panel rounded-2xl p-6 h-full flex flex-col">
      <div className="border-b border-white/10 pb-4 mb-6">
        <h2 className="text-xl font-sans font-bold tracking-tight flex items-center gap-2">
          <Power className="w-5 h-5 text-primary" />
          MANUAL OVERRIDE
        </h2>
        <p className="text-sm text-muted-foreground mt-1 font-mono">
          Route priority control panel
        </p>
      </div>

      <div className="flex-1 flex flex-col justify-between gap-8">
        
        {/* Emergency Buttons Grid */}
        <div className="grid grid-cols-2 gap-3">
          {state?.roads.map((road) => (
            <CyberButton 
              key={road.id}
              variant={road.isEmergency ? "primary" : "destructive"}
              size="sm"
              className="h-16 flex-col gap-1 w-full text-xs group"
              onClick={() => handleEmergency(road.id, road.name)}
              loading={triggerMutation.isPending && triggerMutation.variables?.data.roadId === road.id}
            >
              <ShieldAlert className="w-4 h-4 mb-1 group-hover:scale-110 transition-transform" />
              {road.name} EVAC
            </CyberButton>
          ))}
          
          {(!state || state.roads.length === 0) && (
            <div className="col-span-2 text-center text-xs text-muted-foreground p-4 border border-dashed border-white/10 rounded-lg">
              Waiting for network topology...
            </div>
          )}
        </div>

        {/* Master Reset */}
        <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
          <h3 className="text-xs font-mono uppercase text-primary mb-3 font-bold">System Restore</h3>
          <CyberButton
            variant="outline"
            className="w-full border-primary/50 text-primary hover:bg-primary/20"
            onClick={() => resetMutation.mutate()}
            loading={resetMutation.isPending}
            disabled={!isEmergencyActive}
          >
            <Power className="w-4 h-4 mr-2" />
            RESUME NORMAL CYCLE
          </CyberButton>
          {isEmergencyActive && (
             <p className="text-[10px] text-center text-primary mt-2 font-mono animate-pulse">
               EMERGENCY PROTOCOL ACTIVE
             </p>
          )}
        </div>
      </div>
    </div>
  );
}
