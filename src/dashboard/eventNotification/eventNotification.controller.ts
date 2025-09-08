import { Request, Response } from "express";
import {
  addEvent,
  fetchEvents,
  fetchPendingDashboardRecords,
} from "./eventNotification.service";
import logger from "../../utils/logger";

export const getPendingDashboard = async (req: Request, res: Response) => {
  try {
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit as string) || 10)
    );
    const page = Math.max(1, parseInt(req.query.page as string) || 1);

    const data = await fetchPendingDashboardRecords(limit, page);
    logger.info("Fetched pending dashboard records", {
      page,
      limit,
      total: data.total,
    });
    res.status(200).json(data);
  } catch (error: any) {
    logger.error("Error in getPendingDashboard", {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "Internal server error" });
  }
};

export const createEvent = async (req: Request, res: Response) => {
  try {
    const id = await addEvent(req.body);
    logger.info("create dashboard current events");
    res.status(201).json({ message: "Event created", id });
  } catch (error) {
    logger.error("Error to create dashboard current events");
    res.status(500).json({ message: "Error creating event", error });
  }
};

export const getEvents = async (_req: Request, res: Response) => {
  try {
    const limit = Math.min(
      100,
      Math.max(1, parseInt(_req.query.limit as string) || 10)
    );
    const page = Math.max(1, parseInt(_req.query.page as string) || 1);
    const events = await fetchEvents(limit, page);
    logger.info("Fetched dashboard current events");
    res.status(200).json(events);
  } catch (error) {
    logger.error("Error to fetch dashboard current events");
    res.status(500).json({ error: "Internal server error" });
  }
};
