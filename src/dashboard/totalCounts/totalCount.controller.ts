import { Request, Response } from "express";
import logger from "../../utils/logger";
import { getPayslipSummary, getTotalEmployees } from "./totalCount.service";

export const getDashboardCounts = async (_req: Request, res: Response) => {
  try {
    const totalActiveEmployees = await getTotalEmployees();
    const summary = await getPayslipSummary();

    logger.info("Fetched dashboard counts", { totalActiveEmployees, summary });
    res.status(200).json({
      totalActiveEmployees,
      totalPayslipCounts: summary.totalPayslips,
      totalGrossPaid: summary.totalGrossPaid,
      totalNetPaid: summary.totalNetPaid,
    });
  } catch (error) {
    logger.error("Failed to fetch dashboard counts", { error });
    res.status(500).json({ error: "Failed to fetch dashboard counts" });
  }
};
