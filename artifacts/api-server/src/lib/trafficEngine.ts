import { Server as SocketIOServer } from "socket.io";
import { logger } from "./logger";

type SignalColor = "red" | "yellow" | "green";

const MAX_VEHICLES = 30;
const VEHICLE_UPDATE_INTERVAL = 5; // seconds between vehicle count reassessments
const YELLOW_DURATION = 3;         // seconds for yellow phase
const MIN_GREEN = 10;
const MAX_GREEN = 40;

interface RoadSignal {
  id: string;
  name: string;
  direction: "north" | "south" | "east" | "west";
  signal: SignalColor;
  vehicleCount: number;
  isEmergency: boolean;
  densityPercent: number;
}

interface TrafficState {
  roads: RoadSignal[];
  emergencyMode: boolean;
  emergencyRoad: string | null;
  cycleTime: number;
  greenDuration: number;
  countdown: number;
  activeLane: string | null;
  timestamp: string;
}

const ROADS: Omit<RoadSignal, "signal" | "vehicleCount" | "isEmergency" | "densityPercent">[] = [
  { id: "north", name: "North Road", direction: "north" },
  { id: "south", name: "South Road", direction: "south" },
  { id: "east", name: "East Road", direction: "east" },
  { id: "west", name: "West Road", direction: "west" },
];

// The two competing road groups (N/S vs E/W)
const ROAD_GROUPS: { ids: string[]; label: string }[] = [
  { ids: ["north", "south"], label: "North / South" },
  { ids: ["east", "west"],   label: "East / West" },
];

let io: SocketIOServer | null = null;
let currentState: TrafficState;
let activeGroupIndex = 0; // which group currently has green
let phaseTimer = 0;       // seconds elapsed in current phase
let isYellowPhase = false;
let vehicleUpdateTimer = 0;
let intervalId: ReturnType<typeof setInterval> | null = null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function randomVehicleCount(): number {
  return Math.floor(Math.random() * (MAX_VEHICLES - 2)) + 2;
}

function densityOf(count: number): number {
  return Math.round((count / MAX_VEHICLES) * 100);
}

/**
 * Pick the road group with the highest combined vehicle count.
 * Returns the index into ROAD_GROUPS.
 */
function selectBusiestGroup(): number {
  const totals = ROAD_GROUPS.map((g) =>
    g.ids.reduce((sum, id) => {
      const road = currentState.roads.find((r) => r.id === id);
      return sum + (road?.vehicleCount ?? 0);
    }, 0)
  );
  return totals[0] >= totals[1] ? 0 : 1;
}

/**
 * Calculate a dynamic green duration based on the active group's combined density.
 * Range: MIN_GREEN … MAX_GREEN seconds.
 */
function calcGreenDuration(groupIndex: number): number {
  const total = ROAD_GROUPS[groupIndex].ids.reduce((sum, id) => {
    const road = currentState.roads.find((r) => r.id === id);
    return sum + (road?.vehicleCount ?? 0);
  }, 0);
  const maxPossible = ROAD_GROUPS[groupIndex].ids.length * MAX_VEHICLES;
  const density = total / maxPossible; // 0..1
  return Math.round(MIN_GREEN + density * (MAX_GREEN - MIN_GREEN));
}

// ─── State builders ────────────────────────────────────────────────────────────

function buildSignals(overrideEmergencyRoad: string | null = null): void {
  if (overrideEmergencyRoad) {
    currentState.roads = currentState.roads.map((r) => ({
      ...r,
      signal: r.id === overrideEmergencyRoad ? "green" : "red",
      isEmergency: r.id === overrideEmergencyRoad,
      densityPercent: densityOf(r.vehicleCount),
    }));
    currentState.activeLane = currentState.roads.find((r) => r.id === overrideEmergencyRoad)?.name ?? null;
    currentState.countdown = 0;
    return;
  }

  const greenGroup = ROAD_GROUPS[activeGroupIndex];
  currentState.roads = currentState.roads.map((r) => {
    let signal: SignalColor = "red";
    if (greenGroup.ids.includes(r.id)) {
      signal = isYellowPhase ? "yellow" : "green";
    }
    return {
      ...r,
      signal,
      isEmergency: false,
      densityPercent: densityOf(r.vehicleCount),
    };
  });

  currentState.activeLane = isYellowPhase ? null : greenGroup.label;
  currentState.countdown = isYellowPhase
    ? Math.max(0, YELLOW_DURATION - phaseTimer)
    : Math.max(0, currentState.greenDuration - phaseTimer);
}

