import { Router } from "express";
import {
  addBulkRatingsController,
  getEmployeeRatingsController,
  updateEmployeeProjectScoresController,
} from "./rating.controller";
import { authenticateFirebaseUser } from "../../auth/middlewares/authenticateFirebaseUser";
import { validateBody } from "../../auth/middlewares/validateBody";

const router = Router();

router.post(
  "/create",
  authenticateFirebaseUser,
  validateBody([
    "empName",
    "code",
    "department",
    "designation",
    "yearOfExperience",
    "year",
    "ratings",
  ]),
  addBulkRatingsController
);

router.get("/get", authenticateFirebaseUser, getEmployeeRatingsController);

router.put(
  "/update",
  authenticateFirebaseUser,
  validateBody(["employeeId", "year", "month", "projectName", "scores"]),
  updateEmployeeProjectScoresController
);

export default router;
