import { Server as SocketIOServer } from "socket.io";
import { logger } from "./logger";

type SignalColor = "red" | "yellow" | "green";

const MAX_VEHICLES = 30;
const VEHICLE_UPDATE_INTERVAL = 5;
const YELLOW_DURATION = 3;
const MIN_GREEN = 10;
const MAX_GREEN = 40;

// Ambulance corridor config
const AMBULANCE_ENTRY_ROAD  = "west";
const AMBULANCE_EXIT_ROAD   = "east";
const AMBULANCE_APPROACH_S  = 4;   // seconds west is green
const AMBULANCE_CROSSING_S  = 2;   // seconds in center
const AMBULANCE_EXIT_S      = 4;   // seconds east is green
const AMBULANCE_TOTAL_S     = AMBULANCE_APPROACH_S + AMBULANCE_CROSSING_S + AMBULANCE_EXIT_S;
const AMBULANCE_NORMAL_MIN  = 11.0;
const AMBULANCE_AI_MIN      = 2.8;

type AmbulancePhase = "idle" | "approach" | "crossing" | "exit" | "complete";

interface AmbulanceState {
  active: boolean;
  phase: AmbulancePhase;
  progress: number;
  elapsedSeconds: number;
  normalTimeMin: number;
  aiTimeMin: number;
  timeSavedMin: number;
  routeLabel: string;
}

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
  ambulance: AmbulanceState;
  timestamp: string;
}

const ROADS: Omit<RoadSignal, "signal" | "vehicleCount" | "isEmergency" | "densityPercent">[] = [
  { id: "north", name: "North Road", direction: "north" },
  { id: "south", name: "South Road", direction: "south" },
  { id: "east",  name: "East Road",  direction: "east"  },
  { id: "west",  name: "West Road",  direction: "west"  },
];

const ROAD_GROUPS = [
  { ids: ["north", "south"], label: "North / South" },
  { ids: ["east",  "west"],  label: "East / West"  },
];

let io: SocketIOServer | null = null;
let currentState: TrafficState;

// Normal cycle
let activeGroupIndex = 0;
let phaseTimer       = 0;
let isYellowPhase    = false;
let vehicleUpdateTimer = 0;

// Ambulance
let ambulanceTimer = 0;

let intervalId: ReturnType<typeof setInterval> | null = null;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function randomVehicleCount(): number {
  return Math.floor(Math.random() * (MAX_VEHICLES - 2)) + 2;
}

function densityOf(count: number): number {
  return Math.round((count / MAX_VEHICLES) * 100);
}

function selectBusiestGroup(): number {
  const totals = ROAD_GROUPS.map((g) =>
    g.ids.reduce((sum, id) => {
      const r = currentState.roads.find((r) => r.id === id);
      return sum + (r?.vehicleCount ?? 0);
    }, 0)
  );
  return totals[0] >= totals[1] ? 0 : 1;
}

function calcGreenDuration(groupIndex: number): number {
  const total = ROAD_GROUPS[groupIndex].ids.reduce((sum, id) => {
    const r = currentState.roads.find((r) => r.id === id);
    return sum + (r?.vehicleCount ?? 0);
  }, 0);
  const maxPossible = ROAD_GROUPS[groupIndex].ids.length * MAX_VEHICLES;
  const density = total / maxPossible;
  return Math.round(MIN_GREEN + density * (MAX_GREEN - MIN_GREEN));
}

function defaultAmbulance(): AmbulanceState {
  return {
    active: false,
    phase: "idle",
    progress: 0,
    elapsedSeconds: 0,
    normalTimeMin: AMBULANCE_NORMAL_MIN,
    aiTimeMin: AMBULANCE_AI_MIN,
    timeSavedMin: parseFloat((AMBULANCE_NORMAL_MIN - AMBULANCE_AI_MIN).toFixed(1)),
    routeLabel: "West → Center → East",
  };
}

// ─── Signal builders ───────────────────────────────────────────────────────────

function applyAmbulanceSignals(): void {
  const phase = currentState.ambulance.phase;
  currentState.roads = currentState.roads.map((r) => {
    let signal: SignalColor = "red";
    let isEmergency = false;

    if (phase === "approach" && r.id === AMBULANCE_ENTRY_ROAD) {
      signal = "green";
      isEmergency = true;
    } else if (phase === "crossing") {
      // Corridor is clear — keep both entry/exit green to show path
      if (r.id === AMBULANCE_ENTRY_ROAD || r.id === AMBULANCE_EXIT_ROAD) {
        signal = "green";
        isEmergency = true;
      }
    } else if ((phase === "exit" || phase === "complete") && r.id === AMBULANCE_EXIT_ROAD) {
      signal = "green";
      isEmergency = true;
    }

    return { ...r, signal, isEmergency, densityPercent: densityOf(r.vehicleCount) };
  });

  currentState.activeLane = null;
  currentState.countdown  = 0;
}

