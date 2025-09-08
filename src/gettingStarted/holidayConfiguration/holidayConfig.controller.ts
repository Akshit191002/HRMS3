import { Request, Response } from "express";
import { HolidayGroup } from "./holidayConfig.model";
import {
  createHolidayGroup,
  deleteHolidayGroup,
  getAllHolidayGroups,
  updateHolidayGroup,
} from "./holidayConfig.service";
import logger from "../../utils/logger";

export const addHolidayGroup = async (req: Request, res: Response) => {
  try {
    const { name, code, description } = req.body;

    if (!req.user || !req.user.uid) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const newGroup: HolidayGroup = {
      groupName: name.trim(),
      code: code.trim(),
      description: description.trim(),
      createdBy: req.user.uid,
      createdAt: new Date().toISOString(),
    };

    const id = await createHolidayGroup(newGroup);
    logger.info(`HolidayConfig created by UID: ${req.user.uid}, ID: ${id}`);
    return res.status(201).json({ message: "Holiday group created", id });
  } catch (error: any) {
    return res.status(500).json({
      message: "Failed to create holiday group",
      error: error.message,
    });
  }
};

export const fetchHolidayGroups = async (_req: Request, res: Response) => {
  try {
    const data = await getAllHolidayGroups();
    logger.info("Fetched all holidaysConfig");
    return res.status(200).json(data);
  } catch (error: any) {
    logger.error(`Failed to fetch holidaysConfig: ${error.message}`);
    return res.status(500).json({
      message: "Failed to fetch holiday groups",
      error: error.message,
    });
  }
};

export const updateHolidayGroupHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;
    const { name, code, description } = req.body;

    const updates: Partial<HolidayGroup> = {
      ...(name && { name: name.trim() }),
      ...(code && { code: code.trim() }),
      ...(description && { description: description.trim() }),
    };

    const success = await updateHolidayGroup(id, updates);

    if (!success) {
      logger.warn(`HolidayConfig not found for update. ID: ${id}`);
      return res.status(404).json({ message: "Holiday group not found" });
    }

    logger.info(`HolidayConfig updated successfully. ID: ${id}`);
    return res
      .status(200)
      .json({ message: "Holiday group updated successfully" });
  } catch (error: any) {
    logger.error(`Failed to update holidayConfig: ${error.message}`);
    return res.status(500).json({
      message: "Failed to update holiday group",
      error: error.message,
    });
  }
};

export const deleteHolidayGroupHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;
    const success = await deleteHolidayGroup(id);

    if (!success) {
      logger.warn(`HolidayConfig not found for deletion. ID: ${id}`);
      return res.status(404).json({ message: "Holiday group not found" });
    }

    logger.info(`HolidayConfig deleted successfully. ID: ${id}`);
    return res
      .status(200)
      .json({ message: "Holiday group deleted successfully" });
  } catch (error: any) {
    logger.error(`Failed to delete holidayConfig: ${error.message}`);
    return res.status(500).json({
      message: "Failed to delete holiday group",
      error: error.message,
    });
  }
};
