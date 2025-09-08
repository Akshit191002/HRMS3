import { Router } from "express";
import { authenticateFirebaseUser } from "../../auth/middlewares/authenticateFirebaseUser";
import { getDashboardCounts } from "./totalCount.controller";

const router = Router();

router.get("/get", authenticateFirebaseUser, getDashboardCounts);

export default router;