function buildNormalSignals(): void {
  if (currentState.emergencyMode && currentState.emergencyRoad) {
    currentState.roads = currentState.roads.map((r) => ({
      ...r,
      signal: r.id === currentState.emergencyRoad ? "green" : "red",
      isEmergency: r.id === currentState.emergencyRoad,
      densityPercent: densityOf(r.vehicleCount),
    }));
    currentState.activeLane = currentState.roads.find((r) => r.id === currentState.emergencyRoad)?.name ?? null;
    currentState.countdown  = 0;
    return;
  }

  const greenGroup = ROAD_GROUPS[activeGroupIndex];
  currentState.roads = currentState.roads.map((r) => {
    let signal: SignalColor = "red";
    if (greenGroup.ids.includes(r.id)) {
      signal = isYellowPhase ? "yellow" : "green";
    }
    return { ...r, signal, isEmergency: false, densityPercent: densityOf(r.vehicleCount) };
  });

  currentState.activeLane = isYellowPhase ? null : greenGroup.label;
  currentState.countdown  = isYellowPhase
    ? Math.max(0, YELLOW_DURATION - phaseTimer)
    : Math.max(0, currentState.greenDuration - phaseTimer);
}

// ─── Init ──────────────────────────────────────────────────────────────────────

function initState(): TrafficState {
  const roads: RoadSignal[] = ROADS.map((r) => {
    const count = randomVehicleCount();
    return { ...r, signal: "red", vehicleCount: count, isEmergency: false, densityPercent: densityOf(count) };
  });
  return {
    roads,
    emergencyMode: false,
    emergencyRoad: null,
    cycleTime: MIN_GREEN,
    greenDuration: MIN_GREEN,
    countdown: MIN_GREEN,
    activeLane: ROAD_GROUPS[0].label,
    ambulance: defaultAmbulance(),
    timestamp: new Date().toISOString(),
  };
}

function updateVehicleCounts(): void {
  currentState.roads = currentState.roads.map((r) => {
    const delta    = Math.floor(Math.random() * 7) - 3;
    const newCount = Math.max(0, Math.min(MAX_VEHICLES, r.vehicleCount + delta));
    return { ...r, vehicleCount: newCount, densityPercent: densityOf(newCount) };
  });
}

// ─── Ambulance phase tick ──────────────────────────────────────────────────────

function tickAmbulance(): void {
  ambulanceTimer++;
  const t   = ambulanceTimer;
  const amb = currentState.ambulance;

  // Compute phase + progress
  if (t <= AMBULANCE_APPROACH_S) {
    amb.phase    = "approach";
    amb.progress = Math.round((t / AMBULANCE_APPROACH_S) * 40);                     // 0→40
  } else if (t <= AMBULANCE_APPROACH_S + AMBULANCE_CROSSING_S) {
    const local  = t - AMBULANCE_APPROACH_S;
    amb.phase    = "crossing";
    amb.progress = 40 + Math.round((local / AMBULANCE_CROSSING_S) * 20);             // 40→60
  } else if (t <= AMBULANCE_TOTAL_S) {
    const local  = t - AMBULANCE_APPROACH_S - AMBULANCE_CROSSING_S;
    amb.phase    = "exit";
    amb.progress = 60 + Math.round((local / AMBULANCE_EXIT_S) * 40);                 // 60→100
  } else {
    // Done
    amb.phase    = "complete";
    amb.progress = 100;
    amb.active   = false;
    amb.elapsedSeconds = AMBULANCE_TOTAL_S;
    applyAmbulanceSignals();
    currentState.timestamp = new Date().toISOString();
    if (io) io.emit("trafficUpdate", currentState);

    // After brief "complete" display, restore normal control
    setTimeout(() => {
      currentState.ambulance = defaultAmbulance();
      activeGroupIndex = selectBusiestGroup();
      currentState.greenDuration = calcGreenDuration(activeGroupIndex);
      currentState.cycleTime = currentState.greenDuration;
      phaseTimer = 0;
      isYellowPhase = false;
      buildNormalSignals();
      currentState.timestamp = new Date().toISOString();
      if (io) io.emit("trafficUpdate", currentState);
      logger.info("Ambulance corridor complete — resuming AI control");
    }, 2000);

    return;
  }

  amb.elapsedSeconds = t;
  applyAmbulanceSignals();
}

// ─── Main tick ─────────────────────────────────────────────────────────────────

