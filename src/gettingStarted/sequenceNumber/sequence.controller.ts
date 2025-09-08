import { Request, Response } from "express";
import {
  createSequence,
  getAllSequences,
  increaseSequence,
} from "./sequence.service";
import { SequenceNumber } from "./sequence.model";
import logger from "../../utils/logger";

export const addSequence = async (req: Request, res: Response) => {
  try {
    const { type, prefix, nextAvailableNumber } = req.body;

    if (!req.user || !req.user.uid) {
      logger.warn(`Unauthorized attempt to create sequence`);
      return res.status(401).json({ message: "Unauthorized" });
    }

    const newSequence: SequenceNumber = {
      type: type.trim(),
      prefix: prefix.trim(),
      nextAvailableNumber: Number(nextAvailableNumber),
      createdBy: req.user.uid,
      createdAt: new Date().toISOString(),
    };

    const id = await createSequence(newSequence);
    logger.info(`Sequence created | ID: ${id} | By: ${req.user.uid}`);
    return res.status(201).json({ message: "Sequence created", id });
  } catch (error: any) {
    logger.error(`Failed to create sequence | Error: ${error.message}`);
    return res.status(500).json({
      message: "Failed to create sequence",
      error: error.message,
    });
  }
};

export const fetchSequences = async (_req: Request, res: Response) => {
  try {
    const data = await getAllSequences();
    logger.info(`Fetched all sequences | Count: ${data.length}`);
    return res.status(200).json(data);
  } catch (error: any) {
    logger.error(`Failed to fetch sequences | Error: ${error.message}`);
    return res.status(500).json({
      message: "Failed to fetch sequences",
      error: error.message,
    });
  }
};

export const updateSequence = async (req: Request, res: Response) => {
  try {
    const { type } = req.query;

    if (!type || typeof type !== "string") {
      logger.warn(`Missing query param 'type' for sequence update`);
      return res
        .status(400)
        .json({ message: "Query param 'type' is required" });
    }

    const updatedSequence = await increaseSequence(type);

    if (!updatedSequence) {
      logger.warn(`Sequence not found for type '${type}'`);
      return res
        .status(404)
        .json({ message: `Sequence with type '${type}' not found` });
    }
    logger.info(
      `Sequence updated successfully | Type: ${type} | New Number: ${updatedSequence.nextAvailableNumber}`
    );
    res.status(200).json({
      message: `Sequence for type '${type}' updated successfully`,
      updatedSequence,
    });
  } catch (error) {
    logger.error(`Failed to update sequence | Error: ${error}`);
    res.status(500).json({ message: "Error updating sequence" });
  }
};
