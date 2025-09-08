import { Request, Response } from "express";
import { Role } from "./roles.model";
import {
  createRole,
  deactivateRole,
  getAllRoles,
  getRoleById,
  updateRole,
} from "./roles.service";
import logger from "../../utils/logger";

export const addRole = async (req: Request, res: Response) => {
  try {
    const { roleName, code, description, status, permissions } = req.body;

    if (!req.user || !req.user.uid) {
      logger.warn(`Unauthorized attempt to create role`);
      return res.status(401).json({ message: "Unauthorized" });
    }
    const newRole: Role = {
      roleName: roleName.trim(),
      code: code.trim(),
      description: description.trim(),
      status: status === "inactive" ? "inactive" : "active",
      permissions,
      createdBy: req.user.uid,
      createdAt: new Date().toISOString(),
    };

    const id = await createRole(newRole);
    logger.info(`Role created | ID: ${id} | By: ${req.user.uid}`);
    return res.status(201).json({ message: "Role created", id });
  } catch (err: any) {
    logger.error(`Failed to create role | Error: ${err.message}`);
    return res
      .status(500)
      .json({ message: "Failed to create role", error: err.message });
  }
};

// export const fetchRoles = async (_req: Request, res: Response) => {
//   try {
//     const data = await getAllRoles();
//     logger.info(`Fetched all roles | Count: ${data.length}`);
//     return res.status(200).json(data);
//   } catch (err: any) {
//     logger.error(`Failed to fetch roles | Error: ${err.message}`);
//     return res
//       .status(500)
//       .json({ message: "Failed to fetch roles", error: err.message });
//   }
// };

export const fetchRoles = async (req: Request, res: Response) => {
  try {
    const { id } = req.query as { id?: string }; // get id from query param
    let data: Role[];

    if (id) {
      const role = await getRoleById(id);
      if (!role) {
        return res
          .status(404)
          .json({ message: `Role with id ${id} not found` });
      }
      data = [role];
    } else {
      data = await getAllRoles();
    }

    logger.info(`Fetched roles | Count: ${data.length}`);
    return res.status(200).json(data);
  } catch (err: any) {
    logger.error(`Failed to fetch roles | Error: ${err.message}`);
    return res
      .status(500)
      .json({ message: "Failed to fetch roles", error: err.message });
  }
};

export const updateRoleHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { roleName, code, description, status, permissions } = req.body;

    const updates: Partial<Role> = {
      ...(roleName && { roleName: roleName.trim() }),
      ...(code && { code: code.trim() }),
      ...(description && { description: description.trim() }),
      ...(status && { status }),
      ...(permissions && { permissions }),
    };

    const ok = await updateRole(id, updates);
    if (!ok) {
      logger.warn(`Role not found | ID: ${id}`);
      return res.status(404).json({ message: "Role not found" });
    }
    logger.info(`Role updated successfully | ID: ${id}`);
    return res.status(200).json({ message: "Role updated successfully" });
  } catch (err: any) {
    logger.error(`Failed to update role | Error: ${err.message}`);
    return res
      .status(500)
      .json({ message: "Failed to update role", error: err.message });
  }
};

export const deleteRoleHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await deactivateRole(id);
    if (!result.ok) {
      logger.warn(`Role not found for toggle | ID: ${id}`);
      return res.status(404).json({ message: "Role not found" });
    }
    logger.info(
      `Role status toggled (${result.oldStatus} -> ${result.newStatus}) | ID: ${id}`
    );
    return res.status(200).json({
      message: `Role status toggled to ${result.newStatus}`,
    });
  } catch (err: any) {
    logger.info(`Roles not found`);

    return res
      .status(500)
      .json({ message: "Failed to deactivate role", error: err.message });
  }
};
