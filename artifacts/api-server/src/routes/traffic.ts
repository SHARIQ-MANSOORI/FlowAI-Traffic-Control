import { Router, type IRouter } from "express";
import { getTrafficState, triggerEmergency, resetTraffic } from "../lib/trafficEngine";

const router: IRouter = Router();

router.get("/traffic/state", (_req, res) => {
  const state = getTrafficState();
  res.json(state);
});

router.post("/traffic/emergency", (req, res) => {
  const { roadId } = req.body as { roadId?: string };

  if (!roadId || typeof roadId !== "string") {
    res.status(400).json({ success: false, message: "roadId is required", roadId: "" });
    return;
  }

  const result = triggerEmergency(roadId);
  res.json({ ...result, roadId });
});

router.post("/traffic/reset", (_req, res) => {
  const result = resetTraffic();
  res.json(result);
});

export default router;
