import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { AmbulanceState } from "@workspace/api-client-react";

interface AmbulanceOverlayProps {
  ambulance: AmbulanceState;
  gridSizePx: number; // width of the 3-col intersection grid
}

/**
 * Animated ambulance overlay that moves West → Center → East
 * across the middle row of the 3×3 intersection grid.
 *
 * The grid is split into 3 equal columns.
 * The ambulance travels from the left edge to the right edge.
 * progress 0-40:  west road (col 1)
 * progress 40-60: center (col 2)
 * progress 60-100: east road (col 3)
 */
export function AmbulanceOverlay({ ambulance, gridSizePx }: AmbulanceOverlayProps) {
  if (!ambulance.active && ambulance.phase !== "complete") return null;

  const col   = gridSizePx / 3;     // width of one column
  const xEnd  = gridSizePx - 48;    // leave space for ambulance icon width
  // Map progress 0-100 → x 0..xEnd
  const xPos  = Math.round((ambulance.progress / 100) * xEnd);
  const yPos  = gridSizePx / 2 - 20; // vertically centred in middle row

  const isEmergency = ambulance.active && ambulance.phase !== "complete";

  return (
    <AnimatePresence>
      {(ambulance.active || ambulance.phase === "complete") && (
        <motion.div
          key="ambulance-overlay"
          className="absolute inset-0 pointer-events-none z-40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Route corridor highlight — middle row */}
          <div
            className={cn(
              "absolute rounded transition-opacity duration-500",
              isEmergency ? "bg-red-500/10 border border-red-500/20" : "bg-green-500/10 border border-green-500/20"
            )}
            style={{
              left:   0,
              right:  0,
              top:    gridSizePx / 3,      // start of middle row
              height: gridSizePx / 3,      // middle row height
            }}
          />

          {/* Glowing path line */}
          <div
            className="absolute rounded-full"
            style={{
              left:   0,
              width:  `${ambulance.progress}%`,
              top:    gridSizePx / 2 - 2,
              height: 4,
              background: "linear-gradient(90deg, rgba(239,68,68,0.8), rgba(250,204,21,0.8), rgba(34,197,94,0.8))",
              boxShadow: "0 0 12px rgba(239,68,68,0.6)",
            }}
          />

          {/* Ambulance icon */}
          <motion.div
            className="absolute flex flex-col items-center gap-0.5"
            style={{ top: yPos - 10 }}
            animate={{ x: xPos }}
            transition={{ duration: 0.9, ease: "linear" }}
          >
            {/* Siren flash */}
            {isEmergency && (
              <motion.div
                className="w-2 h-2 rounded-full bg-red-500"
                animate={{ opacity: [1, 0, 1] }}
                transition={{ repeat: Infinity, duration: 0.4 }}
              />
            )}
            {/* Ambulance emoji */}
            <span className="text-3xl select-none drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">
              🚑
            </span>
            {/* Speed lines */}
            {isEmergency && (
              <div className="flex gap-0.5 -mt-1 opacity-60">
                {[12, 8, 5].map((w, i) => (
                  <div
                    key={i}
                    className="h-0.5 bg-white/60 rounded-full"
                    style={{ width: w, transform: "translateX(-100%)" }}
                  />
                ))}
              </div>
            )}
          </motion.div>

          {/* Route label badges */}
          {isEmergency && (
            <>
              {/* A label */}
              <div
                className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5"
                style={{ left: 8 }}
              >
                <div className="w-5 h-5 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center shadow-lg">
                  A
                </div>
              </div>
              {/* B label */}
              <div
                className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5"
                style={{ left: col + col / 2 - 10 }}
              >
                <div className="w-5 h-5 rounded-full bg-yellow-500 text-black text-[9px] font-black flex items-center justify-center shadow-lg">
                  B
                </div>
              </div>
              {/* C label */}
              <div
                className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5"
                style={{ right: 8 }}
              >
                <div className="w-5 h-5 rounded-full bg-green-500 text-black text-[9px] font-black flex items-center justify-center shadow-lg">
                  C
                </div>
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