function initState(): TrafficState {
  const roads: RoadSignal[] = ROADS.map((r) => {
    const count = randomVehicleCount();
    return {
      ...r,
      signal: "red",
      vehicleCount: count,
      isEmergency: false,
      densityPercent: densityOf(count),
    };
  });

  return {
    roads,
    emergencyMode: false,
    emergencyRoad: null,
    cycleTime: MIN_GREEN,
    greenDuration: MIN_GREEN,
    countdown: MIN_GREEN,
    activeLane: ROAD_GROUPS[0].label,
    timestamp: new Date().toISOString(),
  };
}

// ─── Vehicle count update (every 5 s) ─────────────────────────────────────────

function updateVehicleCounts(): void {
  currentState.roads = currentState.roads.map((r) => {
    const delta = Math.floor(Math.random() * 7) - 3; // –3 … +3
    const newCount = Math.max(0, Math.min(MAX_VEHICLES, r.vehicleCount + delta));
    return { ...r, vehicleCount: newCount, densityPercent: densityOf(newCount) };
  });
}

// ─── Main tick (every 1 s) ────────────────────────────────────────────────────

function tick(): void {
  vehicleUpdateTimer++;

  // Update vehicle counts every VEHICLE_UPDATE_INTERVAL seconds
  if (vehicleUpdateTimer >= VEHICLE_UPDATE_INTERVAL) {
    vehicleUpdateTimer = 0;
    updateVehicleCounts();

    // After updating counts, re-evaluate which group should be green ONLY when
    // we are about to switch anyway (i.e. wait for current phase to end naturally)
    // — unless emergency mode is on, in which case counts still update silently.
  }

  if (!currentState.emergencyMode) {
    phaseTimer++;

    if (!isYellowPhase) {
      // Normal green phase
      if (phaseTimer >= currentState.greenDuration) {
        // Time to go yellow
        isYellowPhase = true;
        phaseTimer = 0;
        logger.info({ activeGroup: ROAD_GROUPS[activeGroupIndex].label }, "Entering yellow phase");
      }
    } else {
      // Yellow phase
      if (phaseTimer >= YELLOW_DURATION) {
        // Switch to next group (intelligent selection)
        isYellowPhase = false;
        phaseTimer = 0;

        const nextGroupIndex = selectBusiestGroup();
        activeGroupIndex = nextGroupIndex;
        const newDuration = calcGreenDuration(activeGroupIndex);
        currentState.greenDuration = newDuration;
        currentState.cycleTime = newDuration;

        logger.info(
          { group: ROAD_GROUPS[activeGroupIndex].label, greenDuration: newDuration },
          "AI selected busiest road group"
        );
      }
    }
  }

  buildSignals(currentState.emergencyMode ? currentState.emergencyRoad : null);
  currentState.timestamp = new Date().toISOString();

  if (io) {
    io.emit("trafficUpdate", currentState);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function initTrafficEngine(socketIo: SocketIOServer): void {
  io = socketIo;
  currentState = initState();

  // Compute initial green duration based on starting vehicle counts
  activeGroupIndex = selectBusiestGroup();
  currentState.greenDuration = calcGreenDuration(activeGroupIndex);
  currentState.cycleTime = currentState.greenDuration;
  currentState.countdown = currentState.greenDuration;

  buildSignals(null);

  intervalId = setInterval(tick, 1000);
  logger.info(
    { initialGroup: ROAD_GROUPS[activeGroupIndex].label, greenDuration: currentState.greenDuration },
    "Intelligent traffic engine started"
  );
}

export function getTrafficState(): TrafficState {
  return currentState;
}

export function triggerEmergency(roadId: string): { success: boolean; message: string } {
  const road = currentState.roads.find((r) => r.id === roadId);
  if (!road) {
    return { success: false, message: `Road '${roadId}' not found` };
  }

  currentState.emergencyMode = true;
  currentState.emergencyRoad = roadId;
  buildSignals(roadId);
  currentState.timestamp = new Date().toISOString();

  if (io) {
    io.emit("trafficUpdate", currentState);
  }

  logger.info({ roadId }, "Emergency corridor activated");
  return { success: true, message: `Emergency corridor activated for ${road.name}` };
}

export function resetTraffic(): { success: boolean; message: string } {
  currentState.emergencyMode = false;
  currentState.emergencyRoad = null;

  // Re-evaluate which group should get green after reset
  activeGroupIndex = selectBusiestGroup();
  currentState.greenDuration = calcGreenDuration(activeGroupIndex);
  currentState.cycleTime = currentState.greenDuration;
  phaseTimer = 0;
  isYellowPhase = false;

  buildSignals(null);
  currentState.timestamp = new Date().toISOString();

  if (io) {
    io.emit("trafficUpdate", currentState);
  }

  logger.info(
    { group: ROAD_GROUPS[activeGroupIndex].label },
    "Traffic reset — AI re-assigned active group"
  );
  return { success: true, message: "Traffic system reset to intelligent control" };
}

export function stopTrafficEngine(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
