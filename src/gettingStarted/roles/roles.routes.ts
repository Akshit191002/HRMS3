import { Router } from "express";

import { authenticateFirebaseUser } from "../../auth/middlewares/authenticateFirebaseUser";
import {
  addRole,
  deleteRoleHandler,
  fetchRoles,
  updateRoleHandler,
} from "./roles.controller";
import { validateBody } from "../../auth/middlewares/validateBody";
import { authorizeRole1 } from "../../auth/middlewares/authorizeRole";
import { UserRole } from "../../auth/constants/roles";

const router = Router();

router.post(
  "/create",
  authenticateFirebaseUser,
  authorizeRole1([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  validateBody(["roleName", "code", "description", "permissions"]),
  addRole
);

router.get("/get", authenticateFirebaseUser, fetchRoles);

router.put(
  "/update/:id",
  authenticateFirebaseUser,
  authorizeRole1([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  validateBody(["roleName", "code", "description", "permissions"]),
  updateRoleHandler
);

router.delete("/delete/:id", authenticateFirebaseUser, deleteRoleHandler);

export default router;
