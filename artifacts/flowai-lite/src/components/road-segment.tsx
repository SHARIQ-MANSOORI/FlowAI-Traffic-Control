import React from "react";
import { cn } from "@/lib/utils";
import { TrafficLight } from "./traffic-light";
import { Car, ShieldAlert, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from "lucide-react";
import type { RoadSignal } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";

interface RoadSegmentProps {
  road: RoadSignal;
  position: "north" | "south" | "east" | "west";
}

export function RoadSegment({ road, position }: RoadSegmentProps) {
  const isVertical = position === "north" || position === "south";

  const renderCars = () => {
    const visualCount = Math.min(road.vehicleCount, 12);
    return Array.from({ length: visualCount }).map((_, i) => (
      <div
        key={i}
        className={cn(
          "w-3 h-4 rounded-sm shadow-[0_0_5px_rgba(255,255,255,0.3)]",
          road.isEmergency && i === 0
            ? "bg-destructive animate-pulse w-4 h-5"
            : road.signal === "green"
            ? "bg-green-300/80"
            : road.signal === "yellow"
            ? "bg-yellow-200/80"
            : "bg-blue-200/80"
        )}
      />
    ));
  };

  const getDirectionIcon = () => {
    switch (position) {
      case "north": return <ArrowDown className="text-white/30 w-8 h-8" />;
      case "south": return <ArrowUp className="text-white/30 w-8 h-8" />;
      case "east":  return <ArrowLeft className="text-white/30 w-8 h-8" />;
      case "west":  return <ArrowRight className="text-white/30 w-8 h-8" />;
    }
  };

  const densityColor =
    road.densityPercent >= 80
      ? "bg-red-500"
      : road.densityPercent >= 50
      ? "bg-yellow-400"
      : "bg-green-400";

  return (
    <div
      className={cn(
        "relative flex items-center justify-center bg-zinc-900 border-border overflow-hidden",
        isVertical ? "w-40 h-full border-x-2" : "w-full h-40 border-y-2",
        isVertical ? "road-stripes-v" : "road-stripes-h"
      )}
    >
      {/* Name Label */}
      <div
        className={cn(
          "absolute bg-black/60 backdrop-blur-sm px-3 py-1 rounded font-mono text-xs font-bold border border-white/10 z-20 text-white uppercase",
          position === "north" ? "top-2 left-1/2 -translate-x-1/2" :
          position === "south" ? "bottom-2 left-1/2 -translate-x-1/2" :
          position === "east"  ? "right-2 top-1/2 -translate-y-1/2 rotate-90 origin-center" :
          /* west */             "left-2 top-1/2 -translate-y-1/2 -rotate-90 origin-center"
        )}
      >
        {road.name}
      </div>

      {/* Traffic Light */}
      <div
        className={cn(
          "absolute z-30",
          position === "north" ? "bottom-4 right-2" :
          position === "south" ? "top-4 left-2" :
          position === "east"  ? "left-4 top-2" :
          /* west */             "right-4 bottom-2"
        )}
      >
        <TrafficLight
          signal={road.signal}
          orientation={isVertical ? "vertical" : "horizontal"}
        />
      </div>

      {/* Vehicle queue */}
      <div
        className={cn(
          "absolute z-10 flex gap-2 p-2",
          position === "north" ? "top-10 flex-col items-center right-4" :
          position === "south" ? "bottom-10 flex-col-reverse items-center left-4" :
          position === "east"  ? "right-10 flex-row-reverse items-center top-4" :
          /* west */             "left-10 flex-row items-center bottom-4"
        )}
      >
        {renderCars()}
      </div>

      {/* Emergency overlay */}
      <AnimatePresence>
        {road.isEmergency && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-destructive/10 border border-destructive z-20 pointer-events-none"
            style={{ boxShadow: "inset 0 0 50px rgba(255,50,50,0.2)" }}
          >
            <div className="absolute inset-0 flex items-center justify-center opacity-30 animate-pulse">
              <ShieldAlert className="w-24 h-24 text-destructive" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Direction arrow */}
      <div className="absolute opacity-50 z-0">{getDirectionIcon()}</div>

      {/* Vehicle count badge */}
      <div
        className={cn(
          "absolute z-30 flex items-center gap-1.5 bg-background border border-white/10 rounded-full px-3 py-1.5 shadow-lg",
          position === "north" ? "bottom-4 left-2" :
          position === "south" ? "top-4 right-2" :
          position === "east"  ? "left-4 bottom-2" :
          /* west */             "right-4 top-2"
        )}
      >
        <Car className="w-4 h-4 text-muted-foreground" />
        <span className="font-mono font-bold text-white">{road.vehicleCount}</span>
      </div>

      {/* Density bar — rendered along the inner edge of each arm */}
      <div
        className={cn(
          "absolute z-30",
          isVertical
            ? "bottom-0 left-0 right-0 h-1"
            : "top-0 bottom-0 right-0 w-1"
        )}
      >
        <div className="relative w-full h-full bg-white/5">
          <motion.div
            className={cn("absolute rounded-sm", densityColor, isVertical ? "h-full left-0" : "w-full bottom-0")}
            animate={isVertical ? { width: `${road.densityPercent}%` } : { height: `${road.densityPercent}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Density % label */}
      <div
        className={cn(
          "absolute z-30 font-mono text-[9px] font-bold px-1 rounded",
          densityColor === "bg-red-500" ? "text-red-400" :
          densityColor === "bg-yellow-400" ? "text-yellow-300" : "text-green-400",
          position === "north" ? "bottom-3 right-14" :
          position === "south" ? "top-3 left-14" :
          position === "east"  ? "left-14 bottom-3" :
          /* west */             "right-14 top-3"
        )}
      >
        {road.densityPercent}%
      </div>
    </div>
  );
}
