import { Router } from "express";
import {
  addSequence,
  fetchSequences,
  updateSequence,
} from "./sequence.controller";
import { authenticateFirebaseUser } from "../../auth/middlewares/authenticateFirebaseUser";
import { validateBody } from "../../auth/middlewares/validateBody";

const router = Router();

router.post(
  "/create",
  authenticateFirebaseUser,
  validateBody(["type", "prefix", "nextAvailableNumber"]),
  addSequence
);

router.get("/get", authenticateFirebaseUser, fetchSequences);

router.put("/update", authenticateFirebaseUser, updateSequence);

export default router;