function tick(): void {
  vehicleUpdateTimer++;
  if (vehicleUpdateTimer >= VEHICLE_UPDATE_INTERVAL) {
    vehicleUpdateTimer = 0;
    updateVehicleCounts();
  }

  if (currentState.ambulance.active) {
    tickAmbulance();
  } else if (!currentState.emergencyMode) {
    phaseTimer++;

    if (!isYellowPhase) {
      if (phaseTimer >= currentState.greenDuration) {
        isYellowPhase = true;
        phaseTimer    = 0;
      }
    } else {
      if (phaseTimer >= YELLOW_DURATION) {
        isYellowPhase    = false;
        phaseTimer       = 0;
        activeGroupIndex = selectBusiestGroup();
        const dur = calcGreenDuration(activeGroupIndex);
        currentState.greenDuration = dur;
        currentState.cycleTime     = dur;
        logger.info({ group: ROAD_GROUPS[activeGroupIndex].label, greenDuration: dur }, "AI selected busiest group");
      }
    }

    buildNormalSignals();
  }

  currentState.timestamp = new Date().toISOString();
  if (io) io.emit("trafficUpdate", currentState);
}

// ─── Public API ────────────────────────────────────────────────────────────────

export function initTrafficEngine(socketIo: SocketIOServer): void {
  io = socketIo;
  currentState = initState();
  activeGroupIndex = selectBusiestGroup();
  currentState.greenDuration = calcGreenDuration(activeGroupIndex);
  currentState.cycleTime     = currentState.greenDuration;
  currentState.countdown     = currentState.greenDuration;
  buildNormalSignals();
  intervalId = setInterval(tick, 1000);
  logger.info({ initialGroup: ROAD_GROUPS[activeGroupIndex].label, greenDuration: currentState.greenDuration }, "Intelligent traffic engine started");
}

export function getTrafficState(): TrafficState {
  return currentState;
}

export function triggerEmergency(roadId: string): { success: boolean; message: string } {
  const road = currentState.roads.find((r) => r.id === roadId);
  if (!road) return { success: false, message: `Road '${roadId}' not found` };
  if (currentState.ambulance.active) return { success: false, message: "Ambulance corridor is active — cannot override" };

  currentState.emergencyMode = true;
  currentState.emergencyRoad = roadId;
  buildNormalSignals();
  currentState.timestamp = new Date().toISOString();
  if (io) io.emit("trafficUpdate", currentState);
  logger.info({ roadId }, "Emergency corridor activated");
  return { success: true, message: `Emergency corridor activated for ${road.name}` };
}

export function resetTraffic(): { success: boolean; message: string } {
  currentState.emergencyMode = false;
  currentState.emergencyRoad = null;
  currentState.ambulance     = defaultAmbulance();
  ambulanceTimer             = 0;
  activeGroupIndex           = selectBusiestGroup();
  currentState.greenDuration = calcGreenDuration(activeGroupIndex);
  currentState.cycleTime     = currentState.greenDuration;
  phaseTimer    = 0;
  isYellowPhase = false;
  buildNormalSignals();
  currentState.timestamp = new Date().toISOString();
  if (io) io.emit("trafficUpdate", currentState);
  logger.info({ group: ROAD_GROUPS[activeGroupIndex].label }, "Traffic reset — AI re-assigned active group");
  return { success: true, message: "Traffic system reset to intelligent control" };
}

export function startAmbulanceCorridor(): { success: boolean; message: string } {
  if (currentState.ambulance.active) {
    return { success: false, message: "Ambulance corridor already active" };
  }

  // Cancel any manual emergency
  currentState.emergencyMode = false;
  currentState.emergencyRoad = null;

  ambulanceTimer = 0;
  currentState.ambulance = {
    active: true,
    phase: "approach",
    progress: 0,
    elapsedSeconds: 0,
    normalTimeMin: AMBULANCE_NORMAL_MIN,
    aiTimeMin: AMBULANCE_AI_MIN,
    timeSavedMin: parseFloat((AMBULANCE_NORMAL_MIN - AMBULANCE_AI_MIN).toFixed(1)),
    routeLabel: "West → Center → East",
  };

  applyAmbulanceSignals();
  currentState.timestamp = new Date().toISOString();
  if (io) io.emit("trafficUpdate", currentState);

  logger.info("Ambulance corridor started — West → Center → East");
  return { success: true, message: "Ambulance corridor activated — clearing West → Center → East" };
}

export function stopAmbulanceCorridor(): { success: boolean; message: string } {
  currentState.ambulance = defaultAmbulance();
  ambulanceTimer = 0;
  activeGroupIndex = selectBusiestGroup();
  currentState.greenDuration = calcGreenDuration(activeGroupIndex);
  currentState.cycleTime = currentState.greenDuration;
  phaseTimer = 0;
  isYellowPhase = false;
  buildNormalSignals();
  currentState.timestamp = new Date().toISOString();
  if (io) io.emit("trafficUpdate", currentState);
  logger.info("Ambulance corridor cancelled");
  return { success: true, message: "Ambulance corridor cancelled" };
}

export function stopTrafficEngine(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
