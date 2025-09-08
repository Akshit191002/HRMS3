import { Router } from "express";
import { authenticateFirebaseUser } from "../../auth/middlewares/authenticateFirebaseUser";
import {
  getPayrollConfiguration,
  updatePayrollConfiguration,
} from "./payrollConfiguration.controller";
import { validateBody } from "../../auth/middlewares/validateBody";
import { authorizeRole } from "../../auth/middlewares/authorizeRole";
import { UserRole } from "../../auth/constants/roles";

const router = Router();

router.get("/get", authenticateFirebaseUser, getPayrollConfiguration);

router.put(
  "/update",
  authenticateFirebaseUser,
  authorizeRole(UserRole.SUPER_ADMIN),
  validateBody([
    "amountRoundingOff",
    "taxCalculationMode",
    "payrollDaysMode",
    "esicWagesMode",
    "investmentWindowMonthly",
    "poiWindowFY",
  ]),
  updatePayrollConfiguration
);

export default router;
