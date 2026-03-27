import React from "react";
import { RoadSegment } from "./road-segment";
import type { TrafficState } from "@workspace/api-client-react";

interface IntersectionProps {
  state: TrafficState | undefined;
}

export function Intersection({ state }: IntersectionProps) {
  if (!state || !state.roads) return <div className="w-full aspect-square flex items-center justify-center text-muted-foreground font-mono">NO SIGNAL DATA</div>;

  const northRoad = state.roads.find(r => r.direction === "north");
  const southRoad = state.roads.find(r => r.direction === "south");
  const eastRoad = state.roads.find(r => r.direction === "east");
  const westRoad = state.roads.find(r => r.direction === "west");

  return (
    <div className="relative w-full max-w-[800px] aspect-square mx-auto bg-black/40 rounded-3xl p-8 glass-panel overflow-hidden shadow-2xl flex items-center justify-center">
      
      {/* Decorative corners */}
      <div className="absolute top-4 left-4 w-16 h-16 border-t-2 border-l-2 border-primary/30 rounded-tl-xl" />
      <div className="absolute top-4 right-4 w-16 h-16 border-t-2 border-r-2 border-primary/30 rounded-tr-xl" />
      <div className="absolute bottom-4 left-4 w-16 h-16 border-b-2 border-l-2 border-primary/30 rounded-bl-xl" />
      <div className="absolute bottom-4 right-4 w-16 h-16 border-b-2 border-r-2 border-primary/30 rounded-br-xl" />

      {/* Grid Layout for the Intersection */}
      <div className="w-[600px] h-[600px] grid grid-cols-3 grid-rows-3 gap-0 relative shadow-2xl">
        
        {/* Row 1 */}
        <div className="col-start-1 bg-zinc-950/50 rounded-tl-2xl"></div>
        <div className="col-start-2 row-start-1">
          {northRoad && <RoadSegment road={northRoad} position="north" />}
        </div>
        <div className="col-start-3 bg-zinc-950/50 rounded-tr-2xl"></div>

        {/* Row 2 */}
        <div className="col-start-1 row-start-2">
          {westRoad && <RoadSegment road={westRoad} position="west" />}
        </div>
        
        {/* CENTER INTERSECTION BOX */}
        <div className="col-start-2 row-start-2 relative bg-zinc-900 border-4 border-dashed border-yellow-500/20 flex items-center justify-center overflow-hidden z-0">
          <div className="absolute inset-0 bg-yellow-500/5 opacity-50 pattern-diagonal-lines" />
          
          {/* Subtle central glow */}
          <div className="w-24 h-24 rounded-full bg-primary/5 blur-2xl pointer-events-none" />
          
          {/* Crosswalk markings */}
          <div className="absolute top-2 left-4 right-4 h-4 border-x-4 border-dashed border-white/20"></div>
          <div className="absolute bottom-2 left-4 right-4 h-4 border-x-4 border-dashed border-white/20"></div>
          <div className="absolute left-2 top-4 bottom-4 w-4 border-y-4 border-dashed border-white/20"></div>
          <div className="absolute right-2 top-4 bottom-4 w-4 border-y-4 border-dashed border-white/20"></div>
        </div>

        <div className="col-start-3 row-start-2">
          {eastRoad && <RoadSegment road={eastRoad} position="east" />}
        </div>

        {/* Row 3 */}
        <div className="col-start-1 bg-zinc-950/50 rounded-bl-2xl"></div>
        <div className="col-start-2 row-start-3">
          {southRoad && <RoadSegment road={southRoad} position="south" />}
        </div>
        <div className="col-start-3 bg-zinc-950/50 rounded-br-2xl"></div>

      </div>
    </div>
  );
}
