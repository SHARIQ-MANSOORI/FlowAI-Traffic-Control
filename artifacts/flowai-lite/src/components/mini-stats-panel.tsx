import React, { useEffect, useRef, useState } from "react";
import { motion, useSpring, useTransform, animate } from "framer-motion";
import { cn } from "@/lib/utils";
import type { TrafficState } from "@workspace/api-client-react";
import { Zap, Car, Clock } from "lucide-react";

interface MiniStatsPanelProps {
  state: TrafficState | undefined;
}

function AnimatedNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prevValue = useRef(value);

  useEffect(() => {
    if (!ref.current) return;
    const node = ref.current;
    const from = prevValue.current;
    prevValue.current = value;

    const ctrl = animate(from, value, {
      duration: 0.8,
      ease: "easeOut",
      onUpdate(v) {
        node.textContent = v.toFixed(decimals);
      },
    });
    return () => ctrl.stop();
  }, [value, decimals]);

  return <span ref={ref}>{value.toFixed(decimals)}</span>;
}

export function MiniStatsPanel({ state }: MiniStatsPanelProps) {
  const [vehiclesProcessed, setVehiclesProcessed] = useState(0);
  const prevTimestamp = useRef<string | null>(null);

  useEffect(() => {
    if (!state?.timestamp || state.timestamp === prevTimestamp.current) return;
    prevTimestamp.current = state.timestamp;

    const greenVehicles = state.roads
      .filter((r) => r.signal === "green")
      .reduce((sum, r) => sum + r.vehicleCount, 0);

    setVehiclesProcessed((prev) => prev + Math.max(0, Math.round(greenVehicles * 0.12)));
  }, [state?.timestamp]);

  const normalMin  = state?.ambulance?.normalTimeMin ?? 11;
  const aiMin      = state?.ambulance?.aiTimeMin     ?? 2.8;
  const timeSaved  = state?.ambulance?.timeSavedMin  ?? 8.2;
  const pctSaved   = Math.round(((normalMin - aiMin) / normalMin) * 100);

  const stats = [
    {
      icon: Clock,
      label: "Emergency Response",
      value: (
        <span className="flex items-baseline gap-1.5">
          <span className="text-white/40 line-through text-sm font-mono">{normalMin}</span>
          <span className="text-white/40 text-xs">→</span>
          <span className="text-green-400 font-black font-mono text-xl leading-none">
            <AnimatedNumber value={aiMin} decimals={1} />
          </span>
          <span className="text-muted-foreground text-xs font-mono">min</span>
        </span>
      ),
      badge: `-${pctSaved}%`,
      badgeColor: "text-green-400 bg-green-500/10 border-green-500/20",
    },
    {
      icon: Car,
      label: "Vehicles Processed",
      value: (
        <span className="flex items-baseline gap-1">
          <span className="text-primary font-black font-mono text-xl leading-none">
            <AnimatedNumber value={vehiclesProcessed} />
          </span>
          <span className="text-muted-foreground text-xs font-mono">vehicles</span>
        </span>
      ),
      badge: "LIVE",
      badgeColor: "text-primary bg-primary/10 border-primary/20",
    },
    {
      icon: Zap,
      label: "Time Saved / Run",
      value: (
        <span className="flex items-baseline gap-1">
          <span className="text-yellow-400 font-black font-mono text-xl leading-none">
            <AnimatedNumber value={timeSaved} decimals={1} />
          </span>
          <span className="text-muted-foreground text-xs font-mono">min</span>
        </span>
      ),
      badge: "AI",
      badgeColor: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
    },
  ];

  return (
    <div className="glass-panel rounded-2xl px-5 py-4 grid grid-cols-3 divide-x divide-white/5">
      {stats.map((stat, i) => (
        <div key={i} className={cn("flex flex-col gap-2 px-4", i === 0 && "pl-0", i === stats.length - 1 && "pr-0")}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <stat.icon className="w-3 h-3" />
              <span className="text-[9px] font-mono uppercase tracking-widest">{stat.label}</span>
            </div>
            <span className={cn("text-[9px] font-mono font-bold border rounded px-1 py-0.5", stat.badgeColor)}>
              {stat.badge}
            </span>
          </div>
          <div>{stat.value}</div>
        </div>
      ))}
    </div>
  );
}
