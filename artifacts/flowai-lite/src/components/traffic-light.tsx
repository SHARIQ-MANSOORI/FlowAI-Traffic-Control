import React from "react";
import { cn } from "@/lib/utils";
import type { SignalColor } from "@workspace/api-client-react";

interface TrafficLightProps {
  signal: SignalColor;
  orientation?: "vertical" | "horizontal";
  className?: string;
}

export function TrafficLight({ signal, orientation = "vertical", className }: TrafficLightProps) {
  return (
    <div 
      className={cn(
        "flex bg-black/80 border border-white/10 rounded-full p-2 gap-2 shadow-xl backdrop-blur-md",
        orientation === "vertical" ? "flex-col" : "flex-row",
        className
      )}
    >
      {/* Red */}
      <div className={cn(
        "w-6 h-6 rounded-full transition-all duration-300",
        signal === "red" ? "glow-red" : "dim-red"
      )} />
      
      {/* Yellow */}
      <div className={cn(
        "w-6 h-6 rounded-full transition-all duration-300",
        signal === "yellow" ? "glow-yellow" : "dim-yellow"
      )} />
      
      {/* Green */}
      <div className={cn(
        "w-6 h-6 rounded-full transition-all duration-300",
        signal === "green" ? "glow-green" : "dim-green"
      )} />
    </div>
  );
}
