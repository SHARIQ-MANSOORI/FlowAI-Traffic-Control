import { Router, type IRouter } from "express";
import {
  getTrafficState,
  triggerEmergency,
  resetTraffic,
  startAmbulanceCorridor,
  stopAmbulanceCorridor,
} from "../lib/trafficEngine";

const router: IRouter = Router();

router.get("/traffic/state", (_req, res) => {
  res.json(getTrafficState());
});

router.post("/traffic/emergency", (req, res) => {
  const { roadId } = req.body as { roadId?: string };
  if (!roadId || typeof roadId !== "string") {
    res.status(400).json({ success: false, message: "roadId is required", roadId: "" });
    return;
  }
  res.json({ ...triggerEmergency(roadId), roadId });
});

router.post("/traffic/reset", (_req, res) => {
  res.json(resetTraffic());
});

router.post("/traffic/ambulance/start", (_req, res) => {
  res.json(startAmbulanceCorridor());
});

router.post("/traffic/ambulance/stop", (_req, res) => {
  res.json(stopAmbulanceCorridor());
});

export default router;
