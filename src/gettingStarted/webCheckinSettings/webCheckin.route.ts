import { Router } from "express";
import { authenticateFirebaseUser } from "../../auth/middlewares/authenticateFirebaseUser";
import {
  fetchWebCheckinSettings,
  updateWebCheckinSettings,
} from "./webCheckin.controller";
import { validateBody } from "../../auth/middlewares/validateBody";

const router = Router();

router.get("/get", authenticateFirebaseUser, fetchWebCheckinSettings);

router.put(
  "/update",
  authenticateFirebaseUser,
  validateBody(["shiftStartTime", "shiftEndTime"]),
  updateWebCheckinSettings
);

export default router;
