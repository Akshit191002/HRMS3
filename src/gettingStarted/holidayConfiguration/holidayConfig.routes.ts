import { Router } from "express";
import { authenticateFirebaseUser } from "../../auth/middlewares/authenticateFirebaseUser";
import {
  addHolidayGroup,
  deleteHolidayGroupHandler,
  fetchHolidayGroups,
  updateHolidayGroupHandler,
} from "./holidayConfig.controller";
import { validateBody } from "../../auth/middlewares/validateBody";

const router = Router();

router.post(
  "/create/",
  authenticateFirebaseUser,
  validateBody(["name", "code", "description"]),
  addHolidayGroup
);

router.get("/get/", authenticateFirebaseUser, fetchHolidayGroups);

router.put(
  "/update/:id",
  authenticateFirebaseUser,
  validateBody(["name", "code", "description"]),
  updateHolidayGroupHandler
);

router.delete(
  "/delete/:id",
  authenticateFirebaseUser,
  deleteHolidayGroupHandler
);

export default router;
