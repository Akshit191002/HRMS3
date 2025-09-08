import { Router } from "express";
import {
  createEvent,
  getEvents,
  getPendingDashboard,
} from "./eventNotification.controller";
import { authenticateFirebaseUser } from "../../auth/middlewares/authenticateFirebaseUser";
import { validateBody } from "../../auth/middlewares/validateBody";

const router = Router();

router.get("/notification/get", authenticateFirebaseUser, getPendingDashboard);

router.post(
  "/events/create",
  authenticateFirebaseUser,
  validateBody(["description"]),
  createEvent
);

router.get("/events/get", authenticateFirebaseUser, getEvents);

export default router;
