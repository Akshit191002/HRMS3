import { Request, Response } from "express";
import {
  getWebCheckinSettings,
  putWebCheckinSettings,
} from "./webCheckin.service";
import logger from "../../utils/logger";

export const fetchWebCheckinSettings = async (req: Request, res: Response) => {
  try {
    const settings = await getWebCheckinSettings();
    if (!settings) {
      logger.warn("Web check-in settings not found");
      return res
        .status(404)
        .json({ message: "Web check-in settings not found" });
    }
    logger.info("Fetched web check-in settings successfully");
    res.status(200).json(settings);
  } catch (error) {
    logger.error(`Failed to fetch web check-in settings | Error: ${error}`);
    res.status(500).json({ message: "Error fetching settings", error });
  }
};

export const updateWebCheckinSettings = async (req: Request, res: Response) => {
  try {
    const { shiftStartTime, shiftEndTime } = req.body;

    if (!shiftStartTime || !shiftEndTime) {
      logger.warn("Missing shiftStartTime or shiftEndTime in request body");
      return res
        .status(400)
        .json({ message: "shiftStartTime and shiftEndTime are required" });
    }

    const id = await putWebCheckinSettings({ shiftStartTime, shiftEndTime });
    logger.info(`Web check-in settings updated successfully | ID: ${id}`);
    res.json({ message: "Web check-in settings saved successfully", id });
  } catch (error) {
    logger.error(`Failed to update web check-in settings | Error: ${error}`);
    res.status(500).json({ message: "Error updating settings", error });
  }
};
