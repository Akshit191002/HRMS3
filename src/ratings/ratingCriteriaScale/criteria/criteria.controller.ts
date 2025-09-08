import { Request, Response } from "express";
import {
  addCriteria,
  fetchAllCriteria,
  modifyCriteria,
  removeCriteria,
} from "./criteria.service";
import logger from "../../../utils/logger";

export const createCriteria = async (req: Request, res: Response) => {
  try {
    const id = await addCriteria(req.body);
    logger.info(`Rating criteria created successfully | ID: ${id}`);
    res
      .status(201)
      .json({ id, message: "Criteria created successfully" });
  } catch (error: any) {
    logger.error(`Failed to create rating criteria | Error: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
};

export const getAllCriteria = async (req: Request, res: Response) => {
  try {
    const criteria = await fetchAllCriteria();
    logger.info(
      `Rating criteria fetched successfully | Count: ${criteria.length}`
    );
    res.status(200).json(criteria);
  } catch (error: any) {
    logger.error(`Failed to fetch rating criteria | Error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
};

export const updateCriteria = async (req: Request, res: Response) => {
  try {
    const updated = await modifyCriteria(req.params.id, req.body);
    if (!updated) {
      logger.warn(
        `Rating criteria not found for update | ID: ${req.params.id}`
      );
      return res.status(404).json({ message: "Criteria not found" });
    }
    logger.info(`Rating criteria updated successfully | ID: ${req.params.id}`);
    res.status(200).json({ message: "Criteria updated successfully" });
    logger.info("Rating criteria updated successfully");
  } catch (error: any) {
    logger.error(
      `Failed to update rating criteria | ID: ${req.params.id} | Error: ${error.message}`
    );
    res.status(500).json({ error: error.message });
  }
};

export const deleteCriteria = async (req: Request, res: Response) => {
  try {
    const deleted = await removeCriteria(req.params.id);
    if (!deleted) {
      logger.warn(
        `Rating criteria not found for deletion | ID: ${req.params.id}`
      );
      return res.status(404).json({ message: "Criteria not found" });
    }
    logger.info(`Rating criteria deleted successfully | ID: ${req.params.id}`);
    res.status(200).json({ message: "Criteria deleted successfully" });
  } catch (error: any) {
    logger.error(
      `Failed to delete rating criteria | ID: ${req.params.id} | Error: ${error.message}`
    );
    res.status(500).json({ error: error.message });
  }
};
