import { Request, Response } from "express";
import { addRecord, fetchAllRecords } from "./records.service";
import logger from "../../utils/logger";

export const createRecord = async (req: Request, res: Response) => {
  try {
    const id = await addRecord(req.body);
    logger.info(`Record created successfully | ID: ${id}`);
    res.status(201).json({ id, message: "Record created successfully" });
  } catch (error: any) {
    logger.error(`Failed to create record | Error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
};

export const getAllRecords = async (req: Request, res: Response) => {
  try {
    const { year } = req.query;

    const records = await fetchAllRecords(year ? Number(year) : undefined);
    logger.info(
      `Fetched records successfully | Year: ${year || "all"} | Count: ${
        records.length
      }`
    );
    res.status(200).json(records);
  } catch (error: any) {
    logger.error(`Failed to fetch records | Error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
};
