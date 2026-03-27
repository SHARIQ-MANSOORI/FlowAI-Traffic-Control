import { Server as SocketIOServer } from "socket.io";
import { logger } from "./logger";

type SignalColor = "red" | "yellow" | "green";

interface RoadSignal {
  id: string;
  name: string;
  direction: "north" | "south" | "east" | "west";
  signal: SignalColor;
  vehicleCount: number;
  isEmergency: boolean;
}

interface TrafficState {
  roads: RoadSignal[];
  emergencyMode: boolean;
  emergencyRoad: string | null;
  cycleTime: number;
  timestamp: string;
}

const ROADS: Omit<RoadSignal, "signal" | "vehicleCount" | "isEmergency">[] = [
  { id: "north", name: "North Road", direction: "north" },
  { id: "south", name: "South Road", direction: "south" },
  { id: "east", name: "East Road", direction: "east" },
  { id: "west", name: "West Road", direction: "west" },
];

const CYCLE_SEQUENCE: string[][] = [
  ["north", "south"],
  ["east", "west"],
];

let io: SocketIOServer | null = null;
let currentState: TrafficState;
let cycleIndex = 0;
let phaseTimer = 0;
let isYellowPhase = false;
let intervalId: ReturnType<typeof setInterval> | null = null;

function randomVehicleCount(): number {
  return Math.floor(Math.random() * 28) + 2;
}

function initState(): TrafficState {
  return {
    roads: ROADS.map((r) => ({
      ...r,
      signal: "red",
      vehicleCount: randomVehicleCount(),
      isEmergency: false,
    })),
    emergencyMode: false,
    emergencyRoad: null,
    cycleTime: 10,
    timestamp: new Date().toISOString(),
  };
}

function computeSignals(): void {
  if (currentState.emergencyMode && currentState.emergencyRoad) {
    currentState.roads = currentState.roads.map((r) => ({
      ...r,
      signal: r.id === currentState.emergencyRoad ? "green" : "red",
      isEmergency: r.id === currentState.emergencyRoad,
    }));
    return;
  }

  const greenGroup = CYCLE_SEQUENCE[cycleIndex];
  currentState.roads = currentState.roads.map((r) => {
    let signal: SignalColor = "red";
    if (greenGroup.includes(r.id)) {
      signal = isYellowPhase ? "yellow" : "green";
    }
    return { ...r, signal, isEmergency: false };
  });
}

function updateVehicleCounts(): void {
  currentState.roads = currentState.roads.map((r) => {
    const delta = Math.floor(Math.random() * 5) - 2;
    const newCount = Math.max(0, Math.min(30, r.vehicleCount + delta));
    return { ...r, vehicleCount: newCount };
  });
}

function tick(): void {
  if (!currentState.emergencyMode) {
    phaseTimer++;

    if (!isYellowPhase && phaseTimer >= currentState.cycleTime) {
      isYellowPhase = true;
      phaseTimer = 0;
    } else if (isYellowPhase && phaseTimer >= 3) {
      isYellowPhase = false;
      phaseTimer = 0;
      cycleIndex = (cycleIndex + 1) % CYCLE_SEQUENCE.length;
    }
  }

  updateVehicleCounts();
  computeSignals();
  currentState.timestamp = new Date().toISOString();

  if (io) {
    io.emit("trafficUpdate", currentState);
  }
}

export function initTrafficEngine(socketIo: SocketIOServer): void {
  io = socketIo;
  currentState = initState();
  computeSignals();

  intervalId = setInterval(tick, 1000);
  logger.info("Traffic engine started");
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
  computeSignals();
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
  cycleIndex = 0;
  phaseTimer = 0;
  isYellowPhase = false;
  computeSignals();
  currentState.timestamp = new Date().toISOString();

  if (io) {
    io.emit("trafficUpdate", currentState);
  }

  logger.info("Traffic reset to normal operation");
  return { success: true, message: "Traffic system reset to normal operation" };
}

export function stopTrafficEngine(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
