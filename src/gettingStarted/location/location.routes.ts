import { Router } from "express";
import {
  addLocation,
  deleteLocationHandler,
  fetchLocations,
  updateLocationHandler,
} from "./location.controller";
import { authenticateFirebaseUser } from "../../auth/middlewares/authenticateFirebaseUser";
import { validateBody } from "../../auth/middlewares/validateBody";

const router = Router();

router.post(
  "/create/",
  validateBody(["cityName", "code", "state", "status"]),
  authenticateFirebaseUser,
  addLocation
);

router.get("/get/", authenticateFirebaseUser, fetchLocations);

router.put(
  "/update/:id",
  authenticateFirebaseUser,
  validateBody(["cityName", "code", "state"]),
  updateLocationHandler
);

router.delete("/delete/:id", authenticateFirebaseUser, deleteLocationHandler);

export default router;
