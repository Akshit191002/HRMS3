import { Request, Response } from "express";
import {
  createLeave,
  deleteLeave,
  getAllLeave,
  updateLeave,
} from "./leave.service";
import logger from "../../utils/logger";

export const addLeave = async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const result = await createLeave(data);
    logger.info(`Leave configuration created successfully | ID: ${result.id}`);
    res.status(201).json({ message: "Leave configuration created", result });
  } catch (error) {
    logger.error(`Failed to create leave configuration | Error: ${error}`);
    res.status(500).json({ error: "Failed to create leave configuration" });
  }
};

export const fetchLeave = async (req: Request, res: Response) => {
  try {
    const configs = await getAllLeave();
    logger.info(`Fetched all leave configurations | Count: ${configs.length}`);
    res.status(200).json(configs);
  } catch (error) {
    logger.error(
      `Failed to update leave configuration | ID: ${req.params.id} | Error: ${error}`
    );
    res.status(500).json({ error: "Failed to fetch leave configurations" });
  }
};

export const modifyLeave = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const result = await updateLeave(id, data);
    logger.info(`Leave configuration updated successfully | ID: ${id}`);
    res.status(200).json({ message: "Leave configuration updated", result });
  } catch (error) {
    logger.error(
      `Failed to update leave configuration | ID: ${req.params.id} | Error: ${error}`
    );
    res.status(500).json({ error: "Failed to update leave configuration" });
  }
};

export const removeLeave = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await deleteLeave(id);
    logger.info(`Leave configuration deleted successfully | ID: ${id}`);
    res.status(200).json({ message: "Leave configuration deleted", result });
  } catch (error) {
    logger.error(
      `Failed to delete leave configuration | ID: ${req.params.id} | Error: ${error}`
    );
    res.status(500).json({ error: "Failed to delete leave configuration" });
  }
};
