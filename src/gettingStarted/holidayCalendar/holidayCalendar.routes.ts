import { Router } from "express";
import {
  addHoliday,
  fetchHolidays,
  updateHolidayHandler,
  deleteHolidayHandler,
} from "./holidayCalendar.controller";
import { authenticateFirebaseUser } from "../../auth/middlewares/authenticateFirebaseUser";
import { validateBody } from "../../auth/middlewares/validateBody";

const router = Router();

router.post(
  "/create/",
  authenticateFirebaseUser,
  validateBody(["name", "type", "date", "holidayGroups"]),
  addHoliday
);

router.get("/get/", authenticateFirebaseUser, fetchHolidays);

router.put("/update/:id", authenticateFirebaseUser, updateHolidayHandler);

router.delete("/delete/:id", authenticateFirebaseUser, deleteHolidayHandler);

export default router;
